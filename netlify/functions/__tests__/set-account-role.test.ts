import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(
  body: unknown,
  method = 'POST',
  authorization = 'Bearer ' + 'test-token',
): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: authorization ? { authorization } : {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/set-account-role',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/set-account-role',
  };
}

describe('set-account-role', () => {
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

  it('returns 500 when env vars are missing', async () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);
    expect(res.statusCode).toBe(500);
  });

  it('returns 401 without authorization header', async () => {
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }, 'POST', ''), {} as never);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }),
        },
      })),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when role is not buyer/seller', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', app_metadata: {} } },
            error: null,
          }),
        },
      })),
    }));
    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'admin' }), {} as never);
    expect(res.statusCode).toBe(400);
  });

  it('updates authenticated user, initializes seller records, and syncs trusted auth role', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const usersUpdate = vi.fn().mockReturnValue({ eq: updateEq });
    const sellerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    const sellerStoresUpsert = vi.fn().mockResolvedValue({ error: null });
    const buyerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'auth-user-id',
                app_metadata: { provider: 'email', providers: ['email'] },
              },
            },
            error: null,
          }),
          admin: { updateUserById },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') return { update: usersUpdate };
          if (table === 'seller_profiles') return { upsert: sellerProfilesUpsert };
          if (table === 'seller_stores') return { upsert: sellerStoresUpsert };
          if (table === 'buyer_profiles') return { upsert: buyerProfilesUpsert };
          return { upsert: vi.fn() };
        }),
      })),
    }));

    const { handler } = await import('../set-account-role');
    const res = await handler(
      makeEvent({ role: 'seller', userId: 'attacker-supplied-id' }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(usersUpdate).toHaveBeenCalledWith({
      role: 'seller',
      onboardingCompleted: false,
      onboardingStep: 1,
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'auth-user-id');
    expect(sellerProfilesUpsert).toHaveBeenCalledWith(
      { userId: 'auth-user-id', sellerStatus: 'draft', isApproved: false },
      { onConflict: 'userId' },
    );
    expect(sellerStoresUpsert).toHaveBeenCalledWith(
      { userId: 'auth-user-id', isActive: false },
      { onConflict: 'userId' },
    );
    expect(buyerProfilesUpsert).not.toHaveBeenCalled();
    expect(updateUserById).toHaveBeenCalledWith('auth-user-id', {
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'seller',
      },
    });
  });

  it('ensures buyer profile exists and syncs buyer role to app_metadata', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const usersUpdate = vi.fn().mockReturnValue({ eq: updateEq });
    const sellerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    const sellerStoresUpsert = vi.fn().mockResolvedValue({ error: null });
    const buyerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({ data: {}, error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-user-id', app_metadata: { provider: 'email' } } },
            error: null,
          }),
          admin: { updateUserById },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') return { update: usersUpdate };
          if (table === 'seller_profiles') return { upsert: sellerProfilesUpsert };
          if (table === 'seller_stores') return { upsert: sellerStoresUpsert };
          if (table === 'buyer_profiles') return { upsert: buyerProfilesUpsert };
          return { upsert: vi.fn() };
        }),
      })),
    }));

    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);

    expect(res.statusCode).toBe(200);
    expect(usersUpdate).toHaveBeenCalledWith({
      role: 'buyer',
      onboardingCompleted: true,
      onboardingStep: 0,
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'buyer-user-id');
    expect(buyerProfilesUpsert).toHaveBeenCalledWith(
      { userId: 'buyer-user-id' },
      { onConflict: 'userId' },
    );
    expect(sellerProfilesUpsert).not.toHaveBeenCalled();
    expect(sellerStoresUpsert).not.toHaveBeenCalled();
    expect(updateUserById).toHaveBeenCalledWith('buyer-user-id', {
      app_metadata: { provider: 'email', role: 'buyer' },
    });
  });

  it('returns 500 if trusted auth metadata cannot be synchronized', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const buyerProfilesUpsert = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'metadata update failed' },
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-user-id', app_metadata: {} } },
            error: null,
          }),
          admin: { updateUserById },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') return { update: vi.fn().mockReturnValue({ eq: updateEq }) };
          if (table === 'buyer_profiles') return { upsert: buyerProfilesUpsert };
          return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        }),
      })),
    }));

    const { handler } = await import('../set-account-role');
    const res = await handler(makeEvent({ role: 'buyer' }), {} as never);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toContain('session authorization');
  });
});