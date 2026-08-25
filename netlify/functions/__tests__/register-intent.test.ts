import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();

const createClient = vi.fn(() => ({
  rpc,
}));

const checkRateLimit = vi.fn();
const getClientIp = vi.fn();
const getFeatureFlagsStrict = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient,
}));

vi.mock('../_shared/rateLimiter', () => ({
  checkRateLimit,
}));

vi.mock('../_shared/getClientIp', () => ({
  getClientIp,
}));

vi.mock('../_shared/platformFlags', () => ({
  getFeatureFlagsStrict,
}));

const makeEvent = (
  body: Record<string, unknown>,
  method = 'POST',
) =>
  ({
    httpMethod: method,
    body: JSON.stringify(body),
    headers: {},
  }) as never;

describe('register-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

    getClientIp.mockReturnValue('203.0.113.10');

    checkRateLimit.mockResolvedValue({
      exceeded: false,
      remaining: 9,
    });

    getFeatureFlagsStrict.mockResolvedValue({
      buyerRegistration: true,
      sellerRegistration: true,
    });

    rpc.mockResolvedValue({
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          expires_at: '2026-08-25T20:30:00.000Z',
        },
      ],
      error: null,
    });
  });

  it('rejects non-POST methods', async () => {
    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({}, 'GET'),
      {} as never,
    );

    expect(result?.statusCode).toBe(405);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects invalid requested roles', async () => {
    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'admin',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('requires seller legal type', async () => {
    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'seller@example.com',
        firstName: 'Test',
        lastName: 'Seller',
        requestedRole: 'seller',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects seller identity on buyer intent', async () => {
    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'buyer',
        sellerType: 'company',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when registration flags cannot be read', async () => {
    getFeatureFlagsStrict.mockRejectedValue(
      new Error('flags unavailable'),
    );

    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'buyer',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('respects disabled buyer registration', async () => {
    getFeatureFlagsStrict.mockResolvedValue({
      buyerRegistration: false,
      sellerRegistration: true,
    });

    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'buyer',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('respects disabled seller registration', async () => {
    getFeatureFlagsStrict.mockResolvedValue({
      buyerRegistration: true,
      sellerRegistration: false,
    });

    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'seller@example.com',
        firstName: 'Test',
        lastName: 'Seller',
        requestedRole: 'seller',
        sellerType: 'individual',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rate-limits before creating the intent', async () => {
    checkRateLimit.mockResolvedValue({
      exceeded: true,
      remaining: 0,
    });

    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'buyer',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(429);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('normalizes email and uses only the server RPC boundary', async () => {
    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: '  Buyer@Example.COM ',
        firstName: ' Test ',
        lastName: ' Buyer ',
        requestedRole: 'buyer',
        customerType: 'individual',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(201);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'create_signup_intent',
      expect.objectContaining({
        p_email: 'buyer@example.com',
        p_requested_role: 'buyer',
        p_first_name: 'Test',
        p_last_name: 'Buyer',
        p_seller_type: null,
        p_customer_type: 'individual',
      }),
    );

    const payload = JSON.parse(result?.body ?? '{}');

    expect(payload.intentId).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('creates seller intent without granting authorization metadata', async () => {
    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'seller@example.com',
        firstName: 'Test',
        lastName: 'Seller',
        requestedRole: 'seller',
        sellerType: 'company',
        companyName: 'Example Ltd',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(201);

    const params = rpc.mock.calls[0]?.[1];

    expect(params.p_requested_role).toBe('seller');
    expect(params.p_seller_type).toBe('company');

    const serialized = JSON.stringify(params);

    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('app_metadata');
    expect(serialized).not.toContain('service-role-test');
  });

  it('fails closed when RPC persistence fails', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'database unavailable' },
    });

    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'buyer',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(503);
  });

  it('fails closed on unexpected RPC result cardinality', async () => {
    rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    const { handler } = await import('../register-intent');

    const result = await handler(
      makeEvent({
        email: 'buyer@example.com',
        firstName: 'Test',
        lastName: 'Buyer',
        requestedRole: 'buyer',
      }),
      {} as never,
    );

    expect(result?.statusCode).toBe(503);
  });
});
