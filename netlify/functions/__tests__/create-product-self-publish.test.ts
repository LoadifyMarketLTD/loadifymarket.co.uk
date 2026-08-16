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

describe('create-product seller self-publish contract', () => {
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

  function mockSupabase(profile?: Partial<{
    sellerStatus: string;
    stripeConnectStatus: string;
    isPaused: boolean;
    listingLimit: number | null;
  }>) {
    const insertedProducts: Array<Record<string, unknown>> = [];
    const shippingRows: Array<Record<string, unknown>> = [];

    const sellerProfile = {
      sellerStatus: 'active',
      stripeConnectStatus: 'active',
      isPaused: false,
      listingLimit: null,
      ...profile,
    };

    const productsTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
      insert: vi.fn((rows: Array<Record<string, unknown>>) => {
        insertedProducts.push(...rows);
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'product-1' }, error: null }),
          }),
        };
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
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
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'seller' }, error: null }),
          };
        }
        if (table === 'seller_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: sellerProfile, error: null }),
          };
        }
        if (table === 'products') return productsTable;
        if (table === 'product_shipping') {
          return {
            insert: vi.fn((rows: Array<Record<string, unknown>>) => {
              shippingRows.push(...rows);
              return Promise.resolve({ error: null });
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
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));

    return { insertedProducts, shippingRows };
  }

  const validPublishBody = {
    title: 'Seller product',
    price: 120,
    isActive: true,
    listingContext: 'product',
    stockQuantity: 4,
    shippingMethodIds: ['shipping-1'],
    dispatchTime: '1-2 working days',
  };

  it('publishes an eligible seller listing live without manual product approval', async () => {
    const { insertedProducts, shippingRows } = mockSupabase();
    const { handler } = await import('../create-product');

    const res = await handler(makeEvent(validPublishBody), {} as never);

    expect(res.statusCode).toBe(200);
    expect(insertedProducts).toHaveLength(1);
    expect(insertedProducts[0]).toMatchObject({
      sellerId: 'seller-1',
      isActive: true,
      isApproved: true,
      listingContext: 'product',
      stockQuantity: 4,
      stockStatus: 'low_stock',
    });
    expect(shippingRows).toHaveLength(1);
    expect(JSON.parse(res.body as string)).toMatchObject({
      id: 'product-1',
      isActive: true,
      isApproved: true,
    });
  });

  it('does not allow the client to override the server-owned moderation marker', async () => {
    const { insertedProducts } = mockSupabase();
    const { handler } = await import('../create-product');

    const res = await handler(
      makeEvent({ ...validPublishBody, isApproved: false }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(insertedProducts[0]?.isApproved).toBe(true);
  });

  it('rejects public publication when the seller is paused', async () => {
    const { insertedProducts } = mockSupabase({ isPaused: true });
    const { handler } = await import('../create-product');

    const res = await handler(makeEvent(validPublishBody), {} as never);

    expect(res.statusCode).toBe(409);
    expect(insertedProducts).toHaveLength(0);
    expect(JSON.parse(res.body as string).error).toMatch(/seller setup|stripe payments/i);
  });

  it('keeps a seller draft inactive without putting it on moderation hold', async () => {
    const { insertedProducts } = mockSupabase();
    const { handler } = await import('../create-product');

    const res = await handler(
      makeEvent({
        title: 'Draft product',
        price: 50,
        isActive: false,
        listingContext: 'product',
        stockQuantity: 1,
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(insertedProducts[0]).toMatchObject({
      isActive: false,
      isApproved: true,
      sellerId: 'seller-1',
    });
  });
});
