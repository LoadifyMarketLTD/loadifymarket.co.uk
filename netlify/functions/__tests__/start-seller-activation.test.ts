import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

function makeEvent(method = 'POST'): HandlerEvent {
  return {
    httpMethod: method,
    body: '{}',
    headers: { authorization: 'Bearer test-token' },
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/start-seller-activation',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/start-seller-activation',
  };
}

describe('start-seller-activation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns 204 for OPTIONS', async () => {
    const { handler } = await import('../start-seller-activation');
    const res = await handler(makeEvent('OPTIONS'), {} as never);
    expect(res.statusCode).toBe(204);
  });

  it('rejects inactive/unauthenticated actor before the DB RPC', async () => {
    const rpc = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    }));

    const { handler } = await import('../start-seller-activation');
    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects admin self-service activation', async () => {
    const rpc = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'admin-1', role: 'admin', email: 'admin@example.com', appMetadata: {} },
      }),
    }));

    const { handler } = await import('../start-seller-activation');
    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('honours the seller-registration feature flag', async () => {
    const rpc = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'buyer-1', role: 'buyer', email: 'buyer@example.com', appMetadata: {} },
      }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      getFeatureFlags: vi.fn().mockResolvedValue({ sellerRegistration: false }),
    }));

    const { handler } = await import('../start-seller-activation');
    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when Seller registration availability cannot be verified', async () => {
    const rpc = vi.fn();
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: { id: 'buyer-1', role: 'buyer', email: 'buyer@example.com', appMetadata: {} },
      }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      getFeatureFlags: vi.fn().mockRejectedValue(new Error('platform settings unavailable')),
    }));

    const { handler } = await import('../start-seller-activation');
    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error).toContain('could not be verified');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('starts Seller activation for the authenticated actor only', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, sellerStatus: 'draft', createdSellerProfile: true },
      error: null,
    });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({ rpc })),
    }));
    vi.doMock('../_shared/activeAccountAuth', () => ({
      authenticateActiveAccount: vi.fn().mockResolvedValue({
        ok: true,
        actor: {
          id: 'buyer-1',
          role: 'buyer',
          email: 'buyer@example.com',
          appMetadata: { provider: 'email' },
        },
      }),
    }));
    vi.doMock('../_shared/platformFlags', () => ({
      getFeatureFlags: vi.fn().mockResolvedValue({ sellerRegistration: true }),
    }));

    const { handler } = await import('../start-seller-activation');
    const res = await handler(makeEvent(), {} as never);

    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith('server_start_seller_activation_v1', {
      p_user_id: 'buyer-1',
    });
    expect(JSON.parse(res.body)).toMatchObject({
      ok: true,
      role: 'seller',
      sellerStatus: 'draft',
      createdSellerProfile: true,
    });
  });
});