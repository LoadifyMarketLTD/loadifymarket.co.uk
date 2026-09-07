import { describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  authenticateActiveAccount,
  authenticateActiveCapability,
  authenticateSellerCapabilityOrAdmin,
} from '../_shared/activeAccountAuth';

function event(token?: string): HandlerEvent {
  return {
    httpMethod: 'POST',
    body: '{}',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    path: '/.netlify/functions/test',
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: 'http://localhost/.netlify/functions/test',
  };
}

function client(options: {
  authUser?: { id: string; email?: string | null; app_metadata?: Record<string, unknown> } | null;
  authError?: unknown;
  account?: { id: string; role: string; isActive: boolean } | null;
  accountError?: unknown;
  capability?: 'buyer' | 'seller' | null;
  capabilityError?: unknown;
}) {
  const accountMaybeSingle = vi.fn().mockResolvedValue({
    data: options.account ?? null,
    error: options.accountError ?? null,
  });
  const capabilityMaybeSingle = vi.fn().mockResolvedValue({
    data: options.capability ? { capability: options.capability } : null,
    error: options.capabilityError ?? null,
  });
  const from = vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: table === 'account_capabilities' ? capabilityMaybeSingle : accountMaybeSingle,
  }));
  const getUser = vi.fn().mockResolvedValue({
    data: { user: options.authUser ?? null },
    error: options.authError ?? null,
  });

  return {
    api: { auth: { getUser }, from } as unknown as SupabaseClient,
    getUser,
    from,
    accountMaybeSingle,
    capabilityMaybeSingle,
  };
}

describe('authenticateActiveAccount', () => {
  it('rejects a request without a bearer token before auth or DB access', async () => {
    const c = client({});
    const result = await authenticateActiveAccount(event(), c.api);

    expect(result).toEqual({ ok: false, status: 401 });
    expect(c.getUser).not.toHaveBeenCalled();
    expect(c.from).not.toHaveBeenCalled();
  });

  it('rejects an invalid token before DB access', async () => {
    const c = client({ authError: new Error('invalid') });
    const result = await authenticateActiveAccount(event('bad-token'), c.api);

    expect(result).toEqual({ ok: false, status: 401 });
    expect(c.from).not.toHaveBeenCalled();
  });

  it('rejects a valid JWT when the live platform account row is missing', async () => {
    const c = client({ authUser: { id: 'user-1', email: 'user@example.com' }, account: null });
    const result = await authenticateActiveAccount(event('token'), c.api);

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('rejects a valid stale JWT when the live platform account is suspended', async () => {
    const c = client({
      authUser: { id: 'user-1', email: 'user@example.com', app_metadata: { role: 'admin' } },
      account: { id: 'user-1', role: 'admin', isActive: false },
    });
    const result = await authenticateActiveAccount(event('still-valid-token'), c.api, ['admin']);

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('uses the live DB role rather than a stale JWT admin claim', async () => {
    const c = client({
      authUser: { id: 'user-1', email: 'user@example.com', app_metadata: { role: 'admin' } },
      account: { id: 'user-1', role: 'buyer', isActive: true },
    });
    const result = await authenticateActiveAccount(event('token'), c.api, ['admin']);

    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('returns the live active actor when the role is allowed', async () => {
    const c = client({
      authUser: { id: 'seller-1', email: 'SELLER@EXAMPLE.COM', app_metadata: { role: 'seller', marker: 'kept' } },
      account: { id: 'seller-1', role: 'seller', isActive: true },
    });
    const result = await authenticateActiveAccount(event('token'), c.api, ['seller']);

    expect(result).toEqual({
      ok: true,
      actor: {
        id: 'seller-1',
        role: 'seller',
        email: 'seller@example.com',
        appMetadata: { role: 'seller', marker: 'kept' },
      },
    });
  });
});


describe('capability account guards', () => {
  it('accepts Seller capability on the same active identity even when the default role is Buyer', async () => {
    const c = client({
      authUser: { id: 'user-1', email: 'buyer-seller@example.com' },
      account: { id: 'user-1', role: 'buyer', isActive: true },
      capability: 'seller',
    });

    const result = await authenticateActiveCapability(event('token'), c.api, 'seller');
    expect(result.ok).toBe(true);
  });

  it('fails closed when Seller capability is absent', async () => {
    const c = client({
      authUser: { id: 'user-1', email: 'buyer@example.com' },
      account: { id: 'user-1', role: 'buyer', isActive: true },
      capability: null,
    });

    const result = await authenticateActiveCapability(event('token'), c.api, 'seller');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('never converts Admin authority into ordinary Seller capability', async () => {
    const c = client({
      authUser: { id: 'admin-1', email: 'admin@example.com' },
      account: { id: 'admin-1', role: 'admin', isActive: true },
      capability: 'seller',
    });

    const result = await authenticateActiveCapability(event('token'), c.api, 'seller');
    expect(result).toEqual({ ok: false, status: 403 });
    expect(c.capabilityMaybeSingle).not.toHaveBeenCalled();
  });

  it('permits Admin only on the explicit seller-or-admin management guard', async () => {
    const c = client({
      authUser: { id: 'admin-1', email: 'admin@example.com' },
      account: { id: 'admin-1', role: 'admin', isActive: true },
    });

    const result = await authenticateSellerCapabilityOrAdmin(event('token'), c.api);
    expect(result.ok).toBe(true);
    expect(c.capabilityMaybeSingle).not.toHaveBeenCalled();
  });
});
