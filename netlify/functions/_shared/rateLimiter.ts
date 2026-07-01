import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared in-process rate limiter for Netlify serverless functions.
 *
 * Uses a Supabase table as the backing store so limits are shared across
 * concurrent function invocations and survive cold starts.
 *
 * Each call family (register, email, connect-onboard, etc.) should use a
 * distinct `tableName` so their quotas are tracked independently.
 *
 * Table schema (create once via SQL migration):
 *
 *   CREATE TABLE <tableName> (
 *     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     identifier TEXT NOT NULL,
 *     "windowEnd" TIMESTAMPTZ NOT NULL,
 *     attempts   INT NOT NULL DEFAULT 1,
 *     UNIQUE (identifier, "windowEnd")
 *   );
 */

export interface RateLimitOptions {
  /** Supabase service-role client. */
  supabase: SupabaseClient;
  /** Name of the rate-limit tracking table, e.g. "register_rate_limits". */
  tableName: string;
  /** Caller identity: userId or IP address. */
  identifier: string;
  /** Time window duration in minutes. */
  windowMinutes: number;
  /** Maximum number of attempts allowed within the window. */
  maxAttempts: number;
  /** Error handling policy when DB-backed rate limiting is unavailable. */
  policy?: 'fail-open' | 'fail-closed' | 'fail-soft';
}

export interface RateLimitResult {
  /** True when the caller has exceeded the allowed attempt count. */
  exceeded: boolean;
  /** Current attempt count (after incrementing). */
  attempts: number;
}

interface InMemoryRateLimitState {
  attempts: number;
  windowEndMs: number;
}

const inMemoryFallback = new Map<string, InMemoryRateLimitState>();

function fallbackKey(tableName: string, identifier: string, windowEnd: string): string {
  return `${tableName}::${identifier}::${windowEnd}`;
}

function runInMemoryFallback(
  tableName: string,
  identifier: string,
  windowEnd: string,
  maxAttempts: number,
): RateLimitResult {
  const key = fallbackKey(tableName, identifier, windowEnd);
  const windowEndMs = Date.parse(windowEnd);
  const now = Date.now();
  const prev = inMemoryFallback.get(key);
  if (prev && prev.windowEndMs <= now) {
    inMemoryFallback.delete(key);
  }

  const current = inMemoryFallback.get(key);
  const attempts = (current?.attempts ?? 0) + 1;
  inMemoryFallback.set(key, { attempts, windowEndMs });
  return { exceeded: attempts > maxAttempts, attempts };
}

function handlePolicyFailure(
  policy: 'fail-open' | 'fail-closed' | 'fail-soft',
  tableName: string,
  identifier: string,
  windowEnd: string,
  maxAttempts: number,
  stage: 'select' | 'update' | 'insert' | 'exception',
  error: unknown,
): RateLimitResult {
  console.error('rate-limiter-backend-unavailable', {
    tableName,
    stage,
    policy,
    identifierPrefix: identifier.slice(0, 16),
    error: error instanceof Error ? error.message : String(error),
  });

  if (policy === 'fail-closed') {
    return { exceeded: true, attempts: maxAttempts };
  }
  if (policy === 'fail-soft') {
    return runInMemoryFallback(tableName, identifier, windowEnd, maxAttempts);
  }
  return { exceeded: false, attempts: 0 };
}

/**
 * Check and increment the rate-limit counter for `identifier`.
 *
 * Returns `{ exceeded: true }` when the caller should be rejected.
 * Returns `{ exceeded: false }` and increments the counter otherwise.
 *
 * Any database error is silently swallowed — rate limiting must never
 * block a legitimate request due to an infra hiccup.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const {
    supabase,
    tableName,
    identifier,
    windowMinutes,
    maxAttempts,
    policy = 'fail-open',
  } = opts;
  const windowEnd = new Date(
    Math.ceil(Date.now() / (windowMinutes * 60 * 1000)) *
      (windowMinutes * 60 * 1000),
  ).toISOString();

  try {
    const { data: rl, error: selectError } = await supabase
      .from(tableName)
      .select('id, attempts')
      .eq('identifier', identifier)
      .eq('windowEnd', windowEnd)
      .maybeSingle<{ id: string; attempts: number }>();

    if (selectError) {
      return handlePolicyFailure(
        policy,
        tableName,
        identifier,
        windowEnd,
        maxAttempts,
        'select',
        selectError,
      );
    }

    if (rl && rl.attempts >= maxAttempts) {
      return { exceeded: true, attempts: rl.attempts };
    }

    if (rl) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ attempts: rl.attempts + 1 })
        .eq('id', rl.id);
      if (updateError) {
        return handlePolicyFailure(
          policy,
          tableName,
          identifier,
          windowEnd,
          maxAttempts,
          'update',
          updateError,
        );
      }
      return { exceeded: false, attempts: rl.attempts + 1 };
    }

    const { error: insertError } = await supabase
      .from(tableName)
      .insert({ identifier, windowEnd, attempts: 1 });
    if (insertError) {
      return handlePolicyFailure(
        policy,
        tableName,
        identifier,
        windowEnd,
        maxAttempts,
        'insert',
        insertError,
      );
    }
    return { exceeded: false, attempts: 1 };
  } catch (error) {
    return handlePolicyFailure(
      policy,
      tableName,
      identifier,
      windowEnd,
      maxAttempts,
      'exception',
      error,
    );
  }
}
