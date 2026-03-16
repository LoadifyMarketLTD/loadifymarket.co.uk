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
}

export interface RateLimitResult {
  /** True when the caller has exceeded the allowed attempt count. */
  exceeded: boolean;
  /** Current attempt count (after incrementing). */
  attempts: number;
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
  const { supabase, tableName, identifier, windowMinutes, maxAttempts } = opts;

  try {
    const windowEnd = new Date(
      Math.ceil(Date.now() / (windowMinutes * 60 * 1000)) *
        (windowMinutes * 60 * 1000),
    ).toISOString();

    const { data: rl, error: selectError } = await supabase
      .from(tableName)
      .select('id, attempts')
      .eq('identifier', identifier)
      .eq('windowEnd', windowEnd)
      .maybeSingle<{ id: string; attempts: number }>();

    if (selectError) {
      // Table may not exist yet — fail open.
      return { exceeded: false, attempts: 0 };
    }

    if (rl && rl.attempts >= maxAttempts) {
      return { exceeded: true, attempts: rl.attempts };
    }

    if (rl) {
      await supabase
        .from(tableName)
        .update({ attempts: rl.attempts + 1 })
        .eq('id', rl.id);
      return { exceeded: false, attempts: rl.attempts + 1 };
    }

    await supabase
      .from(tableName)
      .insert({ identifier, windowEnd, attempts: 1 });
    return { exceeded: false, attempts: 1 };
  } catch {
    // Fail open — a DB outage must not block legitimate traffic.
    return { exceeded: false, attempts: 0 };
  }
}
