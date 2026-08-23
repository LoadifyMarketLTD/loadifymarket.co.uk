import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared DB-backed rate limiter for Netlify serverless functions.
 *
 * Counters are consumed through the service-role-only
 * `increment_rate_limit_counter` RPC. The RPC performs one atomic
 * INSERT ... ON CONFLICT DO UPDATE statement, so concurrent first requests
 * cannot race on the (identifier, windowEnd) unique key and concurrent
 * increments cannot lose updates.
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
  /** Current attempt count after consuming this request. */
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
  const attempts = Math.min((current?.attempts ?? 0) + 1, maxAttempts + 1);
  inMemoryFallback.set(key, { attempts, windowEndMs });
  return { exceeded: attempts > maxAttempts, attempts };
}

function handlePolicyFailure(
  policy: 'fail-open' | 'fail-closed' | 'fail-soft',
  tableName: string,
  identifier: string,
  windowEnd: string,
  maxAttempts: number,
  stage: 'rpc' | 'exception',
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
 * Atomically consume one rate-limit attempt for `identifier`.
 *
 * The first `maxAttempts` calls in a window are allowed. The next call returns
 * `exceeded: true`. The database counter is capped at maxAttempts + 1 because
 * only the exceeded/not-exceeded boundary is significant and unbounded writes
 * from blocked callers provide no additional value.
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

  const windowMs = windowMinutes * 60 * 1000;
  const windowEnd = new Date(
    Math.ceil(Date.now() / windowMs) * windowMs,
  ).toISOString();

  try {
    const { data, error } = await supabase.rpc('increment_rate_limit_counter', {
      p_table_name: tableName,
      p_identifier: identifier,
      p_window_end: windowEnd,
      p_max_attempts: maxAttempts,
    });

    if (error) {
      return handlePolicyFailure(
        policy,
        tableName,
        identifier,
        windowEnd,
        maxAttempts,
        'rpc',
        error,
      );
    }

    const attempts = Number(data);
    if (!Number.isInteger(attempts) || attempts < 1) {
      return handlePolicyFailure(
        policy,
        tableName,
        identifier,
        windowEnd,
        maxAttempts,
        'rpc',
        new Error('increment_rate_limit_counter returned an invalid attempt count'),
      );
    }

    return { exceeded: attempts > maxAttempts, attempts };
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
