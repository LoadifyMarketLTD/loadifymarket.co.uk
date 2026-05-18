import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const createClientMock = vi.fn();
const sendPushToUserMock = vi.fn();
const checkRateLimitMock = vi.fn();
const expireStaleOffersMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

vi.mock('../_shared/pushNotifications', () => ({
  sendPushToUser: sendPushToUserMock,
}));

vi.mock('../_shared/rateLimiter', () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock('../_shared/offerLifecycle', () => ({
  expireStaleOffers: expireStaleOffersMock,
}));

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
    path: '/.netlify/functions/offer-accept',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/offer-accept',
  };
}

function chainMaybeSingle<T>(result: Promise<{ data: T; error: unknown }> | { data: T; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function makeSupabaseMock(options?: {
  rpcResult?: unknown;
  rpcError?: { message?: string; code?: string } | null;
  productLookupThrows?: boolean;
  notificationError?: { message: string } | null;
}) {
  const opts = options ?? {};
  const offer = {
    id: 'offer-1',
    conversationId: 'conv-1',
    listingId: 'listing-1',
    proposedById: 'buyer-1',
    recipientId: 'seller-1',
    amountPence: 2599,
    status: 'pending',
    expiresAt: null,
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'seller-1' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'offers') {
        return chainMaybeSingle({ data: offer, error: null });
      }

      if (table === 'products') {
        if (opts.productLookupThrows) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockRejectedValue(new Error('product lookup failed')),
          };
        }

        return chainMaybeSingle({
          data: { title: 'Test listing', sellerId: 'seller-1' },
          error: null,
        });
      }

      if (table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: opts.notificationError ?? null }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
      };
    }),
    rpc: vi.fn((fn: string) => {
      if (fn === 'release_stale_unpaid_listing_locks') {
        return Promise.resolve({ data: null, error: null });
      }

      if (fn === 'accept_offer') {
        return Promise.resolve({ data: opts.rpcResult ?? { order_id: 'order-1', already_done: false }, error: opts.rpcError ?? null });
      }

      return Promise.resolve({ data: null, error: null });
    }),
  };
}

describe('offer-accept handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env = {
      ...originalEnv,
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJ-service-role-key',
    };

    checkRateLimitMock.mockResolvedValue({ exceeded: false, attempts: 1 });
    expireStaleOffersMock.mockResolvedValue([]);
    sendPushToUserMock.mockResolvedValue(undefined);
  });

  it('returns JSON misconfiguration errors for invalid database env', async () => {
    process.env.VITE_SUPABASE_URL = 'not-a-url';

    const { handler } = await import('../offer-accept');
    const response = await handler(makeEvent({ offerId: 'offer-1' }), {} as never);

    expect(response?.statusCode).toBe(500);
    expect(JSON.parse(response!.body)).toEqual({ error: 'Database configuration is invalid' });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('accepts nested RPC payloads and returns success JSON', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcResult: { accept_offer: { order_id: 'order-123', already_done: false } },
      }),
    );

    const { handler } = await import('../offer-accept');
    const response = await handler(makeEvent({ offerId: 'offer-1' }), {} as never);

    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response!.body)).toEqual({ orderId: 'order-123', alreadyDone: false });
  });

  it('keeps post-accept notification failures non-fatal', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcResult: { order_id: 'order-456', already_done: false },
        productLookupThrows: true,
      }),
    );

    const { handler } = await import('../offer-accept');
    const response = await handler(makeEvent({ offerId: 'offer-1' }), {} as never);

    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response!.body)).toEqual({ orderId: 'order-456', alreadyDone: false });
  });
});
