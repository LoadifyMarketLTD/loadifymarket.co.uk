/**
 * checkout-safety.test.ts
 *
 * Proves all 9 required safety rules after the P1–P5 payment hardening:
 *
 *  1. Unauthenticated buyer → 401 (cannot checkout)
 *  2. Authenticated buyer → no auth block (can proceed)
 *  3. Multi-seller cart → 400 "one seller at a time"
 *  4. Suspended seller → 400 "unavailable"
 *  5. Seller without Stripe account → 400 "not ready"
 *  6. Seller Stripe not active → 400 "not ready"
 *  7. Valid single-seller with active Stripe → 200 with Stripe redirect URL
 *  8. payment_intent.payment_failed → payment_sessions marked 'failed'
 *  9. charge.dispute.created → dispute stored in DB + linked to order
 *
 * Also verifies the P4C refund column fix (stripePaymentIntent, not paymentIntentId).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function makeEvent(
  body: unknown,
  method = 'POST',
  headers: Record<string, string> = {},
): HandlerEvent {
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

// A minimal valid checkout body with a single seller
const singleSellerBody = {
  items: [{ productId: 'p1', quantity: 1, price: 20, title: 'Widget', sellerId: 's1' }],
  buyerId: 'buyer-1',
  shippingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
  billingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
};

// Two products from different sellers
const multiSellerBody = {
  items: [
    { productId: 'p1', quantity: 1, price: 20, title: 'Widget A', sellerId: 's1' },
    { productId: 'p2', quantity: 1, price: 15, title: 'Widget B', sellerId: 's2' },
  ],
  buyerId: 'buyer-1',
  shippingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
  billingAddress: { line1: '1 High St', city: 'London', postal_code: 'E1 1AA', country: 'GB' },
};

type MockSellerProfile = {
  stripeAccountId: string | null;
  stripeConnectStatus: string | null;
  sellerStatus: string | null;
};

/**
 * Creates a mocked @supabase/supabase-js createClient that routes calls based
 * on which table is queried. All parameters are optional; the defaults represent
 * a perfectly healthy single-seller checkout that should succeed.
 */
function makeSupabaseMock(opts: {
  authUserId?: string;
  authError?: Error | null;
  // Products returned by from('products').select(...).in(...)
  products?: Array<{
    id: string;
    price: number;
    title: string;
    sellerId: string;
    isActive: boolean;
    isApproved: boolean;
    stockQuantity: number;
  }>;
  productsError?: Error | null;
  sellerProfile?: MockSellerProfile | null;
  sellerProfileError?: Error | null;
  sessionInsertError?: Error | null;
  // For webhook tests
  paymentSessionsUpdate?: ReturnType<typeof vi.fn>;
  paymentSessionMaybeSingle?: { data: unknown; error: unknown };
  orderSingle?: { data: unknown; error: unknown };
  disputeInsert?: { error: unknown };
}) {
  const {
    authUserId = 'buyer-1',
    authError = null,
    products = [
      { id: 'p1', price: 20, title: 'Widget', sellerId: 's1', isActive: true, isApproved: true, stockQuantity: 10 },
    ],
    productsError = null,
    sellerProfile = { stripeAccountId: 'acct_123', stripeConnectStatus: 'active', sellerStatus: 'active' },
    sellerProfileError = null,
    sessionInsertError = null,
    paymentSessionsUpdate = vi.fn().mockReturnValue({ error: null }),
    paymentSessionMaybeSingle = { data: { orderId: 'order-1' }, error: null },
    orderSingle = { data: { id: 'order-1', buyerId: 'buyer-1', sellerId: 's1' }, error: null },
    disputeInsert = { error: null },
  } = opts;

  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authError ? null : { id: authUserId, email: 'buyer@test.com' } },
          error: authError ?? null,
        }),
      },
      from: vi.fn((table: string) => {
        switch (table) {
          case 'products':
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({ data: products, error: productsError }),
            };
          case 'seller_profiles':
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: sellerProfile,
                error: sellerProfileError,
              }),
            };
          case 'payment_sessions': {
            const update = paymentSessionsUpdate;
            return {
              select: vi.fn().mockReturnThis(),
              insert: vi.fn().mockResolvedValue({ error: sessionInsertError }),
              eq: vi.fn().mockReturnThis(),
              filter: vi.fn().mockReturnThis(),
              update: vi.fn(() => ({
                eq: vi.fn().mockReturnThis(),
                filter: vi.fn().mockReturnThis(),
                then: update,
                catch: vi.fn().mockReturnThis(),
              })),
              maybeSingle: vi.fn().mockResolvedValue(paymentSessionMaybeSingle),
            };
          }
          case 'orders':
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue(orderSingle),
            };
          case 'disputes':
            return {
              insert: vi.fn().mockResolvedValue(disputeInsert),
            };
          default:
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
        }
      }),
    })),
  };
}

