import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, method = 'POST', headers: Record<string, string> = {}): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers,
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/create-payment-intent',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/create-payment-intent',
  };
}

const baseBody = {
  items: [{ productId: 'p1', quantity: 1, price: 999, title: 'Widget', sellerId: 'tampered' }],
  buyerId: 'buyer-1',
  shippingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
  billingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
};

const productRow = {
  id: 'p1',
  price: 10,
  title: 'Widget',
  sellerId: 'seller-1',
  isActive: true,
  isApproved: true,
  stockQuantity: 5,
  listingContext: 'goods',
  listingStatus: 'active',
};

describe('create-payment-intent – shipping tamper protection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function mockCommonSupabase(overrides?: { productShippingRows?: unknown[] }) {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-1', email: 'buyer@test.com' } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        from: vi.fn((table: string) => {
          if (table === 'products') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({ data: [productRow], error: null }),
            };
          }
          if (table === 'seller_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { stripeAccountId: 'acct_123', stripeConnectStatus: 'active', sellerStatus: 'active' },
                error: null,
              }),
            };
          }
          if (table === 'product_shipping') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({ data: overrides?.productShippingRows ?? [], error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      })),
    }));
  }

  it('returns 400 when goods cart is missing shippingMethodId', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

    vi.doMock('stripe', () => ({
      default: vi.fn().mockImplementation(function () {
        return {};
      }),
    }));
    vi.doMock('./_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('./_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    mockCommonSupabase();

    const { handler } = await import('../create-payment-intent');
    const res = await handler(
      makeEvent(
        { ...baseBody, shippingAmount: 0.01 }, // client-tampered value
        'POST',
        { authorization: 'Bearer valid-token' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/shipping method/i);
  });

  it('returns 400 when shippingMethodId is not mapped to the product in cart', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

    vi.doMock('stripe', () => ({
      default: vi.fn().mockImplementation(function () {
        return {};
      }),
    }));
    vi.doMock('./_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('./_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    mockCommonSupabase({ productShippingRows: [] });

    const { handler } = await import('../create-payment-intent');
    const res = await handler(
      makeEvent(
        {
          ...baseBody,
          shippingAmount: 0.01, // client-tampered value
          shippingMethodId: '11111111-1111-1111-1111-111111111111',
        },
        'POST',
        { authorization: 'Bearer valid-token' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/not available/i);
  });
});
