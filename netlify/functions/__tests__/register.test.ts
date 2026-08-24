/**
 * Unit tests for the register Netlify function.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(body: unknown, method = 'POST'): HandlerEvent {
  return {
    httpMethod: method,
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/register',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/register',
  };
}

function mockStrictFlags(overrides: Record<string, boolean> = {}) {
  vi.doMock('../_shared/platformFlags', () => ({
    getFeatureFlagsStrict: vi.fn().mockResolvedValue({
      sellerRegistration: true,
      buyerRegistration: true,
      rfqSystem: false,
      reviewSystem: true,
      autoApproveProducts: false,
      requireCompanyApproval: false,
      ...overrides,
    }),
  }));
}

describe('register handler – Stage 2 boundary', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
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

  it('returns 405 for non-POST requests', async () => {
    const { handler } = await import('../register');
    const res = await handler(makeEvent({}, 'GET'), {} as never);
    expect(res.statusCode).toBe(405);
  });

  it('returns 503 when env vars are missing', async () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { handler } = await import('../register');
    const res = await handler(makeEvent({}), {} as never);
    expect(res.statusCode).toBe(503);
  });

  it('returns 400 for invalid JSON body', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    const { handler } = await import('../register');
    const event = makeEvent({});
    event.body = 'not-json';
    const res = await handler(event, {} as never);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    const { handler } = await import('../register');
    const res = await handler(makeEvent({ email: 'a@b.com' }), {} as never);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/missing required/i);
  });

  it('returns 400 for invalid role', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'a@b.com', password: 'secret123', firstName: 'Jane', lastName: 'Doe', role: 'hacker' }),
      {} as never,
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/invalid role/i);
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'a@b.com', password: '123', firstName: 'Jane', lastName: 'Doe', role: 'buyer' }),
      {} as never,
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/at least 8/i);
  });

  it('requires a valid legal type for Marketplace Seller registration', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'seller@b.com', password: 'secret123', firstName: 'Jane', lastName: 'Doe', role: 'seller' }),
      {} as never,
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/legal type/i);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        rpc: vi.fn().mockResolvedValue({
          data: { attempts: 11, exceeded: true },
          error: null,
        }),
      })),
    }));
    const eventWithIp = makeEvent({
      email: 'a@b.com',
      password: 'secret123',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'buyer',
    });
    eventWithIp.headers = { 'x-forwarded-for': '1.2.3.4' };
    const { handler } = await import('../register');
    const res = await handler(eventWithIp, {} as never);
    expect(res.statusCode).toBe(429);
    expect(JSON.parse(res.body as string).error).toMatch(/too many/i);
  });

  it('fails closed when registration availability cannot be verified', async () => {
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
    vi.doMock('../_shared/platformFlags', () => ({
      getFeatureFlagsStrict: vi.fn().mockRejectedValue(new Error('settings unavailable')),
    }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'a@b.com', password: 'secret123', firstName: 'Jane', lastName: 'Doe', role: 'buyer' }),
      {} as never,
    );
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body as string).error).toMatch(/could not be verified/i);
  });

  it('returns 200 on duplicate-email error from Supabase without enumeration', async () => {
    mockStrictFlags();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'User already registered' },
            }),
          },
        },
      })),
    }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'a@b.com', password: 'secret123', firstName: 'Jane', lastName: 'Doe', role: 'buyer' }),
      {} as never,
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as { message?: string; error?: string };
    expect(body.error).toBeUndefined();
    expect(body.message).toMatch(/not already in use/i);
  });

  it('returns 503 on Supabase database trigger error without leaking the internal message', async () => {
    mockStrictFlags();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Database error creating new user' },
            }),
          },
        },
      })),
    }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'a@b.com', password: 'secret123', firstName: 'Jane', lastName: 'Doe', role: 'buyer' }),
      {} as never,
    );
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body as string) as { error?: string };
    expect(body.error).not.toMatch(/database error creating/i);
    expect(body.error).toMatch(/technical issue|try again/i);
  });

  it('returns 200 on successful Buyer registration', async () => {
    mockStrictFlags();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid-123' } }, error: null }),
            generateLink: vi.fn().mockResolvedValue({
              data: { properties: { action_link: 'https://mock.supabase.co/auth/confirm?token=abc' } },
              error: null,
            }),
          },
        },
        from: vi.fn(() => ({
          insert: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    }));
    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({ email: 'new@b.com', password: 'secret123', firstName: 'Jane', lastName: 'Doe', role: 'buyer' }),
      {} as never,
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string).userId).toBe('user-uuid-123');
  });

  it('rejects an invalid optional Buyer business account type', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({})),
    }));

    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({
        email: 'buyer@b.com',
        password: 'secret123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'buyer',
        customerType: 'supplier',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body as string).error).toMatch(/buyer account type/i);
  });

  it('persists an explicitly requested Buyer business profile before returning success', async () => {
    mockStrictFlags();

    const usersInsert = vi.fn().mockResolvedValue({ error: null });
    const buyerProfileUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'buyer-business-1' } },
              error: null,
            }),
            generateLink: vi.fn().mockResolvedValue({
              data: { properties: {} },
              error: null,
            }),
            deleteUser: vi.fn(),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') return { insert: usersInsert };
          if (table === 'buyer_profiles') {
            return { upsert: buyerProfileUpsert };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    }));

    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({
        email: 'trade@b.com',
        password: 'secret123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'buyer',
        companyName: 'Example Trading Ltd',
        businessAddress: {
          line1: '1 Example Road',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'United Kingdom',
        },
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(buyerProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-business-1',
        accountType: 'business',
        companyName: 'Example Trading Ltd',
      }),
      { onConflict: 'userId' },
    );
  });

  it('fails atomically when an explicitly requested Buyer business profile cannot be persisted', async () => {
    mockStrictFlags();

    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const publicDeleteEq = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'buyer-business-bad-1' } },
              error: null,
            }),
            deleteUser,
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              delete: vi.fn().mockReturnValue({ eq: publicDeleteEq }),
            };
          }
          if (table === 'buyer_profiles') {
            return {
              upsert: vi.fn().mockResolvedValue({
                error: { message: 'business profile write failed' },
              }),
            };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    }));

    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({
        email: 'trade@b.com',
        password: 'secret123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'buyer',
        companyName: 'Example Trading Ltd',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body as string).error).toMatch(
      /business buyer profile/i,
    );
    expect(publicDeleteEq).toHaveBeenCalledWith(
      'id',
      'buyer-business-bad-1',
    );
    expect(deleteUser).toHaveBeenCalledWith('buyer-business-bad-1');
  });
  it('creates a new Seller as draft with an inactive store and no invented store name', async () => {
    mockStrictFlags();
    const sellerProfileUpsert = vi.fn().mockResolvedValue({ error: null });
    const sellerStoreUpsert = vi.fn().mockResolvedValue({ error: null });
    const usersInsert = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'seller-uuid-1' } }, error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser,
            generateLink: vi.fn().mockResolvedValue({ data: { properties: {} }, error: null }),
            deleteUser: vi.fn(),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') return { insert: usersInsert };
          if (table === 'seller_profiles') return { upsert: sellerProfileUpsert };
          if (table === 'seller_stores') return { upsert: sellerStoreUpsert };
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    }));

    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({
        email: 'seller@b.com',
        password: 'secret123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'seller',
        sellerType: 'sole_trader',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(200);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ app_metadata: { role: 'seller' } }));
    expect(sellerProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'seller-uuid-1',
        sellerType: 'sole_trader',
        sellerStatus: 'draft',
        isApproved: false,
      }),
      { onConflict: 'userId' },
    );
    const profilePayload = sellerProfileUpsert.mock.calls[0][0] as Record<string, unknown>;
    expect(profilePayload.storeName).toBeUndefined();
    expect(sellerStoreUpsert).toHaveBeenCalledWith(
      { userId: 'seller-uuid-1', isActive: false },
      { onConflict: 'userId' },
    );
  });

  it('cleans up a newly-created account if essential Seller provisioning fails', async () => {
    mockStrictFlags();
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const publicDeleteEq = vi.fn().mockResolvedValue({ error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'seller-bad-1' } }, error: null }),
            deleteUser,
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              delete: vi.fn().mockReturnValue({ eq: publicDeleteEq }),
            };
          }
          if (table === 'seller_profiles') {
            return { upsert: vi.fn().mockResolvedValue({ error: { message: 'profile write failed' } }) };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      })),
    }));

    const { handler } = await import('../register');
    const res = await handler(
      makeEvent({
        email: 'seller@b.com',
        password: 'secret123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'seller',
        sellerType: 'company',
      }),
      {} as never,
    );

    expect(res.statusCode).toBe(500);
    expect(publicDeleteEq).toHaveBeenCalledWith('id', 'seller-bad-1');
    expect(deleteUser).toHaveBeenCalledWith('seller-bad-1');
  });
});
