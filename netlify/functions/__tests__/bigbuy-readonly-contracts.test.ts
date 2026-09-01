import { describe, expect, it, vi } from 'vitest';
import { BigBuyClient } from '../_shared/bigBuyClient';
import {
  BIGBUY_READONLY_ENDPOINTS,
  bigBuyParentTaxonomyPath,
  parseBigBuyProductsResponse,
  parseBigBuyStockResponse,
  parseBigBuyVariationsResponse,
  totalBigBuyStock,
} from '../_shared/bigBuyContracts';
import {
  createSupplierProviderAdapter,
  getSupplierProviderDefinition,
} from '../_shared/supplierProviderRegistry';

const CONTEXT = { correlationId: 'bigbuy-contract-test' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('BigBuyClient read-only security boundary', () => {
  it('uses the sandbox host and owns Bearer authentication plus correlation headers', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([{ id: 1 }]));
    const client = new BigBuyClient({ environment: 'sandbox', apiKey: 'sandbox-key' });

    const result = await client.request<unknown[]>(
      CONTEXT,
      '/rest/catalog/products.json?parentTaxonomy=1234',
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sandbox.bigbuy.eu/rest/catalog/products.json?parentTaxonomy=1234');
    expect(init?.method).toBe('GET');
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer sandbox-key');
    expect(headers.get('X-Correlation-Id')).toBe(CONTEXT.correlationId);
    expect(headers.get('Accept')).toBe('application/json');
    fetchMock.mockRestore();
  });

  it('rejects production transport before network access while BigBuy remains unverified', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new BigBuyClient({ environment: 'production', apiKey: 'production-key' });

    const result = await client.request<unknown[]>(CONTEXT, '/rest/catalog/taxonomies.json');

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('fails closed before network access when the API key is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new BigBuyClient({ environment: 'sandbox' });

    const result = await client.request(CONTEXT, '/rest/catalog/taxonomies.json');

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('rejects write methods before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new BigBuyClient({ environment: 'sandbox', apiKey: 'sandbox-key' });

    const result = await client.request(CONTEXT, '/rest/order/create/multishipping.json', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('blocks caller-controlled Authorization headers before network access', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new BigBuyClient({ environment: 'sandbox', apiKey: 'trusted-key' });

    const result = await client.request(CONTEXT, '/rest/catalog/taxonomies.json', {
      headers: { Authorization: 'Bearer attacker-key' },
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it.each([
    'https://attacker.invalid/steal',
    '//attacker.invalid/steal',
    '/\\attacker.invalid/steal',
  ])('rejects untrusted endpoint path %s before network access', async (path) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const client = new BigBuyClient({ environment: 'sandbox', apiKey: 'trusted-key' });

    const result = await client.request(CONTEXT, path);

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('AUTH_CONFIGURATION_FAILURE');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});

describe('BigBuy documented read-only catalogue contracts', () => {
  it('builds parent-taxonomy catalogue paths without allowing arbitrary hosts', () => {
    expect(bigBuyParentTaxonomyPath(BIGBUY_READONLY_ENDPOINTS.products, 1234)).toEqual({
      ok: true,
      data: '/rest/catalog/products.json?parentTaxonomy=1234',
    });

    const invalid = bigBuyParentTaxonomyPath('https://attacker.invalid/products', 1234);
    expect(invalid.ok).toBe(false);
    expect(invalid && !invalid.ok ? invalid.errorClass : null).toBe('PERMANENT_REJECTION');
  });

  it('parses documented product fields conservatively', () => {
    const parsed = parseBigBuyProductsResponse([{
      id: 111,
      sku: 'S111',
      wholesalePrice: 12.35,
      active: 1,
      ignoredField: 'provider-specific',
    }]);

    expect(parsed).toEqual({
      ok: true,
      data: [{ id: 111, sku: 'S111', wholesalePrice: 12.35, active: 1 }],
    });
  });

  it('parses documented variation fields conservatively', () => {
    const parsed = parseBigBuyVariationsResponse([{
      id: 222,
      sku: 'V222',
      product: 111,
      wholesalePrice: 13.5,
    }]);

    expect(parsed).toEqual({
      ok: true,
      data: [{ id: 222, sku: 'V222', product: 111, wholesalePrice: 13.5 }],
    });
  });

  it('parses handling-day stock buckets and sums quantities safely', () => {
    const parsed = parseBigBuyStockResponse([{
      id: 111,
      sku: 'S111',
      stocks: [
        { quantity: 7, minHandlingDays: 0, maxHandlingDays: 1, warehouse: 1 },
        { quantity: 5, minHandlingDays: 2, maxHandlingDays: 5, warehouse: 2 },
      ],
    }]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(totalBigBuyStock(parsed.data[0])).toEqual({ ok: true, data: 12 });
  });

  it('rejects negative wholesale prices rather than coercing provider data', () => {
    const parsed = parseBigBuyProductsResponse([{
      id: 111,
      sku: 'S111',
      wholesalePrice: -0.01,
      active: 1,
    }]);
    expect(parsed.ok).toBe(false);
    expect(parsed && !parsed.ok ? parsed.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('rejects negative stock and invalid handling-day ranges', () => {
    const negative = parseBigBuyStockResponse([{
      id: 111,
      sku: 'S111',
      stocks: [{ quantity: -1, minHandlingDays: 0, maxHandlingDays: 1, warehouse: 1 }],
    }]);
    expect(negative.ok).toBe(false);

    const invalidRange = parseBigBuyStockResponse([{
      id: 111,
      sku: 'S111',
      stocks: [{ quantity: 1, minHandlingDays: 5, maxHandlingDays: 2, warehouse: 1 }],
    }]);
    expect(invalidRange.ok).toBe(false);
    expect(invalidRange && !invalidRange.ok ? invalidRange.errorClass : null).toBe('MALFORMED_RESPONSE');
  });
});

describe('BigBuy activation guard', () => {
  it('keeps BigBuy at zero verified and zero enabled capabilities', () => {
    const definition = getSupplierProviderDefinition('bigbuy');
    expect(definition.verifiedCapabilities).toEqual([]);
    expect(definition.hostedActivation).toBe('off');

    const adapter = createSupplierProviderAdapter('bigbuy');
    expect(adapter.providerKey).toBe('bigbuy');
    expect(adapter.capabilities).toEqual([]);
  });
});
