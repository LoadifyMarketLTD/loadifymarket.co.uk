import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: Record<string, unknown>): HandlerEvent {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer valid-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/create-product',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/create-product',
  };
}

describe('create-product publication stock contract', () => {
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

  function mockSupabase() {
    const insertedProducts: Array<Record<string, unknown>> = [];
    const productUpdates: Array<Record<string, unknown>> = [];

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
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'seller' }, error: null }),
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
                listingLimit: null,
              },
              error: null,
            }),
          };
        }

        if (table === 'products') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
            insert: vi.fn((rows: Array<Record<string, unknown>>) => {
              insertedProducts.push(...rows);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'product-1' }, error: null }),
                }),
              };
            }),
            update: vi.fn((payload: Record<string, unknown>) => {
              productUpdates.push(payload);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }

        if (table === 'product_shipping') {
          return {
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

    return { insertedProducts, productUpdates };
  }

  it('rejects publishing a physical product with zero stock', async () => {
    const { insertedProducts } = mockSupabase();
    const { handler } = await import('../create-product');

    const res = await handler(
      makeEvent({
        title: 'Zero-stock product',
        price: 25,
        isActive: true,
        listingContext: 'product',
        stockQuantity: 0,
        shippingMethodIds: ['shipping-1'],
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(insertedProducts).toHaveLength(0);
    expect(JSON.parse(res.body as string).error).toMatch(/at least 1 unit of stock/i);
  });

  it('allows a physical draft with zero stock', async () => {
    const { insertedProducts, productUpdates } = mockSupabase();
    const { handler } = await import('../create-product');

    const res = await handler(
      makeEvent({
        title: 'Draft product',
        price: 25,
        isActive: false,
        listingContext: 'product',
        stockQuantity: 0,
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(insertedProducts).toHaveLength(1);
    expect(insertedProducts[0]).toMatchObject({ isActive: false, stockQuantity: 0 });
    expect(productUpdates).toEqual([]);
  });

  it('allows publishing a service with zero stock through staged activation', async () => {
    const { insertedProducts, productUpdates } = mockSupabase();
    const { handler } = await import('../create-product');

    const res = await handler(
      makeEvent({
        title: 'Seller service',
        price: 80,
        isActive: true,
        listingContext: 'service',
        stockQuantity: 0,
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(insertedProducts).toHaveLength(1);
    expect(insertedProducts[0]).toMatchObject({
      isActive: false,
      listingContext: 'service',
      stockQuantity: 0,
      stockStatus: 'in_stock',
    });
    expect(productUpdates).toEqual([{ isActive: true }]);
    expect(JSON.parse(res.body as string)).toMatchObject({
      id: 'product-1',
      isActive: true,
      isApproved: true,
    });
  });
});
