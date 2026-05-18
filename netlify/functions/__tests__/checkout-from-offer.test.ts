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
});