// ── Tests 1–7: create-checkout safety ─────────────────────────────────────────

describe('create-checkout – safety hardening (P1–P5)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ── Test 1: No auth → 401 ───────────────────────────────────────────────
  it('Test 1: unauthenticated buyer returns 401 (P1)', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock({}));
    vi.doMock('stripe', () => ({ default: vi.fn() }));

    const { handler } = await import('../create-checkout');
    // No Authorization header → verifiedBuyerId stays ''
    const res = await handler(makeEvent(singleSellerBody), {} as never);

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body as string).error).toMatch(/sign in/i);
  });

  // ── Test 2: Authenticated buyer is not blocked by auth check ────────────
  it('Test 2: authenticated buyer passes P1 auth gate', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock({}));
    // Use 'function' (not arrow) for the Stripe constructor mock — vi.fn() with an
    // arrow implementation cannot be used with 'new', causing the handler to throw.
    vi.doMock('stripe', () => ({
      default: vi.fn(function MockStripe() {
        return {
          checkout: {
            sessions: {
              create: vi.fn().mockResolvedValue({
                id: 'cs_test_123',
                url: 'https://checkout.stripe.com/test',
                payment_intent: 'pi_test_123',
              }),
            },
          },
        };
      }),
    }));

    const { handler } = await import('../create-checkout');
    // Use lowercase 'authorization' — Netlify normalises to lowercase at the edge but
    // unit-test HandlerEvent mocks are NOT normalised, so the key must match exactly.
    const res = await handler(
      makeEvent(singleSellerBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    // Should NOT be 401 (auth check passed).
    expect(res.statusCode).not.toBe(401);
    const body = JSON.parse(res.body as string) as { error?: string };
    // body.error may be undefined on a 200 success — guard with ?? '' before matching.
    expect(body.error ?? '').not.toMatch(/sign in/i);
  });

  // ── Test 3: Multi-seller cart → 400 (P3) ───────────────────────────────
  it('Test 3: multi-seller cart is rejected with 400 (P3)', async () => {
    vi.doMock('@supabase/supabase-js', () =>
      makeSupabaseMock({
        products: [
          { id: 'p1', price: 20, title: 'Widget A', sellerId: 's1', isActive: true, isApproved: true, stockQuantity: 5 },
          { id: 'p2', price: 15, title: 'Widget B', sellerId: 's2', isActive: true, isApproved: true, stockQuantity: 5 },
        ],
      }),
    );
    vi.doMock('stripe', () => ({ default: vi.fn() }));

    const { handler } = await import('../create-checkout');
    const res = await handler(
      makeEvent(multiSellerBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/one seller at a time/i);
  });

  // ── Test 4: Suspended seller → 400 (P5) ────────────────────────────────
  it('Test 4: suspended seller is blocked with 400 (P5)', async () => {
    vi.doMock('@supabase/supabase-js', () =>
      makeSupabaseMock({
        sellerProfile: { stripeAccountId: 'acct_123', stripeConnectStatus: 'active', sellerStatus: 'suspended' },
      }),
    );
    vi.doMock('stripe', () => ({ default: vi.fn() }));

    const { handler } = await import('../create-checkout');
    const res = await handler(
      makeEvent(singleSellerBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/unavailable/i);
  });

  // ── Test 5: Seller without Stripe account → 400 (P2) ───────────────────
  it('Test 5: seller with no Stripe account is blocked with 400 (P2)', async () => {
    vi.doMock('@supabase/supabase-js', () =>
      makeSupabaseMock({
        sellerProfile: { stripeAccountId: null, stripeConnectStatus: null, sellerStatus: 'submitted' },
      }),
    );
    vi.doMock('stripe', () => ({ default: vi.fn() }));

    const { handler } = await import('../create-checkout');
    const res = await handler(
      makeEvent(singleSellerBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/not ready/i);
  });

  // ── Test 6: Seller Stripe status not active → 400 (P2) ─────────────────
  it('Test 6: seller with Stripe status "pending" is blocked with 400 (P2)', async () => {
    vi.doMock('@supabase/supabase-js', () =>
      makeSupabaseMock({
        sellerProfile: { stripeAccountId: 'acct_pending', stripeConnectStatus: 'pending', sellerStatus: 'submitted' },
      }),
    );
    vi.doMock('stripe', () => ({ default: vi.fn() }));

    const { handler } = await import('../create-checkout');
    const res = await handler(
      makeEvent(singleSellerBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/not ready/i);
  });

  // ── Test 7: Valid seller + single seller → 200 (all checks pass) ────────
  it('Test 7: valid single-seller with active Stripe returns 200 with checkout URL', async () => {
    vi.doMock('@supabase/supabase-js', () => makeSupabaseMock({}));
    // Use 'function' (not arrow) for the Stripe constructor mock — vi.fn() with an
    // arrow implementation cannot be used with 'new', causing the handler to throw.
    vi.doMock('stripe', () => ({
      default: vi.fn(function MockStripe() {
        return {
          checkout: {
            sessions: {
              create: vi.fn().mockResolvedValue({
                id: 'cs_test_ok',
                url: 'https://checkout.stripe.com/pay/cs_test_ok',
                payment_intent: 'pi_ok',
              }),
            },
          },
        };
      }),
    }));

    const { handler } = await import('../create-checkout');
    const res = await handler(
      makeEvent(singleSellerBody, 'POST', { authorization: 'Bearer valid-token' }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as { url?: string; sessionId?: string };
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_ok');
    expect(body.sessionId).toBe('cs_test_ok');
  });
});

// ── Test 8: payment_intent.payment_failed → sessions marked failed (P4A) ──────

describe('handlePaymentFailed – marks payment_sessions as failed (P4A)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 8: updates payment_sessions status to failed using transfer_group', async () => {
    const mockFilter = vi.fn().mockResolvedValue({ error: null });
    const mockEq = vi.fn().mockReturnValue({ filter: mockFilter });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    const mockSb = {
      from: vi.fn(() => ({ update: mockUpdate })),
    };

    const { handlePaymentFailed } = await import('../stripe-webhook');
    await handlePaymentFailed(
      mockSb as never,
      { id: 'pi_failed_123', transfer_group: 'tg_abc' } as import('stripe').default.PaymentIntent,
    );

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'failed' });
    expect(mockEq).toHaveBeenCalledWith('status', 'pending');
    expect(mockFilter).toHaveBeenCalledWith('metadata->>transferGroup', 'eq', 'tg_abc');
  });

  it('Test 8b: skips update when transfer_group is absent (legacy intent)', async () => {
    const mockSb = { from: vi.fn() };

    const { handlePaymentFailed } = await import('../stripe-webhook');
    await handlePaymentFailed(
      mockSb as never,
      { id: 'pi_legacy', transfer_group: null } as import('stripe').default.PaymentIntent,
    );

    // from() should never be called because we have no transfer_group to match on
    expect(mockSb.from).not.toHaveBeenCalled();
  });
});

