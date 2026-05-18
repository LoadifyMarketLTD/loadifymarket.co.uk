/**
 * Unit tests for the create-checkout Netlify function.
 *
 * Tests focus on the request-validation and early-return paths that can be
 * exercised without a real Stripe account or Supabase instance.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, method = 'POST', headers: Record<string, string> = {}): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers,
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/create-checkout',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/create-checkout',
  };
}

const validBody = {
  items: [{ productId: 'p1', quantity: 1, price: 10, title: 'Widget', sellerId: 's1' }],
  buyerId: 'buyer-1',
  shippingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
  billingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
  shippingMethodId: '11111111-1111-1111-1111-111111111111',
};

describe('create-checkout handler – request validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns 405 for non-POST requests', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    const { handler } = await import('../create-checkout');
    const res = await handler(makeEvent({}, 'GET'), {} as never);
    expect(res.statusCode).toBe(405);
  });

  it('returns 500 when STRIPE_SECRET_KEY is absent', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { handler } = await import('../create-checkout');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string).error).toMatch(/payment provider/i);
  });

  it('returns 500 when STRIPE_SECRET_KEY has invalid prefix', async () => {
    process.env.STRIPE_SECRET_KEY = 'pk_test_not_a_secret';
    const { handler } = await import('../create-checkout');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res.statusCode).toBe(500);
  });

  it('returns 400 when a product is unavailable (not active)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.doMock('stripe', () => ({
      default: vi.fn().mockImplementation(function () {
        return {};
      }),
    }));
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          // P1 gate: return a valid user so the auth check passes and the
          // test can reach the product-availability check.
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-1', email: 'buyer@test.com' } },
            error: null,
          }),
        },
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'p1', price: 10, title: 'Widget', sellerId: 's1', isActive: false, isApproved: true, stockQuantity: 5 }],
            error: null,
          }),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
        })),
      })),
    }));
    const { handler } = await import('../create-checkout');
    // Pass a lowercase 'authorization' header so the P1 auth gate is satisfied.
    // Netlify normalises headers to lowercase at the edge; unit test mocks do not.
    const res = await handler(makeEvent(validBody, 'POST', { authorization: 'Bearer valid-token' }), {} as never);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/no longer available/i);
  });

  it('returns 400 when a physical cart is missing shippingMethodId', async () => {
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
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-1', email: 'buyer@test.com' } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === 'products') {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: [{
                  id: 'p1',
                  price: 10,
                  title: 'Widget',
                  sellerId: 's1',
                  isActive: true,
                  isApproved: true,
                  stockQuantity: 5,
                  listingContext: 'product',
                  listingStatus: 'active',
                }],
                error: null,
              }),
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
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      })),
    }));

    const { handler } = await import('../create-checkout');
    const res = await handler(
      makeEvent(
        {
          ...validBody,
          shippingMethodId: undefined,
        },
        'POST',
        { authorization: 'Bearer valid-token' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/shipping method/i);
  });
});
