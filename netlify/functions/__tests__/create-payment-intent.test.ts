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
  listingContext: 'product',
  listingStatus: 'active',
  images: [],
  vatRate: 0,
};

const sellerProfile = {
  stripeAccountId: 'acct_123',
  stripeConnectStatus: 'active',
  sellerStatus: 'active',
  isPaused: false,
  businessName: 'Seller Ltd',
  fullName: 'Seller Owner',
  businessAddress: {
    streetAddress: '10 Seller Street',
    city: 'Manchester',
    postcode: 'M1 1AA',
    country: 'United Kingdom',
  },
  isVatRegistered: false,
  vatNumber: null,
};

describe('create-payment-intent – shipping and marketplace tax contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function mockRuntime(options?: {
    productRows?: Array<typeof productRow>;
    productShippingRows?: unknown[];
    seller?: typeof sellerProfile;
    buyerProfile?: Record<string, unknown>;
  }) {
    const paymentIntentCreate = vi.fn().mockResolvedValue({
      id: 'pi_123',
      client_secret: 'pi_123_secret',
    });
    const paymentIntentCancel = vi.fn().mockResolvedValue({ id: 'pi_123' });
    const paymentSessionInsert = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('stripe', () => ({
      default: vi.fn().mockImplementation(function () {
        return {
          paymentIntents: {
            create: paymentIntentCreate,
            cancel: paymentIntentCancel,
          },
        };
      }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-1', email: 'buyer@test.com', app_metadata: {} } },
            error: null,
          }),
        },
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        from: vi.fn((table: string) => {
          if (table === 'products') {
            let updateMode = false;
            const chain: Record<string, unknown> = {};
            chain.select = vi.fn(() => updateMode
              ? Promise.resolve({ count: 1, data: [{ id: 'p1' }], error: null })
              : chain);
            chain.in = vi.fn().mockResolvedValue({
              data: options?.productRows ?? [productRow],
              error: null,
            });
            chain.update = vi.fn(() => {
              updateMode = true;
              return chain;
            });
            chain.eq = vi.fn(() => chain);
            return chain;
          }
          if (table === 'product_shipping') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({
                data: options?.productShippingRows ?? [],
                error: null,
              }),
            };
          }
          if (table === 'seller_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: options?.seller ?? sellerProfile,
                error: null,
              }),
            };
          }
          if (table === 'buyer_profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: options?.buyerProfile ?? { accountType: 'individual', isVatVerified: false },
                error: null,
              }),
            };
          }
          if (table === 'users') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { email: 'buyer@test.com', firstName: 'Buyer', lastName: 'One' },
                error: null,
              }),
            };
          }
          if (table === 'payment_sessions') {
            return { insert: paymentSessionInsert };
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

    return { paymentIntentCreate, paymentSessionInsert };
  }

  it('returns 400 when goods cart is missing shippingMethodId', async () => {
    mockRuntime();

    const { handler } = await import('../create-payment-intent');
    const res = await handler(
      makeEvent(
        { ...baseBody, shippingAmount: 0.01 },
        'POST',
        { authorization: 'Bearer valid-token' },
      ),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/shipping method/i);
  });

  it('returns 400 when shippingMethodId is not mapped to the product in cart', async () => {
    mockRuntime({ productShippingRows: [] });

    const { handler } = await import('../create-payment-intent');
    const res = await handler(
      makeEvent(
        {
          ...baseBody,
          shippingAmount: 0.01,
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

  it('fails closed before Stripe when the marketplace seller is VAT registered', async () => {
    const runtime = mockRuntime({
      productRows: [{ ...productRow, listingContext: 'service' }],
      seller: { ...sellerProfile, isVatRegistered: true, vatNumber: 'GB123456789' },
    });

    const { handler } = await import('../create-payment-intent');
    const res = await handler(
      makeEvent(baseBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body as string).error).toMatch(/explicit verified tax treatment/i);
    expect(runtime.paymentIntentCreate).not.toHaveBeenCalled();
  });

  it('charges the full seller price for a VAT-verified B2B buyer and records reverseCharge=false', async () => {
    const runtime = mockRuntime({
      productRows: [{ ...productRow, listingContext: 'service' }],
      buyerProfile: {
        accountType: 'company',
        isVatVerified: true,
        companyName: 'Buyer Ltd',
        vatNumber: 'GB987654321',
      },
    });

    const { handler } = await import('../create-payment-intent');
    const res = await handler(
      makeEvent(baseBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(runtime.paymentIntentCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 1000 }));

    const insertPayload = runtime.paymentSessionInsert.mock.calls[0]?.[0] as Record<string, unknown>;
    const metadata = insertPayload.metadata as Record<string, unknown>;
    const buyerSnapshot = metadata.buyerSnapshot as Record<string, unknown>;
    expect(metadata.applyReverseCharge).toBe(false);
    expect(metadata.taxSnapshotVersion).toBe(1);
    expect(metadata.taxTreatment).toBe('seller_not_vat_registered');
    expect(buyerSnapshot.reverseCharge).toBe(false);
    expect(insertPayload.amount).toBe(10);
  });
});