// ── Test 9: charge.dispute.created → stored in disputes table (P4B) ───────────

describe('handleStripeDispute – stores dispute record in DB (P4B)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 9: inserts a dispute row linked to order when all data is available', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    const mockSb = {
      from: vi.fn((table: string) => {
        switch (table) {
          case 'payment_sessions':
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { orderId: 'order-999' },
                error: null,
              }),
            };
          case 'orders':
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'order-999', buyerId: 'buyer-1', sellerId: 'seller-1' },
                error: null,
              }),
            };
          case 'disputes':
            return { insert: insertMock };
          default:
            return {};
        }
      }),
    };

    const { handleStripeDispute } = await import('../stripe-webhook');
    await handleStripeDispute(
      mockSb as never,
      {
        id: 'dp_test_123',
        payment_intent: 'pi_dispute_456',
        reason: 'fraudulent',
        amount: 2000,
        status: 'needs_response',
      } as import('stripe').default.Dispute,
    );

    expect(insertMock).toHaveBeenCalledOnce();
    const insertArg = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.orderId).toBe('order-999');
    expect(insertArg.buyerId).toBe('buyer-1');
    expect(insertArg.sellerId).toBe('seller-1');
    expect(insertArg.status).toBe('in_review');
    // subject must mention the Stripe dispute ID so admin can look it up
    expect(String(insertArg.subject)).toContain('dp_test_123');
  });

  it('Test 9b: skips DB insert when payment_session not found (no order link)', async () => {
    const insertMock = vi.fn();

    const mockSb = {
      from: vi.fn((table: string) => {
        if (table === 'payment_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { insert: insertMock };
      }),
    };

    const { handleStripeDispute } = await import('../stripe-webhook');
    await handleStripeDispute(
      mockSb as never,
      {
        id: 'dp_orphan',
        payment_intent: 'pi_unknown',
        reason: 'product_not_received',
        amount: 1000,
        status: 'warning_needs_response',
      } as import('stripe').default.Dispute,
    );

    // disputes.insert must NOT be called when no linked order exists
    expect(insertMock).not.toHaveBeenCalled();
  });
});

