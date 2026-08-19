import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const USER_ID = '22222222-2222-4222-8222-222222222222';

function makeEvent(method = 'POST'): HandlerEvent {
  return {
    httpMethod: method,
    body: null,
    headers: { authorization: 'Bearer test-user-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/deactivate-account',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/deactivate-account',
  };
}

interface SetupOptions {
  role?: 'buyer' | 'seller' | 'admin';
  banError?: { message: string } | null;
  userUpdateError?: { message: string } | null;
  sellerUpdateError?: { message: string } | null;
  productsUpdateError?: { message: string } | null;
  pushUpdateError?: { message: string } | null;
}

function installMocks(options: SetupOptions = {}) {
  const role = options.role ?? 'buyer';

  const updateUserById = vi.fn().mockResolvedValue({
    data: options.banError ? null : { user: { id: USER_ID } },
    error: options.banError ?? null,
  });

  const userEq = vi.fn().mockResolvedValue({ error: options.userUpdateError ?? null });
  const usersUpdate = vi.fn(() => ({ eq: userEq }));

  const sellerEq = vi.fn().mockResolvedValue({ error: options.sellerUpdateError ?? null });
  const sellerUpdate = vi.fn(() => ({ eq: sellerEq }));

  const productsSecondEq = vi.fn().mockResolvedValue({ error: options.productsUpdateError ?? null });
  const productsFirstEq = vi.fn(() => ({ eq: productsSecondEq }));
  const productsUpdate = vi.fn(() => ({ eq: productsFirstEq }));

  const pushSecondEq = vi.fn().mockResolvedValue({ error: options.pushUpdateError ?? null });
  const pushFirstEq = vi.fn(() => ({ eq: pushSecondEq }));
  const pushUpdate = vi.fn(() => ({ eq: pushFirstEq }));

  const from = vi.fn((table: string) => {
    if (table === 'users') return { update: usersUpdate };
    if (table === 'seller_profiles') return { update: sellerUpdate };
    if (table === 'products') return { update: productsUpdate };
    if (table === 'push_tokens') return { update: pushUpdate };
    throw new Error(`Unexpected table in test: ${table}`);
  });

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      auth: { admin: { updateUserById } },
      from,
    })),
  }));

  vi.doMock('../_shared/activeAccountAuth', () => ({
    authenticateActiveAccount: vi.fn().mockResolvedValue({
      ok: true,
      actor: { id: USER_ID, role, isActive: true },
    }),
  }));

  vi.doMock('../_shared/rateLimiter', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
  }));

  return { updateUserById, usersUpdate, sellerUpdate, productsUpdate, pushUpdate };
}

describe('deactivate-account', () => {
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

  it('deactivates a buyer with Auth revocation before the database write', async () => {
    const mocks = installMocks({ role: 'buyer' });
    const { handler } = await import('../deactivate-account');

    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith(USER_ID, { ban_duration: '876000h' });
    expect(mocks.usersUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mocks.sellerUpdate).not.toHaveBeenCalled();
    expect(mocks.productsUpdate).not.toHaveBeenCalled();
    expect(mocks.pushUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mocks.updateUserById.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.usersUpdate.mock.invocationCallOrder[0]);
  });

  it('suspends and pauses a seller and hides active listings before completing deactivation', async () => {
    const mocks = installMocks({ role: 'seller' });
    const { handler } = await import('../deactivate-account');

    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(200);
    expect(mocks.sellerUpdate).toHaveBeenCalledWith({ sellerStatus: 'suspended', isPaused: true });
    expect(mocks.productsUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mocks.pushUpdate).toHaveBeenCalledWith({ isActive: false });
  });

  it('fails closed before database mutation when the Auth ban cannot be established', async () => {
    const mocks = installMocks({ role: 'buyer', banError: { message: 'auth unavailable' } });
    const { handler } = await import('../deactivate-account');

    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(502);
    expect(mocks.usersUpdate).not.toHaveBeenCalled();
    expect(mocks.sellerUpdate).not.toHaveBeenCalled();
    expect(mocks.productsUpdate).not.toHaveBeenCalled();
    expect(mocks.pushUpdate).not.toHaveBeenCalled();
  });

  it('reports committed deactivation if seller listing cleanup needs support intervention', async () => {
    const mocks = installMocks({ role: 'seller', productsUpdateError: { message: 'products unavailable' } });
    const { handler } = await import('../deactivate-account');

    const res = await handler(makeEvent(), {} as never);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(500);
    expect(body.deactivated).toBe(true);
    expect(mocks.usersUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mocks.sellerUpdate).toHaveBeenCalledWith({ sellerStatus: 'suspended', isPaused: true });
    expect(mocks.pushUpdate).not.toHaveBeenCalled();
  });

  it('reports partial secure deactivation when notification cleanup fails', async () => {
    const mocks = installMocks({ role: 'buyer', pushUpdateError: { message: 'push unavailable' } });
    const { handler } = await import('../deactivate-account');

    const res = await handler(makeEvent(), {} as never);
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(500);
    expect(body.deactivated).toBe(true);
    expect(mocks.usersUpdate).toHaveBeenCalledWith({ isActive: false });
  });

  it('refuses self-service deactivation for admin accounts', async () => {
    const mocks = installMocks({ role: 'admin' });
    const { handler } = await import('../deactivate-account');

    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(403);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.usersUpdate).not.toHaveBeenCalled();
  });
});
