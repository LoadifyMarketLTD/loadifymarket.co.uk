import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, authorization = 'Bearer valid-token'): HandlerEvent {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: { authorization },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/delete-product',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/delete-product',
  };
}

type DeleteStatus = 'deleted' | 'not_found' | 'forbidden' | 'retained_history';

describe('delete-product', () => {
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

  function mockSupabase(args?: {
    role?: 'seller' | 'admin' | 'buyer';
    callerId?: string;
    sellerId?: string;
    maintenance?: boolean;
    rpcStatus?: DeleteStatus | string | null;
    rpcError?: string;
  }) {
    const rpcCalls: Array<{ name: string; params: Record<string, unknown> }> = [];
    const callerId = args?.callerId ?? 'seller-1';
    const sellerId = args?.sellerId ?? 'seller-1';

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: callerId } }, error: null }),
      },
      rpc: vi.fn().mockImplementation(async (name: string, params: Record<string, unknown>) => {
        rpcCalls.push({ name, params });
        return {
          data: args?.rpcStatus ?? 'deleted',
          error: args?.rpcError ? { message: args.rpcError } : null,
        };
      }),
      storage: {
        from: vi.fn(() => ({ remove: vi.fn() })),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: args?.role ?? 'seller', isActive: true }, error: null }),
          };
        }

        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { sellerId }, error: null }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }));
    vi.doMock('../_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(args?.maintenance ?? false),
    }));

    return { rpcCalls, storageRemove: supabase.storage.from().remove };
  }

  async function importWithMock(args: Parameters<typeof mockSupabase>[0]) {
    const state = mockSupabase(args);
    const mod = await import('../delete-product');
    return { ...state, ...mod };
  }

  it('requires authentication and seller/admin role before the atomic RPC', async () => {
    const noAuthMock = mockSupabase();
    let mod = await import('../delete-product');
    let res = await mod.handler(makeEvent({ id: 'product-1' }, ''), {} as never);
    expect(res.statusCode).toBe(401);
    expect(noAuthMock.rpcCalls).toHaveLength(0);

    vi.resetModules();
    const buyerMock = mockSupabase({ role: 'buyer' });
    mod = await import('../delete-product');
    res = await mod.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(403);
    expect(buyerMock.rpcCalls).toHaveLength(0);
  });

  it('rejects another seller listing before the atomic RPC', async () => {
    const { rpcCalls } = mockSupabase({ sellerId: 'seller-2' });
    const { handler } = await import('../delete-product');
    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);

    expect(res.statusCode).toBe(403);
    expect(rpcCalls).toHaveLength(0);
  });

  it('passes caller identity and admin authority to the atomic DB boundary', async () => {
    const { rpcCalls } = mockSupabase({ role: 'admin', callerId: 'admin-1', sellerId: 'seller-2' });
    const { handler } = await import('../delete-product');
    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);

    expect(res.statusCode).toBe(200);
    expect(rpcCalls).toEqual([
      {
        name: 'delete_product_if_history_free',
        params: {
          p_product_id: 'product-1',
          p_caller_id: 'admin-1',
          p_is_admin: true,
        },
      },
    ]);
  });

  it('blocks deletion when the DB boundary reports retained history', async () => {
    const { handler } = await importWithMock({ rpcStatus: 'retained_history' });
    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('LISTING_HAS_RETAINED_HISTORY');
  });

  it('maps atomic not-found and forbidden results safely', async () => {
    let loaded = await importWithMock({ rpcStatus: 'not_found' });
    let res = await loaded.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(404);

    vi.resetModules();
    loaded = await importWithMock({ rpcStatus: 'forbidden' });
    res = await loaded.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(403);
  });

  it('fails closed when the atomic DB boundary errors or returns an unknown state', async () => {
    let loaded = await importWithMock({ rpcError: 'rpc unavailable' });
    let res = await loaded.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(500);

    vi.resetModules();
    loaded = await importWithMock({ rpcStatus: 'unexpected-state' });
    res = await loaded.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(500);
  });

  it('does not delete storage objects as part of the product transaction', async () => {
    const loaded = await importWithMock({ rpcStatus: 'deleted' });
    const res = await loaded.handler(makeEvent({ id: 'product-1' }), {} as never);

    expect(res.statusCode).toBe(200);
    expect(loaded.storageRemove).not.toHaveBeenCalled();
  });
});