// ── P4C: Refund column name fix ───────────────────────────────────────────────

describe('create-refund – P4C column name fix (stripePaymentIntent)', () => {
  it('source code uses stripePaymentIntent, not paymentIntentId', async () => {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = readFileSync(resolve(__dirname, '../create-refund.ts'), 'utf-8');

    // The correct column name must appear in the select call
    expect(src).toContain('stripePaymentIntent');
    // The old wrong column name must NOT appear
    expect(src).not.toContain("'stripeSessionId, paymentIntentId, status'");
    expect(src).not.toContain('paymentSession?.paymentIntentId');
  });
});

// ── Phase 2A: Refund clawback protection ─────────────────────────────────────

describe('create-refund – Phase 2A refund clawback (explicit transfer reversal)', () => {
  it('source code calls stripe.transfers.createReversal for explicit transfer clawback', async () => {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const src = readFileSync(resolve(__dirname, '../create-refund.ts'), 'utf-8');

    // The explicit reversal call must appear
    expect(src).toContain('transfers.createReversal');
    // The payout record must be looked up by orderId and status='paid'
    expect(src).toContain("eq('orderId', orderId)");
    expect(src).toContain("eq('status', 'paid')");
    // The old no-op flag must NOT be present (it gave false confidence)
    expect(src).not.toContain('reverse_transfer: true');
  });
});

// ── Phase 2A: Payout delay for connected accounts ────────────────────────────

