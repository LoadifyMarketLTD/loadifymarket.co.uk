import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared rate limiter for Netlify serverless functions.
 *
 * Uses a Supabase table as the backing store so limits are shared across
 * concurrent function invocations and survive cold starts.
 *
 * Each call family (register, email, connect-onboard, etc.) should use a
 * distinct `tableName` so their quotas are tracked independently.
 *
 * Counters are consumed through the `consume_rate_limit` RPC. The database
 * performs the insert/increment in one `INSERT ... ON CONFLICT DO UPDATE`
 * statement, so concurrent cold starts cannot race on SELECT-then-INSERT.
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
  stage: 'rpc' | 'response' | 'exception',
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
    const { data, error: rpcError } = await supabase.rpc('consume_rate_limit', {
      p_table_name: tableName,
      p_identifier: identifier,
      p_window_end: windowEnd,
      p_max_attempts: maxAttempts,
    });

    if (rpcError) {
      return handlePolicyFailure(
        policy,
        tableName,
        identifier,
        windowEnd,
        maxAttempts,
        'rpc',
        rpcError,
      );
    }

    const result = data as { attempts?: unknown; exceeded?: unknown } | null;
    if (
      !result ||
      !Number.isInteger(result.attempts) ||
      typeof result.exceeded !== 'boolean'
    ) {
      return handlePolicyFailure(
        policy,
        tableName,
        identifier,
        windowEnd,
        maxAttempts,
        'response',
        'consume_rate_limit returned an invalid response',
      );
    }

    return {
      exceeded: result.exceeded,
      attempts: result.attempts as number,
    };
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
