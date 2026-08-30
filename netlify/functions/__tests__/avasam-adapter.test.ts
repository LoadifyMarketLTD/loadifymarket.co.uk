import { describe, expect, it, vi } from 'vitest';
import { AvasamAdapterV1 } from '../_shared/avasamAdapter';
import { AvasamClient } from '../_shared/avasamClient';
import { AVASAM_PILOT_SKU } from '../_shared/avasamSupplierPolicy';
import { assertSupplierAdapterV1 } from '../_shared/supplierAdapter';

const PILOT_CONTEXT = {
  correlationId: 'test-correlation',
  idempotencyKey: 'test-idempotency',
  supplierKey: 'avasam-gb010107',
  territory: 'GB',
};

describe('AvasamAdapterV1 controlled read-only pilot', () => {
  it('conforms to SupplierAdapterV1 and advertises only verified read capabilities', () => {
    const adapter = new AvasamAdapterV1();
    assertSupplierAdapterV1(adapter);
    expect(adapter.providerKey).toBe('avasam');
    expect(adapter.interfaceVersion).toBe(1);
    expect(adapter.capabilities).toEqual(['catalog', 'stock', 'price']);
  });

  it('fails closed before network access for a SKU outside the controlled pilot', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const adapter = new AvasamAdapterV1();
    const result = await adapter.getStock(PILOT_CONTEXT, ['variant-1']);
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('fails closed before network access outside the GB pilot territory', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const adapter = new AvasamAdapterV1();
    const result = await adapter.getPrices({ ...PILOT_CONTEXT, territory: 'US' }, [AVASAM_PILOT_SKU]);
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('maps the verified Seller Product List and Seller Stock List into provider-neutral snapshots', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/auth/request-token')) {
        return new Response(JSON.stringify({
          access_token: 'provider-access-token',
          expires_at: '2099-08-29T18:00:00.000Z',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('provider-access-token');
      expect(headers.get('X-Correlation-Id')).toBe(PILOT_CONTEXT.correlationId);
      expect(headers.get('Idempotency-Key')).toBeNull();

      if (url.endsWith('/apiseeker/Products/GetSellerProductList')) {
        expect(JSON.parse(String(init?.body))).toEqual({ Page: 0, Limit: 100 });
        return new Response(JSON.stringify([{
          SKU: AVASAM_PILOT_SKU,
          Price: 9.35,
          Title: 'Pilot product',
          Category: 'Automotive',
        }]), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/apiseeker/Products/SellerStockList')) {
        expect(JSON.parse(String(init?.body))).toEqual({ limit: 100, page: 0 });
        return new Response(JSON.stringify([{
          SKU: AVASAM_PILOT_SKU,
          Stock: 35,
        }]), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
    });

    const client = new AvasamClient({
      baseUrl: 'https://app.avasam.com',
      consumerKey: 'consumer-key',
      secretKey: 'secret-key',
    });
    const observedAt = '2026-08-29T18:00:00.000Z';
    const adapter = new AvasamAdapterV1({
      client,
      now: () => Date.parse(observedAt),
    });

    const catalog = await adapter.listCatalog(PILOT_CONTEXT);
    expect(catalog).toEqual({
      ok: true,
      data: [{
        externalProductRef: AVASAM_PILOT_SKU,
        externalVariantRefs: [AVASAM_PILOT_SKU],
      }],
    });

    const prices = await adapter.getPrices(PILOT_CONTEXT, [AVASAM_PILOT_SKU]);
    expect(prices).toEqual({
      ok: true,
      data: [{
        externalVariantRef: AVASAM_PILOT_SKU,
        amountMinor: 935,
        currency: 'GBP',
        observedAt,
      }],
    });

    const stock = await adapter.getStock(PILOT_CONTEXT, [AVASAM_PILOT_SKU]);
    expect(stock).toEqual({
      ok: true,
      data: [{
        externalVariantRef: AVASAM_PILOT_SKU,
        quantity: 35,
        availability: 'in_stock',
        observedAt,
      }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    fetchMock.mockRestore();
  });

  it('keeps order submission fail-closed even after read capabilities are verified', async () => {
    const adapter = new AvasamAdapterV1();
    const result = await adapter.submitOrder(PILOT_CONTEXT, {
      externalOfferRef: AVASAM_PILOT_SKU,
      quantity: 1,
      destinationCountry: 'GB',
    });
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });
});

describe('AvasamClient verified Seller API authentication', () => {
  it('requests a token using only the documented consumer and secret JSON fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: 'provider-access-token',
        expires_at: '2026-08-29T16:00:00.000Z',
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    const client = new AvasamClient({
      baseUrl: 'https://app.avasam.com',
      consumerKey: 'consumer-key',
      secretKey: 'secret-key',
    });
    const result = await client.requestToken();

    expect(result).toEqual({
      ok: true,
      data: {
        access_token: 'provider-access-token',
        expires_at: '2026-08-29T16:00:00.000Z',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.avasam.com/api/auth/request-token');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      consumer_key: 'consumer-key',
      secret_key: 'secret-key',
    });
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-Correlation-Id')).toBeNull();
    expect(headers.get('Idempotency-Key')).toBeNull();
    fetchMock.mockRestore();
  });

  it('fails closed before network access when Seller API credentials are missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://app.avasam.com' });
    const result = await client.requestToken();
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects malformed successful token responses instead of accepting ambiguous auth state', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: '', expires_at: 'not-a-date' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new AvasamClient({
      baseUrl: 'https://app.avasam.com',
      consumerKey: 'consumer-key',
      secretKey: 'secret-key',
    });
    const result = await client.requestToken();
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
    fetchMock.mockRestore();
  });
});

describe('AvasamClient security boundary', () => {
  it('does not send an idempotency header unless explicitly supplied', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    await client.request({ correlationId: 'correlation-only' }, '/health');
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Correlation-Id')).toBe('correlation-only');
    expect(headers.get('Idempotency-Key')).toBeNull();
    fetchMock.mockRestore();
  });

  it('prevents provider callers from injecting an unverified Authorization token transport', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request(
      { correlationId: 'trusted-correlation', idempotencyKey: 'trusted-idempotency' },
      '/health',
      { headers: { Authorization: 'Bearer guessed-token' } },
    );
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('prevents provider callers from injecting an unverified Authkey token transport', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request(
      { correlationId: 'trusted-correlation' },
      '/health',
      { headers: { Authkey: 'guessed-token' } },
    );
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('owns correlation and idempotency headers even when callers try to override them', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    await client.request(
      { correlationId: 'trusted-correlation', idempotencyKey: 'trusted-idempotency' },
      '/health',
      { headers: { 'X-Correlation-Id': 'caller-correlation', 'Idempotency-Key': 'caller-idempotency' } },
    );
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Correlation-Id')).toBe('trusted-correlation');
    expect(headers.get('Idempotency-Key')).toBe('trusted-idempotency');
    fetchMock.mockRestore();
  });

  it('requires a correlation id before any provider request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request({ correlationId: '' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects absolute endpoint paths so configuration cannot override the trusted API host', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, 'https://attacker.invalid/steal');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects backslash-based URL escape paths before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/\\attacker.invalid/steal');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects non-HTTPS provider base URLs before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'http://example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects embedded credentials in the provider base URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new AvasamClient({ baseUrl: 'https://user:password@example.invalid' });
    const result = await client.request({ correlationId: 'correlation-only' }, '/health');
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
