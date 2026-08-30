import { describe, expect, it, vi } from 'vitest';
import { AvasamTokenManager } from '../_shared/avasamTokenManager';

describe('AvasamTokenManager', () => {
  it('reuses a valid server-memory token until expires_at', async () => {
    const requestToken = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        access_token: 'token-1',
        expires_at: '2026-08-29T16:00:00.000Z',
      },
    });
    const manager = new AvasamTokenManager({ requestToken });
    const now = Date.parse('2026-08-29T15:00:00.000Z');

    expect(await manager.getValidToken(now)).toEqual({
      ok: true,
      data: { access_token: 'token-1', expires_at: '2026-08-29T16:00:00.000Z' },
    });
    expect(await manager.getValidToken(now + 30_000)).toEqual({
      ok: true,
      data: { access_token: 'token-1', expires_at: '2026-08-29T16:00:00.000Z' },
    });
    expect(requestToken).toHaveBeenCalledTimes(1);
  });

  it('requests a replacement token after expiry', async () => {
    const requestToken = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        data: { access_token: 'token-1', expires_at: '2026-08-29T15:01:00.000Z' },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { access_token: 'token-2', expires_at: '2026-08-29T16:00:00.000Z' },
      });
    const manager = new AvasamTokenManager({ requestToken });

    await manager.getValidToken(Date.parse('2026-08-29T15:00:00.000Z'));
    const refreshed = await manager.getValidToken(Date.parse('2026-08-29T15:01:00.000Z'));
    expect(refreshed).toEqual({
      ok: true,
      data: { access_token: 'token-2', expires_at: '2026-08-29T16:00:00.000Z' },
    });
    expect(requestToken).toHaveBeenCalledTimes(2);
  });

  it('does not cache already-expired tokens returned by the provider', async () => {
    const requestToken = vi.fn().mockResolvedValue({
      ok: true,
      data: { access_token: 'stale-token', expires_at: '2026-08-29T14:59:59.000Z' },
    });
    const manager = new AvasamTokenManager({ requestToken });
    const result = await manager.getValidToken(Date.parse('2026-08-29T15:00:00.000Z'));

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
    expect(manager.peek(Date.parse('2026-08-29T15:00:00.000Z'))).toBeNull();
  });

  it('allows explicit invalidation without exposing the token elsewhere', async () => {
    const requestToken = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        data: { access_token: 'token-1', expires_at: '2026-08-29T16:00:00.000Z' },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { access_token: 'token-2', expires_at: '2026-08-29T16:00:00.000Z' },
      });
    const manager = new AvasamTokenManager({ requestToken });
    const now = Date.parse('2026-08-29T15:00:00.000Z');

    await manager.getValidToken(now);
    manager.invalidate();
    const result = await manager.getValidToken(now);
    expect(result).toEqual({
      ok: true,
      data: { access_token: 'token-2', expires_at: '2026-08-29T16:00:00.000Z' },
    });
  });
});
