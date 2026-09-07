import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserBlockRelationship } from '../_shared/userBlocks';

function client(result: { data?: unknown[] | null; error?: { code?: string; message?: string } | null }) {
  const limit = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  const chain = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit,
  };
  const from = vi.fn().mockReturnValue(chain);
  return { api: { from } as unknown as SupabaseClient, from, limit };
}

describe('getUserBlockRelationship', () => {
  it('detects a block in either direction', async () => {
    const first = client({ data: [{ blockerId: 'user-a', blockedId: 'user-b' }] });
    await expect(getUserBlockRelationship(first.api, 'user-a', 'user-b')).resolves.toEqual({
      available: true,
      blocked: true,
      blockedByFirst: true,
      blockedBySecond: false,
    });

    const second = client({ data: [{ blockerId: 'user-b', blockedId: 'user-a' }] });
    await expect(getUserBlockRelationship(second.api, 'user-a', 'user-b')).resolves.toEqual({
      available: true,
      blocked: true,
      blockedByFirst: false,
      blockedBySecond: true,
    });
  });

  it('reports the feature unavailable when the migration table is missing', async () => {
    const c = client({ error: { code: 'PGRST205', message: "Could not find the table 'public.user_blocks'" } });
    await expect(getUserBlockRelationship(c.api, 'user-a', 'user-b')).resolves.toEqual({
      available: false,
      blocked: false,
      blockedByFirst: false,
      blockedBySecond: false,
    });
  });

  it('fails closed on unexpected relationship lookup errors', async () => {
    const c = client({ error: { code: '42501', message: 'permission denied' } });
    await expect(getUserBlockRelationship(c.api, 'user-a', 'user-b')).rejects.toMatchObject({ code: '42501' });
  });
});
