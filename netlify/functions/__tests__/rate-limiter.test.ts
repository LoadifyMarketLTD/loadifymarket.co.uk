import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '../_shared/rateLimiter';

describe('atomic shared rate limiter', () => {
  it('keeps the RPC atomic and restricted to service_role in its migration', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260824081413_atomic_rate_limit_consume.sql'),
      'utf8',
    );

    expect(sql).toMatch(/ON CONFLICT \(identifier, "windowEnd"\) DO UPDATE/i);
    expect(sql).toMatch(/SECURITY INVOKER/i);
    expect(sql).toMatch(/REVOKE ALL[\s\S]+FROM PUBLIC/i);
    expect(sql).toMatch(/GRANT EXECUTE[\s\S]+TO service_role/i);
    expect(sql).toContain("'push_token_rate_limits'");
  });

  it('consumes the fixed window through one database RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { attempts: 4, exceeded: false },
      error: null,
    });

    const result = await checkRateLimit({
      supabase: { rpc } as never,
      tableName: 'push_token_rate_limits',
      identifier: 'user-123',
      windowMinutes: 60,
      maxAttempts: 10,
    });

    expect(result).toEqual({ attempts: 4, exceeded: false });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      'consume_rate_limit',
      expect.objectContaining({
        p_table_name: 'push_token_rate_limits',
        p_identifier: 'user-123',
        p_max_attempts: 10,
      }),
    );
  });

  it('returns the atomic database decision when the limit is exceeded', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { attempts: 11, exceeded: true },
      error: null,
    });

    const result = await checkRateLimit({
      supabase: { rpc } as never,
      tableName: 'push_token_rate_limits',
      identifier: 'user-123',
      windowMinutes: 60,
      maxAttempts: 10,
    });

    expect(result).toEqual({ attempts: 11, exceeded: true });
  });

  it('preserves the configured failure policy on RPC failure', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'database unavailable' },
    });

    const result = await checkRateLimit({
      supabase: { rpc } as never,
      tableName: 'push_token_rate_limits',
      identifier: 'user-123',
      windowMinutes: 60,
      maxAttempts: 10,
      policy: 'fail-closed',
    });

    expect(result).toEqual({ attempts: 10, exceeded: true });
  });
});
