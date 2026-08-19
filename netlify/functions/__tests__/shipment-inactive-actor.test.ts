import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';

function makeEvent(method: string, path: string, body: unknown = {}): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer valid-but-suspended-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: `http://localhost${path}`,
  };
}

function installInactiveActorMock() {
  const rpc = vi.fn();
  const storageFrom = vi.fn();
  const from = vi.fn((table: string) => {
    if (table !== 'users') {
      throw new Error(`Inactive actor reached protected service-role table: ${table}`);
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: ACTOR_ID, role: 'seller', isActive: false },
        error: null,
      }),
    };
  });

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: ACTOR_ID } },
        error: null,
      }),
    },
    from,
    rpc,
    storage: { from: storageFrom },
  };

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => client),
  }));
  vi.doMock('../_shared/rateLimiter', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({ exceeded: false }),
  }));
  vi.doMock('../_shared/orderTransitionGuards', () => ({
    enforcePaymentBackedTransition: vi.fn().mockResolvedValue({ ok: true }),
  }));

  return { rpc, storageFrom, from };
}

describe('shipment boundaries reject inactive actors before service-role mutation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    process.env.URL = 'https://test.example';
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('blocks create-shipment before the canonical mutation RPC', async () => {
    const mocks = installInactiveActorMock();
    const { handler } = await import('../create-shipment');

    const res = await handler(
      makeEvent('POST', '/.netlify/functions/create-shipment', { order_id: 'order-1' }),
      {} as never,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('suspended');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it('blocks update-shipment-status before the canonical transition RPC', async () => {
    const mocks = installInactiveActorMock();
    const { handler } = await import('../update-shipment-status');

    const res = await handler(
      makeEvent('PUT', '/.netlify/functions/shipments/shipment-1/status', { status: 'Delivered' }),
      {} as never,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('suspended');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it('blocks proof-of-delivery before shipment access or private Storage access', async () => {
    const mocks = installInactiveActorMock();
    const { handler } = await import('../upload-proof-of-delivery');

    const res = await handler(
      makeEvent('POST', '/.netlify/functions/shipments/shipment-1/proof', {
        contentType: 'image/jpeg',
        fileSize: 1024,
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('suspended');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.storageFrom).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});