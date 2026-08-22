import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, method = 'POST'): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer valid-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/update-product',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/update-product',
  };
}

describe('update-product', () => {
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
    role?: 'seller' | 'admin';
    orders?: Array<{ id: string; orderNumber?: string | null; status: string; createdAt?: string | null }>;
    productRow?: Partial<{
      sellerId: string;
      title: string | null;
      type: string | null;
      condition: string | null;
      price: number | null;
      listingContext: string | null;
      stockQuantity: number | null;
      stockStatus: string | null;
      listingStatus: string | null;
      reservedUntil: string | null;
    }>;
  }) {
    const productUpdates: Array<Record<string, unknown>> = [];
    const productRow = {
      sellerId: 'seller-1',
      title: 'Existing listing',
      type: 'product',
      condition: 'new',
      price: 25,
      listingContext: 'goods',
      stockQuantity: 0,
      stockStatus: 'out_of_stock',
      listingStatus: 'active',
      reservedUntil: null,
      ...args?.productRow,
    };

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'seller-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: args?.role ?? 'seller', isActive: true },
              error: null,
            }),
          };
        }

        if (table === 'seller_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                sellerStatus: 'active',
                stripeConnectStatus: 'active',
                isPaused: false,
              },
              error: null,
            }),
          };
        }

        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: productRow,
              error: null,
            }),
            update: vi.fn((payload: Record<string, unknown>) => ({
              eq: vi.fn().mockImplementation(async () => {
                productUpdates.push(payload);
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: args?.orders ?? [],
              error: null,
            }),
          };
        }

        if (table === 'product_shipping') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
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
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));

    return { productUpdates };
  }

  it('persists stock when a goods listing changes from 0 to 10', async () => {
    const { productUpdates } = mockSupabase();
    const { handler } = await import('../update-product');

    const res = await handler(
      makeEvent({
        id: 'product-1',
        description: 'Updated description',
        listingContext: 'goods',
        stockQuantity: 10,
        stockStatus: 'out_of_stock',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(productUpdates).toHaveLength(1);
    expect(productUpdates[0]).toMatchObject({
      description: 'Updated description',
      listingContext: 'product',
      stockQuantity: 10,
      stockStatus: 'low_stock',
    });
  });

  it('persists stock when a goods listing changes from 10 to 1', async () => {
    const { productUpdates } = mockSupabase({
      productRow: {
        stockQuantity: 10,
        stockStatus: 'low_stock',
      },
    });
    const { handler } = await import('../update-product');

    const res = await handler(
      makeEvent({
        id: 'product-1',
        listingContext: 'goods',
        stockQuantity: 1,
        stockStatus: 'in_stock',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(productUpdates[0]).toMatchObject({
      listingContext: 'product',
      stockQuantity: 1,
      stockStatus: 'low_stock',
    });
  });

  it('normalizes service listings to zero stock and in_stock status', async () => {
    const { productUpdates } = mockSupabase({
      productRow: {
        listingContext: 'goods',
        stockQuantity: 10,
        stockStatus: 'in_stock',
      },
    });
    const { handler } = await import('../update-product');

    const res = await handler(
      makeEvent({
        id: 'product-1',
        listingContext: 'service',
        stockQuantity: 99,
        stockStatus: 'out_of_stock',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(productUpdates[0]).toMatchObject({
      listingContext: 'service',
      stockQuantity: 0,
      stockStatus: 'in_stock',
    });
  });

  it('rejects invalid goods stock quantities', async () => {
    mockSupabase();
    const { handler } = await import('../update-product');

    const res = await handler(
      makeEvent({
        id: 'product-1',
        listingContext: 'goods',
        stockQuantity: '1.5',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/stockQuantity/i);
  });

  it('returns a structured lock error instead of silently ignoring stock changes', async () => {
    const { productUpdates } = mockSupabase({
      orders: [
        {
          id: 'order-1',
          orderNumber: 'LM-1000001',
          status: 'paid',
          createdAt: '2026-05-17T20:00:00.000Z',
        },
      ],
    });
    const { handler } = await import('../update-product');

    const res = await handler(
      makeEvent({
        id: 'product-1',
        listingContext: 'goods',
        stockQuantity: 10,
        stockStatus: 'in_stock',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(409);
    expect(productUpdates).toHaveLength(0);
    const body = JSON.parse(res.body as string) as { code?: string; error?: string; locks?: Array<{ orderLabel?: string }> };
    expect(body.code).toBe('LISTING_LOCKED');
    expect(body.error).toMatch(/critical listing fields are locked/i);
    expect(body.locks?.[0]?.orderLabel).toBe('LM-1000001');
  });
});
