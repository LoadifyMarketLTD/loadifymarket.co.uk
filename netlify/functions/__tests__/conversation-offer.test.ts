/**
 * Unit tests for the conversation-offer Netlify function.
 *
 * Focus areas:
 *  1. Orphan pending offer auto-recovery (offer exists but no matching message)
 *  2. Message insert failure → offer rollback → 500
 *  3. Notification insert failure → message + offer rollback → 500
 *  4. Non-orphan pending offer: Option A – still inserts message + notification, returns 200
 *  5. Message insert failure for existing offer → 500, but existing offer is NOT rolled back
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(
  body: unknown,
  method = 'POST',
  headers: Record<string, string> = { authorization: 'Bearer valid-token' },
): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers,
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/conversation-offer',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/conversation-offer',
  };
}

const CONV_ID = 'conv-aaaa-bbbb-cccc-ddddeeeeeeee';
const OFFER_ID = 'offer-1111-2222-3333-444455556666';
const ORPHAN_OFFER_ID = 'orphan-1111-2222-3333-4444eeeeeeee';
const LISTING_ID = 'listing-aaaa-bbbb-cccc-ddddeeeeeeee';
const BUYER_ID = 'buyer-user-id-here';
const SELLER_ID = 'seller-user-id-here';
const MSG_ID = 'msg-aaaa-bbbb-cccc-ddddeeeeeeee';

const validBody = { conversationId: CONV_ID, amountPence: 1000 };

/** Build a supabase mock where each .from(table) call returns a fluent stub. */
function makeSupabaseMock(opts: {
  pendingOffer?: { id: string; amountPence: number } | null;
  orphanMessageRows?: { id: string }[];
  offerInsertError?: string | null;
  messageInsertError?: string | null;
  notificationInsertError?: string | null;
  messageRollbackError?: string | null;
}) {
  const {
    pendingOffer = null,
    orphanMessageRows = [],
    offerInsertError = null,
    messageInsertError = null,
    notificationInsertError = null,
  } = opts;

  // Track delete calls so tests can assert on them.
  const deletedOfferIds: string[] = [];
  const deletedMessageIds: string[] = [];

  // Build per-call state for offers.delete – called in different rollback paths.
  const offerDeleteMock = vi.fn().mockImplementation(() => {
    return {
      eq: vi.fn().mockImplementation((_col: string, val: string) => {
        deletedOfferIds.push(val);
        return Promise.resolve({ error: null });
      }),
    };
  });

  const messageDeleteMock = vi.fn().mockImplementation(() => {
    return {
      eq: vi.fn().mockImplementation((_col: string, val: string) => {
        deletedMessageIds.push(val);
        return Promise.resolve({ error: null });
      }),
    };
  });

  // Track how many times offers.insert was called.
  let offerInsertCount = 0;

  const mock = {
    deletedOfferIds,
    deletedMessageIds,
    get offerInsertCount() { return offerInsertCount; },
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: BUYER_ID, email: 'buyer@test.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        // ── conversations ──────────────────────────────────────────────────────
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: CONV_ID,
                user1Id: SELLER_ID,
                user2Id: BUYER_ID,
                productId: LISTING_ID,
                subject: null,
              },
              error: null,
            }),
          };
        }
        // ── products ───────────────────────────────────────────────────────────
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: LISTING_ID,
                title: 'Test Product',
                sellerId: SELLER_ID,
                listingStatus: 'active',
                listingContext: 'product',
              },
              error: null,
            }),
          };
        }
        // ── offers ─────────────────────────────────────────────────────────────
        if (table === 'offers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // Pending-offer check returns the configured value.
            maybeSingle: vi.fn().mockResolvedValue({
              data: pendingOffer,
              error: null,
            }),
            insert: vi.fn().mockImplementation(() => {
              offerInsertCount++;
              const insertResult = offerInsertError
                ? { data: null, error: { code: '500', message: offerInsertError } }
                : { data: { id: OFFER_ID }, error: null };
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue(insertResult),
              };
            }),
            delete: offerDeleteMock,
          };
        }
        // ── messages ───────────────────────────────────────────────────────────
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            like: vi.fn().mockReturnThis(),
            // limit() terminates the orphan-check chain; must return a real Promise.
            limit: vi.fn().mockResolvedValue({ data: orphanMessageRows, error: null }),
            insert: vi.fn().mockImplementation(() => {
              const insertResult = messageInsertError
                ? { data: null, error: { code: '500', message: messageInsertError } }
                : { data: { id: MSG_ID }, error: null };
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue(insertResult),
              };
            }),
            delete: messageDeleteMock,
          };
        }
        // ── notifications ─────────────────────────────────────────────────────
        if (table === 'notifications') {
          const notifResult = notificationInsertError
            ? { data: null, error: { code: '500', message: notificationInsertError } }
            : { data: { id: 'notif-id-1' }, error: null };
          return {
            insert: vi.fn().mockImplementation(() => ({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue(notifResult),
            })),
          };
        }
        // ── users ─────────────────────────────────────────────────────────────
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: SELLER_ID, email: 'seller@test.com', role: 'seller', firstName: 'Seller', lastName: 'Test' },
              error: null,
            }),
          };
        }
        // ── notification_settings ─────────────────────────────────────────────
        if (table === 'notification_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { orderConfirmation: true }, error: null }),
          };
        }
        // ── rate limit table ───────────────────────────────────────────────────
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
        };
      }),
    },
  };

  return mock;
}

