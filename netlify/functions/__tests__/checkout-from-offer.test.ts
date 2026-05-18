import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, method = 'POST', headers: Record<string, string> = {}): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers,
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/checkout-from-offer',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/checkout-from-offer',
  };
}

function makeMaybeSingleBuilder<T>(result: { data: T | null; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function makeInsertBuilder(result: { error: unknown }) {
  return {
    insert: vi.fn().mockResolvedValue(result),
  };
}

function mockCheckoutDependencies(options?: {
  rpcResult?: { data: unknown; error: unknown };
  orderResult?: { data: unknown; error: unknown };
  listingResult?: { data: unknown; error: unknown };
  sellerProfileResult?: { data: unknown; error: unknown };
  sessionInsertResult?: { error: unknown };
  stripeCreateResult?: { id: string; url: string | null };
  stripeCreateError?: Error;
}) {
  const rpc = vi.fn().mockResolvedValue(options?.rpcResult ?? { data: 1, error: null });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'buyer-1' } },
    error: null,
  });

  const orderBuilder = makeMaybeSingleBuilder(options?.orderResult ?? {
    data: {
      id: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      productId: 'product-1',
      total: 12.34,
      status: 'awaiting_payment',
      offerId: 'offer-1',
    },
    error: null,
  });
  const listingBuilder = makeMaybeSingleBuilder(options?.listingResult ?? {
    data: {
      id: 'product-1',
      title: 'Example listing',
      sellerId: 'seller-1',
      listingContext: 'marketplace',
    },
    error: null,
  });
  const sellerProfileBuilder = makeMaybeSingleBuilder(options?.sellerProfileResult ?? {
    data: {
      stripeAccountId: 'acct_123',
      stripeConnectStatus: 'active',
      sellerStatus: 'active',
    },
    error: null,
  });
  const paymentSessionsBuilder = makeInsertBuilder(options?.sessionInsertResult ?? { error: null });

  const from = vi.fn((table: string) => {
    if (table === 'orders') return orderBuilder;
    if (table === 'products') return listingBuilder;
    if (table === 'seller_profiles') return sellerProfileBuilder;
    if (table === 'payment_sessions') return paymentSessionsBuilder;
    throw new Error(`Unexpected table ${table}`);
  });

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      auth: { getUser },
      rpc,
      from,
    })),
  }));
  vi.doMock('../_shared/rateLimiter', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false, attempts: 1 }),
  }));
  vi.doMock('../_shared/platformFlags', () => ({
    isMaintenanceMode: vi.fn().mockResolvedValue(false),
  }));

  const stripeCreate = options?.stripeCreateError
    ? vi.fn().mockRejectedValue(options.stripeCreateError)
    : vi.fn().mockResolvedValue(options?.stripeCreateResult ?? {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      });
  const stripeExpire = vi.fn().mockResolvedValue({ id: 'cs_test_123', status: 'expired' });

  vi.doMock('stripe', () => ({
    default: class StripeMock {
      checkout = {
        sessions: {
          create: stripeCreate,
          expire: stripeExpire,
        },
      };
    },
  }));

  return {
    rpc,
    from,
    stripeCreate,
    stripeExpire,
    paymentSessionsBuilder,
  };
}

describe('checkout-from-offer handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key-1234567890';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns 500 for invalid SUPABASE_URL instead of crashing', async () => {
    process.env.SUPABASE_URL = 'not-a-url';
    const { handler } = await import('../checkout-from-offer');
    const res = await handler(makeEvent({ orderId: 'order-1' }), {} as never);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string).error).toMatch(/database url is invalid/i);
  });

  it('accepts Authorization header casing and reaches body validation', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'buyer-1' } },
            error: null,
          }),
        },
      })),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false, attempts: 1 }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));

    const { handler } = await import('../checkout-from-offer');
    const res = await handler(makeEvent({}, 'POST', { Authorization: 'Bearer valid-token' }), {} as never);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/orderId is required/i);
  });

  it('returns JSON 500 when Supabase auth throws unexpectedly', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockRejectedValue(new Error('supabase auth outage')),
        },
      })),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false, attempts: 1 }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      isMaintenanceMode: vi.fn().mockResolvedValue(false),
    }));

    const { handler } = await import('../checkout-from-offer');
    const res = await handler(
      makeEvent({ orderId: 'order-1' }, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string).error).toContain('supabase auth outage');
  });

  it('returns structured RPC diagnostics with full Supabase error fields', async () => {
    mockCheckoutDependencies({
      rpcResult: {
        data: null,
        error: {
          code: '42501',
          message: 'permission denied for function release_stale_unpaid_listing_locks',
          details: 'execute permission denied for service role',
          hint: 'Check SECURITY DEFINER and GRANT EXECUTE',
        },
      },
    });

    const { handler } = await import('../checkout-from-offer');
    const res = await handler(
      makeEvent({ orderId: 'order-1' }, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string)).toEqual({
      step: 'rpc.release_stale_unpaid_listing_locks.call',
      error: 'Supabase RPC failed',
      details: {
        orderId: 'order-1',
        callerId: 'buyer-1',
        rpcName: 'release_stale_unpaid_listing_locks',
        code: '42501',
        message: 'permission denied for function release_stale_unpaid_listing_locks',
        details: 'execute permission denied for service role',
        hint: 'Check SECURITY DEFINER and GRANT EXECUTE',
      },
    });
  });

  it('logs before and after RPC, Stripe, and DB write steps on success', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    mockCheckoutDependencies();

    const { handler } = await import('../checkout-from-offer');
    const res = await handler(
      makeEvent({ orderId: 'order-1' }, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    const loggedSteps = infoSpy.mock.calls
      .filter(([message]) => message === 'checkout-from-offer step')
      .map(([, payload]) => (payload as { step: string }).step);

    expect(loggedSteps).toEqual([
      'rpc.release_stale_unpaid_listing_locks.before',
      'rpc.release_stale_unpaid_listing_locks.after',
      'stripe.checkout_session.before',
      'stripe.checkout_session.after',
      'payment_sessions.insert.before',
      'payment_sessions.insert.after',
    ]);
  });

  it('returns the exact Stripe step when checkout session creation throws', async () => {
    mockCheckoutDependencies({
      stripeCreateError: new Error('Stripe API outage'),
    });

    const { handler } = await import('../checkout-from-offer');
    const res = await handler(
      makeEvent({ orderId: 'order-1' }, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string)).toMatchObject({
      step: 'stripe.checkout_session.create',
      error: 'Stripe API outage',
      details: {
        message: 'Stripe API outage',
      },
    });
  });

  it('returns structured DB write diagnostics and expires the orphaned Stripe session', async () => {
    const mocks = mockCheckoutDependencies({
      sessionInsertResult: {
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "payment_sessions"',
          details: 'INSERT blocked by payment_sessions_admin_write policy',
          hint: 'Use service role or SECURITY DEFINER',
        },
      },
    });

    const { handler } = await import('../checkout-from-offer');
    const res = await handler(
      makeEvent({ orderId: 'order-1' }, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string)).toEqual({
      step: 'payment_sessions.insert',
      error: 'Payment session insert failed',
      details: {
        orderId: 'order-1',
        callerId: 'buyer-1',
        stripeSessionId: 'cs_test_123',
        code: '42501',
        message: 'new row violates row-level security policy for table "payment_sessions"',
        details: 'INSERT blocked by payment_sessions_admin_write policy',
        hint: 'Use service role or SECURITY DEFINER',
      },
    });
    expect(mocks.stripeExpire).toHaveBeenCalledWith('cs_test_123');
  });
});
