// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { installCheckoutFetchGuard } from '../checkoutFetchGuard';

describe('checkoutFetchGuard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function installWithUpstream(
    upstream: ReturnType<typeof vi.fn>,
    origin = 'https://deploy-preview-999--loadifymarketcouk.netlify.app',
  ) {
    vi.stubGlobal('window', {
      fetch: upstream,
      location: { origin },
    });

    installCheckoutFetchGuard();
    return (globalThis as typeof globalThis & { window: { fetch: typeof fetch } }).window.fetch;
  }

  it('routes the create-checkout POST through the explicit same-deploy /api proxy', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://checkout.stripe.com/example' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const guardedFetch = installWithUpstream(upstream);

    const response = await guardedFetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ items: [] }),
    });

    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0]?.[0]).toBe(
      'https://deploy-preview-999--loadifymarketcouk.netlify.app/api/create-checkout',
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: 'https://checkout.stripe.com/example' });
  });

  it('converts an unexpected HTML checkout response into controlled JSON', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );
    const guardedFetch = installWithUpstream(upstream, 'https://loadifymarket.co.uk');

    const response = await guardedFetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      body: '{}',
    });

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      error: 'Checkout returned an invalid response. Please try again.',
    });
  });

  it('does not alter unrelated fetch calls', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const guardedFetch = installWithUpstream(upstream);

    await guardedFetch('/.netlify/functions/health', { method: 'GET' });

    expect(upstream).toHaveBeenCalledWith('/.netlify/functions/health', { method: 'GET' });
  });
});
