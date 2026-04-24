/**
 * Unit tests for the register Netlify function.
 *
 * Strategy: import the handler directly and inject a mock Supabase client
 * via the environment-variable pathway the function uses. The tests focus on
 * the request-validation paths that do *not* require a real database, which
 * makes them fast and deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

// Build a minimal HandlerEvent for POST requests.
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

describe('register handler – request validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Provide required env vars so the function passes the env check.
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.resetModules();
  });

  afterEach(() => {
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
    const { handler } = await import('../register');
    // Mock createClient so the function doesn't actually call Supabase.
    vi.doMock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
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

  it('returns 429 when rate limit is exceeded', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'rl-row', attempts: 10 },
                  error: null,
                }),
              })),
            })),
          })),
        })),
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

  it('returns 200 on duplicate-email error from Supabase (no enumeration)', async () => {
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
    // Returns 200 to prevent user enumeration (OWASP ASVS 2.7.4).
    // The response body uses a 'message' field (not 'error') — 200 responses
    // should not carry an error field per HTTP semantics.
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string) as { message?: string; error?: string };
    expect(body.error).toBeUndefined();
    expect(body.message).toMatch(/not already in use/i);
  });

  it('returns 503 on Supabase database trigger error (never exposes internal message)', async () => {
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
    // Raw Supabase internal message must not leak to the client.
    expect(body.error).not.toMatch(/database error creating/i);
    expect(body.error).toMatch(/technical issue|try again/i);
  });

  it('returns 200 on successful registration', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: 'user-uuid-123' } },
              error: null,
            }),
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
});
