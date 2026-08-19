import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';

function makeEvent(
  body: unknown,
  method = 'POST',
  authorization = 'Bearer test-admin-token',
): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: authorization ? { authorization } : {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/admin-user-status',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/admin-user-status',
  };
}

interface SetupOptions {
  caller?: { id: string; role: string; isActive: boolean } | null;
  target?: { id: string; role: string; isActive: boolean } | null;
  banError?: { message: string } | null;
  unbanError?: { message: string } | null;
  userUpdateError?: { message: string } | null;
  sellerUpdateError?: { message: string } | null;
  pushUpdateError?: { message: string } | null;
  auditError?: { message: string } | null;
}

function installSupabaseMock(options: SetupOptions = {}) {
  const caller = options.caller === undefined
    ? { id: ADMIN_ID, role: 'admin', isActive: true }
    : options.caller;
  const target = options.target === undefined
    ? { id: TARGET_ID, role: 'seller', isActive: true }
    : options.target;

  const updateUserById = vi.fn(async (_userId: string, attributes: { ban_duration?: string }) => {
    if (attributes.ban_duration === 'none' && options.unbanError) {
      return { data: null, error: options.unbanError };
    }
    if (attributes.ban_duration !== 'none' && options.banError) {
      return { data: null, error: options.banError };
    }
    return { data: { user: { id: _userId } }, error: null };
  });

  let lookupIndex = 0;
  const usersSelectQuery = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => {
      const value = lookupIndex === 0 ? caller : target;
      lookupIndex += 1;
      return { data: value, error: null };
    }),
  };
  const usersSelect = vi.fn(() => usersSelectQuery);

  const userUpdateEq = vi.fn().mockResolvedValue({ error: options.userUpdateError ?? null });
  const usersUpdate = vi.fn(() => ({ eq: userUpdateEq }));

  const sellerUpdateEq = vi.fn().mockResolvedValue({ error: options.sellerUpdateError ?? null });
  const sellerUpdate = vi.fn(() => ({ eq: sellerUpdateEq }));

  const pushSecondEq = vi.fn().mockResolvedValue({ error: options.pushUpdateError ?? null });
  const pushFirstEq = vi.fn(() => ({ eq: pushSecondEq }));
  const pushUpdate = vi.fn(() => ({ eq: pushFirstEq }));

  const auditInsert = vi.fn().mockResolvedValue({ error: options.auditError ?? null });

  const from = vi.fn((table: string) => {
    if (table === 'users') {
      return { select: usersSelect, update: usersUpdate };
    }
    if (table === 'seller_profiles') {
      return { update: sellerUpdate };
    }
    if (table === 'push_tokens') {
      return { update: pushUpdate };
    }
    if (table === 'admin_actions') {
      return { insert: auditInsert };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ADMIN_ID, app_metadata: { role: 'admin' } } },
          error: null,
        }),
        admin: { updateUserById },
      },
      from,
    })),
  }));

  return {
    updateUserById,
    usersUpdate,
    sellerUpdate,
    pushUpdate,
    auditInsert,
  };
}

describe('admin-user-status', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.resetModules();
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('rejects an inactive admin even when the JWT still claims admin', async () => {
    const mocks = installSupabaseMock({
      caller: { id: ADMIN_ID, role: 'admin', isActive: false },
    });
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'suspend', userId: TARGET_ID }), {} as never);

    expect(res.statusCode).toBe(403);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it('prevents an admin from suspending their own account', async () => {
    const mocks = installSupabaseMock();
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'suspend', userId: ADMIN_ID }), {} as never);

    expect(res.statusCode).toBe(400);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it('suspends Auth before DB state, suspends seller, disables push, and audits', async () => {
    const mocks = installSupabaseMock();
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'suspend', userId: TARGET_ID }), {} as never);

    expect(res.statusCode).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: '876000h' });
    expect(mocks.usersUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mocks.sellerUpdate).toHaveBeenCalledWith({ sellerStatus: 'suspended' });
    expect(mocks.pushUpdate).toHaveBeenCalledWith({ isActive: false });
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      adminId: ADMIN_ID,
      actionType: 'user_suspend',
      targetType: 'user',
      targetId: TARGET_ID,
    }));
    expect(mocks.updateUserById.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.usersUpdate.mock.invocationCallOrder[0]);
  });

  it('fails closed when the Auth ban cannot be established', async () => {
    const mocks = installSupabaseMock({ banError: { message: 'auth unavailable' } });
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'suspend', userId: TARGET_ID }), {} as never);

    expect(res.statusCode).toBe(502);
    expect(mocks.usersUpdate).not.toHaveBeenCalled();
    expect(mocks.sellerUpdate).not.toHaveBeenCalled();
    expect(mocks.pushUpdate).not.toHaveBeenCalled();
  });

  it('reactivates Auth and DB without resurrecting historical push tokens', async () => {
    const mocks = installSupabaseMock({
      target: { id: TARGET_ID, role: 'seller', isActive: false },
    });
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'reactivate', userId: TARGET_ID }), {} as never);

    expect(res.statusCode).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: 'none' });
    expect(mocks.sellerUpdate).toHaveBeenCalledWith({ sellerStatus: 'submitted' });
    expect(mocks.usersUpdate).toHaveBeenCalledWith({ isActive: true });
    expect(mocks.pushUpdate).not.toHaveBeenCalled();
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'user_reactivate',
      targetId: TARGET_ID,
    }));
  });

  it('re-bans immediately when seller reactivation cannot synchronize', async () => {
    const mocks = installSupabaseMock({
      target: { id: TARGET_ID, role: 'seller', isActive: false },
      sellerUpdateError: { message: 'seller write failed' },
    });
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'reactivate', userId: TARGET_ID }), {} as never);

    expect(res.statusCode).toBe(500);
    expect(mocks.updateUserById).toHaveBeenNthCalledWith(1, TARGET_ID, { ban_duration: 'none' });
    expect(mocks.updateUserById).toHaveBeenNthCalledWith(2, TARGET_ID, { ban_duration: '876000h' });
    expect(mocks.usersUpdate).not.toHaveBeenCalled();
  });

  it('refuses to manage admin targets through the standard user-status endpoint', async () => {
    const mocks = installSupabaseMock({
      target: { id: TARGET_ID, role: 'admin', isActive: true },
    });
    const { handler } = await import('../admin-user-status');

    const res = await handler(makeEvent({ op: 'suspend', userId: TARGET_ID }), {} as never);

    expect(res.statusCode).toBe(403);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });
});
