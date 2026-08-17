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
    orders?: Array<{ id: string }>;
    orderItems?: Array<{ id: string }>;
    ordersError?: string;
    orderItemsError?: string;
    deleteError?: { code?: string; message: string } | null;
    cleanupError?: string;
    images?: string[];
  }) {
    const deleteCalls: string[] = [];
    const storageRemovals: string[][] = [];
    const callerId = args?.callerId ?? 'seller-1';
    const sellerId = args?.sellerId ?? 'seller-1';

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: callerId } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn(() => ({
          remove: vi.fn().mockImplementation(async (paths: string[]) => {
            storageRemovals.push(paths);
            return { error: args?.cleanupError ? { message: args.cleanupError } : null };
          }),
        })),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: args?.role ?? 'seller' },
              error: null,
            }),
          };
        }

        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                sellerId,
                images: args?.images ?? [],
              },
              error: null,
            }),
            delete: vi.fn(() => ({
              eq: vi.fn().mockImplementation(async (_column: string, value: string) => {
                deleteCalls.push(value);
                return { error: args?.deleteError ?? null };
              }),
            })),
          };
        }

        if (table === 'orders' || table === 'order_items') {
          const isOrders = table === 'orders';
          const rows = isOrders ? (args?.orders ?? []) : (args?.orderItems ?? []);
          const errorMessage = isOrders ? args?.ordersError : args?.orderItemsError;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: rows,
              error: errorMessage ? { message: errorMessage } : null,
            }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => supabase),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(args?.maintenance ?? false),
    }));

    return { deleteCalls, storageRemovals };
  }

  it('requires authentication and seller/admin role', async () => {
    mockSupabase();
    let mod = await import('../delete-product');
    let res = await mod.handler(makeEvent({ id: 'product-1' }, ''), {} as never);
    expect(res.statusCode).toBe(401);

    vi.resetModules();
    const buyerMock = mockSupabase({ role: 'buyer' });
    mod = await import('../delete-product');
    res = await mod.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(403);
    expect(buyerMock.deleteCalls).toHaveLength(0);
  });

  it('blocks seller deletion when orders retain product history', async () => {
    const { deleteCalls } = mockSupabase({ orders: [{ id: 'order-1' }] });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('LISTING_HAS_ORDER_HISTORY');
    expect(deleteCalls).toHaveLength(0);
  });

  it('blocks seller deletion when order_items retain product history', async () => {
    const { deleteCalls } = mockSupabase({ orderItems: [{ id: 'item-1' }] });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('LISTING_HAS_ORDER_HISTORY');
    expect(deleteCalls).toHaveLength(0);
  });

  it('fails closed when retained-order history cannot be verified', async () => {
    const { deleteCalls } = mockSupabase({ ordersError: 'database unavailable' });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(500);
    expect(deleteCalls).toHaveLength(0);
  });

  it('rejects deletion of a listing owned by another seller', async () => {
    const { deleteCalls } = mockSupabase({ sellerId: 'seller-2' });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(403);
    expect(deleteCalls).toHaveLength(0);
  });

  it('blocks non-admin deletion during maintenance and allows admin bypass to proceed', async () => {
    const sellerMock = mockSupabase({ maintenance: true });
    let mod = await import('../delete-product');
    let res = await mod.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(503);
    expect(sellerMock.deleteCalls).toHaveLength(0);

    vi.resetModules();
    const adminMock = mockSupabase({ maintenance: true, role: 'admin', callerId: 'admin-1', sellerId: 'seller-1' });
    mod = await import('../delete-product');
    res = await mod.handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(200);
    expect(adminMock.deleteCalls).toEqual(['product-1']);
  });

  it('deletes the listing before cleaning only owned Loadify product images', async () => {
    const { deleteCalls, storageRemovals } = mockSupabase({
      images: [
        'https://test.supabase.co/storage/v1/object/public/product-images/sellers/seller-1/photo-a.jpg',
        'https://test.supabase.co/storage/v1/object/public/product-images/sellers/seller-2/photo-b.jpg',
        'https://example.com/external.jpg',
      ],
    });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(200);
    expect(deleteCalls).toEqual(['product-1']);
    expect(storageRemovals).toEqual([['sellers/seller-1/photo-a.jpg']]);
  });

  it('returns success when post-delete image cleanup fails', async () => {
    const { deleteCalls } = mockSupabase({
      images: ['https://test.supabase.co/storage/v1/object/public/product-images/sellers/seller-1/photo.jpg'],
      cleanupError: 'storage unavailable',
    });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(200);
    expect(deleteCalls).toEqual(['product-1']);
  });

  it('maps retained-record foreign-key protection to a conflict response', async () => {
    mockSupabase({ deleteError: { code: '23503', message: 'foreign key violation' } });
    const { handler } = await import('../delete-product');

    const res = await handler(makeEvent({ id: 'product-1' }), {} as never);
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('LISTING_HAS_RETAINED_RECORDS');
  });
});