describe('conversation-offer handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    process.env.URL = 'https://loadifymarket.co.uk';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn().mockResolvedValue({}),
      } as unknown),
    );

    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ── Basic guards ─────────────────────────────────────────────────────────────
  it('returns 405 for non-POST requests', async () => {
    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent({}, 'GET'), {} as never);
    expect(res!.statusCode).toBe(405);
  });

  it('returns 500 when env vars are missing', async () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res!.statusCode).toBe(500);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody, 'POST', {}), {} as never);
    expect(res!.statusCode).toBe(401);
  });

  // ── Non-orphan pending offer (Option A) ──────────────────────────────────────
  it('returns 200 with existing offerId and still notifies seller when non-orphan pending offer exists', async () => {
    const mock = makeSupabaseMock({
      pendingOffer: { id: OFFER_ID, amountPence: 1000 },
      // Message exists for the pending offer → not an orphan
      orphanMessageRows: [{ id: MSG_ID }],
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mock.client),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/offerLifecycle', () => ({
      expireStaleOffers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('../_shared/offerLinks', () => ({
      buildOfferLink: vi.fn().mockReturnValue('/offer-link'),
      buildOfferPushData: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('../_shared/pushNotifications', () => ({
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    }));

    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody), {} as never);
    // Option A: must succeed and return the existing offer id
    expect(res!.statusCode).toBe(200);
    const body = JSON.parse(res!.body as string);
    expect(body.offerId).toBe(OFFER_ID);
    // No new offer row must have been inserted
    expect(mock.offerInsertCount).toBe(0);
    // Existing offer must NOT have been deleted
    expect(mock.deletedOfferIds).toHaveLength(0);
  });

  // ── Message insert failure for existing offer ─────────────────────────────
  it('returns 500 on message failure for existing offer but does NOT roll back the existing offer', async () => {
    const mock = makeSupabaseMock({
      pendingOffer: { id: OFFER_ID, amountPence: 1000 },
      orphanMessageRows: [{ id: MSG_ID }],
      messageInsertError: 'simulated message insert failure',
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mock.client),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/offerLifecycle', () => ({
      expireStaleOffers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('../_shared/offerLinks', () => ({
      buildOfferLink: vi.fn().mockReturnValue('/offer-link'),
      buildOfferPushData: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('../_shared/pushNotifications', () => ({
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    }));

    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res!.statusCode).toBe(500);
    expect(JSON.parse(res!.body as string).error).toMatch(/offer chat message/i);
    // The pre-existing offer must NOT have been deleted
    expect(mock.deletedOfferIds).toHaveLength(0);
  });

  // ── Orphan offer auto-recovery ────────────────────────────────────────────────
  it('auto-recovers from an orphan pending offer (no matching message) and returns 200', async () => {
    const mock = makeSupabaseMock({
      pendingOffer: { id: ORPHAN_OFFER_ID, amountPence: 500 },
      // No message exists for the orphan offer.
      orphanMessageRows: [],
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mock.client),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/offerLifecycle', () => ({
      expireStaleOffers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('../_shared/offerLinks', () => ({
      buildOfferLink: vi.fn().mockReturnValue('/offer-link'),
      buildOfferPushData: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('../_shared/pushNotifications', () => ({
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    }));

    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res!.statusCode).toBe(200);
    const body = JSON.parse(res!.body as string);
    expect(body.offerId).toBe(OFFER_ID);
    // Orphan was deleted before the new offer was created.
    expect(mock.deletedOfferIds).toContain(ORPHAN_OFFER_ID);
  });

  // ── Message insert failure ────────────────────────────────────────────────────
  it('returns 500 and rolls back the offer when message insert fails', async () => {
    const mock = makeSupabaseMock({
      pendingOffer: null,
      messageInsertError: 'simulated message insert failure',
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mock.client),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/offerLifecycle', () => ({
      expireStaleOffers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('../_shared/offerLinks', () => ({
      buildOfferLink: vi.fn().mockReturnValue('/offer-link'),
      buildOfferPushData: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('../_shared/pushNotifications', () => ({
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    }));

    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res!.statusCode).toBe(500);
    expect(JSON.parse(res!.body as string).error).toMatch(/offer chat message/i);
    // The newly created offer must have been rolled back.
    expect(mock.deletedOfferIds).toContain(OFFER_ID);
  });

  // ── Notification insert failure ───────────────────────────────────────────────
  it('returns 500 and rolls back both offer and message when notification insert fails', async () => {
    const mock = makeSupabaseMock({
      pendingOffer: null,
      notificationInsertError: 'simulated notification insert failure',
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mock.client),
    }));
    vi.doMock('../_shared/rateLimiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
    }));
    vi.doMock('../_shared/offerLifecycle', () => ({
      expireStaleOffers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock('../_shared/offerLinks', () => ({
      buildOfferLink: vi.fn().mockReturnValue('/offer-link'),
      buildOfferPushData: vi.fn().mockReturnValue({}),
    }));
    vi.doMock('../_shared/pushNotifications', () => ({
      sendPushToUser: vi.fn().mockResolvedValue(undefined),
    }));

    const { handler } = await import('../conversation-offer');
    const res = await handler(makeEvent(validBody), {} as never);
    expect(res!.statusCode).toBe(500);
    expect(JSON.parse(res!.body as string).error).toMatch(/notification/i);
    // Both offer and message must have been rolled back.
    expect(mock.deletedOfferIds).toContain(OFFER_ID);
    expect(mock.deletedMessageIds).toContain(MSG_ID);
  });
});