describe('handleConnectAccountUpdated – Phase 2A payout delay', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  /**
   * Creates a minimal Supabase mock for handleConnectAccountUpdated.
   * The function updates seller_profiles and optionally reads users.
   * tryAutoActivateSeller is lazily imported — we mock that module too.
   */
  function makeWebhookSupabaseMock(opts: {
    sellerProfilesUpdateData?: Array<{ userId: string }>;
    sellerProfilesUpdateError?: Error | null;
  } = {}) {
    const {
      sellerProfilesUpdateData = [{ userId: 'seller-1' }],
      sellerProfilesUpdateError = null,
    } = opts;

    return {
      createClient: vi.fn(() => ({
        from: vi.fn((table: string) => {
          if (table === 'seller_profiles') {
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockResolvedValue({
                data: sellerProfilesUpdateError ? null : sellerProfilesUpdateData,
                error: sellerProfilesUpdateError ?? null,
              }),
            };
          }
          // users table (looked up when firstActivation is true)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }),
      })),
    };
  }

  it('Test P2A-1: sets 7-day payout delay when seller becomes active', async () => {
    const mockAccountsUpdate = vi.fn().mockResolvedValue({});

    vi.doMock('@supabase/supabase-js', () => makeWebhookSupabaseMock());
    // Mock the lazy sellerActivation import used inside handleConnectAccountUpdated
    vi.doMock('../_shared/sellerActivation', () => ({
      tryAutoActivateSeller: vi.fn().mockResolvedValue(null),
    }));

    const { handleConnectAccountUpdated } = await import('../stripe-webhook');

    // Inject a mock stripe client via the override parameter
    const mockStripeClient = {
      accounts: { update: mockAccountsUpdate },
    } as unknown as import('stripe').default;

    await handleConnectAccountUpdated(
      {
        id: 'acct_test_active',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      } as import('stripe').default.Account,
      mockStripeClient,
    );

    expect(mockAccountsUpdate).toHaveBeenCalledOnce();
    expect(mockAccountsUpdate).toHaveBeenCalledWith('acct_test_active', {
      settings: { payouts: { schedule: { delay_days: 7 } } },
    });
  });

  it('Test P2A-2: does NOT set payout delay when seller is still pending', async () => {
    const mockAccountsUpdate = vi.fn().mockResolvedValue({});

    vi.doMock('@supabase/supabase-js', () => makeWebhookSupabaseMock());
    vi.doMock('../_shared/sellerActivation', () => ({
      tryAutoActivateSeller: vi.fn().mockResolvedValue(null),
    }));

    const { handleConnectAccountUpdated } = await import('../stripe-webhook');

    const mockStripeClient = {
      accounts: { update: mockAccountsUpdate },
    } as unknown as import('stripe').default;

    await handleConnectAccountUpdated(
      {
        id: 'acct_test_pending',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      } as import('stripe').default.Account,
      mockStripeClient,
    );

    // delay_days should NOT be set when status is not 'active'
    expect(mockAccountsUpdate).not.toHaveBeenCalled();
  });

  it('Test P2A-3: payout delay failure is non-fatal — seller activation still proceeds', async () => {
    const mockAccountsUpdate = vi.fn().mockRejectedValue(new Error('Stripe rejected delay_days'));
    const mockAutoActivate = vi.fn().mockResolvedValue(null);

    vi.doMock('@supabase/supabase-js', () => makeWebhookSupabaseMock());
    vi.doMock('../_shared/sellerActivation', () => ({
      tryAutoActivateSeller: mockAutoActivate,
    }));

    const { handleConnectAccountUpdated } = await import('../stripe-webhook');

    const mockStripeClient = {
      accounts: { update: mockAccountsUpdate },
    } as unknown as import('stripe').default;

    // Should NOT throw even though stripe.accounts.update rejects
    await expect(
      handleConnectAccountUpdated(
        {
          id: 'acct_test_fail',
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
        } as import('stripe').default.Account,
        mockStripeClient,
      ),
    ).resolves.toBeUndefined();

    // accounts.update was attempted
    expect(mockAccountsUpdate).toHaveBeenCalledOnce();
    // Auto-activation still ran after the failure
    expect(mockAutoActivate).toHaveBeenCalledOnce();
  });
});
