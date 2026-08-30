import { describe, expect, it, vi } from 'vitest';
import { AvasamClient } from '../_shared/avasamClient';

describe('AvasamClient verified authenticated transport', () => {
  it('owns the provider Authorization header and sends the raw access token without Bearer', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ SKU: 'S0671779793', Stock: 1 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = new AvasamClient({ baseUrl: 'https://app.avasam.com' });
    const result = await client.authenticatedRequest(
      { correlationId: 'verified-transport' },
      '/apiseeker/Products/SellerStockList',
      'provider-access-token',
      { method: 'POST', body: JSON.stringify({ limit: 1, page: 0 }) },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('provider-access-token');
    expect(headers.get('Authorization')).not.toContain('Bearer ');
    expect(headers.get('X-Correlation-Id')).toBe('verified-transport');
    fetchMock.mockRestore();
  });

  it('fails closed before network access when the verified access token is empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://app.avasam.com' });

    const result = await client.authenticatedRequest(
      { correlationId: 'verified-transport' },
      '/apiseeker/Products/SellerStockList',
      '   ',
      { method: 'POST', body: '{}' },
    );

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects caller attempts to override the internally owned provider Authorization header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://app.avasam.com' });

    const result = await client.authenticatedRequest(
      { correlationId: 'verified-transport' },
      '/apiseeker/Products/SellerStockList',
      'provider-access-token',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer caller-token' },
        body: '{}',
      },
    );

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('never echoes the access token into provider rejection results', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new AvasamClient({ baseUrl: 'https://app.avasam.com' });
    const accessToken = 'sensitive-provider-access-token';

    const result = await client.authenticatedRequest(
      { correlationId: 'verified-transport' },
      '/apiseeker/Products/SellerStockList',
      accessToken,
      { method: 'POST', body: '{}' },
    );

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(accessToken);
    fetchMock.mockRestore();
  });
});
