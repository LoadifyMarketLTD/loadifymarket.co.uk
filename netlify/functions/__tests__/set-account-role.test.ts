import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, method = 'POST'): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer test-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/set-account-role',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/set-account-role',
  };
}

describe('set-account-role legacy compatibility', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns 204 for OPTIONS requests', async () => {
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({}, 'OPTIONS'), {} as never);
    expect(res.statusCode).toBe(204);
  });

  it('returns 405 for non-POST requests', async () => {
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({}, 'GET'), {} as never);
    expect(res.statusCode).toBe(405);
  });

  it('rejects admin self-service role changes', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'admin-1', role: 'admin', email: null, appMetadata: {} },
      }),
    }));
    const { handler } = await import('../set-account-role');
    expect((await handler(makeEvent({ role: 'buyer' }), {} as never)).statusCode).toBe(403);
  });

  it('rejects an invalid role', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'buyer-1', role: 'buyer', email: null, appMetadata: {} },
      }),
    }));
    const { handler } = await import('../set-account-role');
    expect((await handler(makeEvent({ role: 'admin' }), {} as never)).statusCode).toBe(400);
  });

  it('does not let a Seller relationship be erased by switching role to Buyer', async () => {
    const rpc = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ rpc })) }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'seller-1', role: 'seller', email: null, appMetadata: {} },
      }),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toContain('Buyer access');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('blocks legacy Seller activation when Seller registration is disabled', async () => {
    const rpc = vi.fn();
    const updateUserById = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc, auth: { admin: { updateUserById } } })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'buyer-1', role: 'buyer', email: 'buyer@example.com', appMetadata: {} },
      }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      getFeatureFlags: vi.fn().mockResolvedValue({ sellerRegistration: false }),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'seller' }), {} as never);
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('temporarily disabled');
    expect(rpc).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('uses the atomic Seller activation RPC and never resets Seller lifecycle directly', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, sellerStatus: 'active', createdSellerProfile: false },
      error: null,
    });
    const updateUserById = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc, auth: { admin: { updateUserById } } })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'seller-1', role: 'seller', email: 'seller@example.com', appMetadata: { provider: 'email' } },
      }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      getFeatureFlags: vi.fn().mockResolvedValue({ sellerRegistration: true }),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'seller' }), {} as never);
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith('server_start_seller_activation_v1', { p_user_id: 'seller-1' });
    expect(updateUserById).not.toHaveBeenCalled();
    expect(JSON.parse(res.body)).toMatchObject({ role: 'seller', sellerStatus: 'active', compatibilityEndpoint: true });
  });

  it('keeps Buyer -> Buyer idempotent and ensures the Buyer profile exists', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const usersUpdate = vi.fn().mockReturnValue({ eq: updateEq });
    const buyerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'users') return { update: usersUpdate };
          if (table === 'buyer_profiles') return { upsert: buyerProfilesUpsert };
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'buyer-1', role: 'buyer', email: 'buyer@example.com', appMetadata: { provider: 'email' } },
      }),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);
    expect(res.statusCode).toBe(200);
    expect(usersUpdate).toHaveBeenCalledWith({ role: 'buyer', onboardingCompleted: true, onboardingStep: 0 });
    expect(updateEq).toHaveBeenCalledWith('id', 'buyer-1');
    expect(buyerProfilesUpsert).toHaveBeenCalledWith({ userId: 'buyer-1' }, { onConflict: 'userId' });
  });

  it('does not require a second Auth metadata write for Buyer -> Buyer', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const buyerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: { admin: { updateUserById } },
        from: vi.fn((table: string) => {
          if (table === 'users') return { update: vi.fn().mockReturnValue({ eq: updateEq }) };
          if (table === 'buyer_profiles') return { upsert: buyerProfilesUpsert };
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'buyer-1', role: 'buyer', email: null, appMetadata: {} },
      }),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);
    expect(res.statusCode).toBe(200);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
