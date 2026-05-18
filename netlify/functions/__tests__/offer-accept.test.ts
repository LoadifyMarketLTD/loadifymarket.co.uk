import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

function makeEvent(options: {
  path: '/.netlify/functions/offer-accept' | '/.netlify/functions/offer-decline' | '/.netlify/functions/offer-counter';
  body: unknown;
  method?: string;
  headers?: Record<string, string>;
}): HandlerEvent {
  return {
    httpMethod: options.method ?? 'POST',
    body: JSON.stringify(options.body),
    headers: options.headers ?? { authorization: 'Bearer valid-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: options.path,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: `http://localhost${options.path}`,
  };
}

function makeSupabaseMock(options?: {
  userId?: string;
  authError?: { message: string } | null;
  rpcData?: unknown;
  rpcError?: { message?: string; code?: string; details?: string; hint?: string } | null;
}) {
  const opts = options ?? {};

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.authError ? null : { id: opts.userId ?? 'seller-1' } },
        error: opts.authError ?? null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: opts.rpcData ?? {
        ok: true,
        offerId: 'offer-1',
        status: 'accepted',
        orderId: 'order-1',
        alreadyDone: false,
      },
      error: opts.rpcError ?? null,
    }),
  };
}

describe('offer action handlers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env = {
      ...originalEnv,
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJ-service-role-key-with-length',
    };
  });

  it('accept success returns stable JSON', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: {
          ok: true,
          offerId: 'offer-acc-1',
          status: 'accepted',
          orderId: 'order-acc-1',
          alreadyDone: false,
        },
      }),
    );

    const { handler } = await import('../offer-accept');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-accept', body: { offerId: 'offer-acc-1' } }),
      {} as never,
    );

    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response!.body)).toEqual({
      ok: true,
      offerId: 'offer-acc-1',
      status: 'accepted',
      orderId: 'order-acc-1',
      alreadyDone: false,
    });
  });

  it('decline success returns stable JSON', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: {
          ok: true,
          offerId: 'offer-dec-1',
          status: 'declined',
          orderId: null,
          alreadyDone: false,
        },
      }),
    );

    const { handler } = await import('../offer-decline');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-decline', body: { offerId: 'offer-dec-1' } }),
      {} as never,
    );

    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response!.body)).toEqual({
      ok: true,
      offerId: 'offer-dec-1',
      status: 'declined',
      orderId: null,
      alreadyDone: false,
    });
  });

  it('counter success returns stable JSON', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: {
          ok: true,
          offerId: 'offer-counter-1',
          status: 'pending',
          orderId: null,
          alreadyDone: false,
        },
      }),
    );

    const { handler } = await import('../offer-counter');
    const response = await handler(
      makeEvent({
        path: '/.netlify/functions/offer-counter',
        body: { offerId: 'offer-original-1', amountPence: 2599 },
      }),
      {} as never,
    );

    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response!.body)).toEqual({
      ok: true,
      offerId: 'offer-counter-1',
      status: 'pending',
      orderId: null,
      alreadyDone: false,
    });
  });

  it('returns 400 for invalid offerId payload', async () => {
    createClientMock.mockReturnValue(makeSupabaseMock());

    const { handler } = await import('../offer-accept');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-accept', body: {} }),
      {} as never,
    );

    expect(response?.statusCode).toBe(400);
    expect(JSON.parse(response!.body)).toEqual({
      error: 'Invalid request body',
      details: 'offerId is required',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    createClientMock.mockReturnValue(makeSupabaseMock());

    const { handler } = await import('../offer-decline');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-decline', body: { offerId: 'offer-1' }, headers: {} }),
      {} as never,
    );

    expect(response?.statusCode).toBe(401);
    expect(JSON.parse(response!.body)).toEqual({
      error: 'Authentication required',
      details: 'Missing bearer token',
    });
  });

  it('returns 403 for non-participant actor from RPC', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: null,
        rpcError: {
          code: 'P0001',
          message: 'not_participant',
        },
      }),
    );

    const { handler } = await import('../offer-counter');
    const response = await handler(
      makeEvent({
        path: '/.netlify/functions/offer-counter',
        body: { offerId: 'offer-1', amountPence: 3000 },
      }),
      {} as never,
    );

    expect(response?.statusCode).toBe(403);
    expect(JSON.parse(response!.body)).toEqual({
      error: 'Failed to counter offer',
      details: 'P0001: not_participant',
    });
  });

  it('returns alreadyDone payload for already accepted/declined offers', async () => {
    createClientMock
      .mockReturnValueOnce(
        makeSupabaseMock({
          rpcData: {
            ok: true,
            offerId: 'offer-a',
            status: 'accepted',
            orderId: 'order-a',
            alreadyDone: true,
          },
        }),
      )
      .mockReturnValueOnce(
        makeSupabaseMock({
          rpcData: {
            ok: true,
            offerId: 'offer-d',
            status: 'declined',
            orderId: null,
            alreadyDone: true,
          },
        }),
      );

    const { handler: acceptHandler } = await import('../offer-accept');
    const acceptResponse = await acceptHandler(
      makeEvent({ path: '/.netlify/functions/offer-accept', body: { offerId: 'offer-a' } }),
      {} as never,
    );

    const { handler: declineHandler } = await import('../offer-decline');
    const declineResponse = await declineHandler(
      makeEvent({ path: '/.netlify/functions/offer-decline', body: { offerId: 'offer-d' } }),
      {} as never,
    );

    expect(acceptResponse?.statusCode).toBe(200);
    expect(JSON.parse(acceptResponse!.body).alreadyDone).toBe(true);
    expect(declineResponse?.statusCode).toBe(200);
    expect(JSON.parse(declineResponse!.body).alreadyDone).toBe(true);
  });

  it('returns JSON 500 (not 502) for unexpected RPC failures', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: null,
        rpcError: {
          code: 'XX000',
          message: 'unexpected_backend_failure',
        },
      }),
    );

    const { handler } = await import('../offer-accept');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-accept', body: { offerId: 'offer-1' } }),
      {} as never,
    );

    expect(response?.statusCode).toBe(500);
    expect(JSON.parse(response!.body)).toEqual({
      error: 'Failed to accept offer',
      details: 'XX000: unexpected_backend_failure',
    });
  });

  it('accepts legacy migration-590 payload shape', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: {
          order_id: 'order-legacy-1',
          already_done: false,
        },
      }),
    );

    const { handler } = await import('../offer-accept');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-accept', body: { offerId: 'offer-legacy-1' } }),
      {} as never,
    );

    expect(response?.statusCode).toBe(200);
    expect(JSON.parse(response!.body)).toEqual({
      ok: true,
      offerId: 'offer-legacy-1',
      status: 'accepted',
      orderId: 'order-legacy-1',
      alreadyDone: false,
    });
  });

  it('maps offer_not_pending to 409 conflict', async () => {
    createClientMock.mockReturnValue(
      makeSupabaseMock({
        rpcData: null,
        rpcError: {
          code: 'P0001',
          message: 'offer_not_pending: countered',
        },
      }),
    );

    const { handler } = await import('../offer-accept');
    const response = await handler(
      makeEvent({ path: '/.netlify/functions/offer-accept', body: { offerId: 'offer-1' } }),
      {} as never,
    );

    expect(response?.statusCode).toBe(409);
    expect(JSON.parse(response!.body)).toEqual({
      error: 'Failed to accept offer',
      details: 'P0001: offer_not_pending: countered',
    });
  });
});
