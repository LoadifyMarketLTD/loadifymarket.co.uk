import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBigBuyReadOnlyCatalogProbe } from './bigbuy-readonly-catalog-probe.mjs';

const ORIGINAL_ENV = { ...process.env };

function response(status, payload) {
  return new Response(payload === null ? '' : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const PRODUCT = {
  id: 1001,
  sku: 'BB-PRODUCT-001',
  wholesalePrice: 12.5,
  active: 1,
};

const PRODUCT_STOCK = {
  id: 1001,
  sku: 'BB-PRODUCT-001',
  stocks: [{ quantity: 7, minHandlingDays: 1, maxHandlingDays: 2, warehouse: 1 }],
};

const VARIATION = {
  id: 2001,
  sku: 'BB-VAR-001',
  product: 1001,
  wholesalePrice: 13.25,
};

const VARIATION_STOCK = {
  id: 2001,
  sku: 'BB-VAR-001',
  stocks: [{ quantity: 3, minHandlingDays: 1, maxHandlingDays: 3, warehouse: 1 }],
};

describe('BigBuy controlled read-only catalogue probe', () => {
  beforeEach(() => {
    process.env.BIGBUY_API_ENVIRONMENT = 'sandbox';
    process.env.BIGBUY_API_KEY = 'test-bigbuy-secret-api-key';
    process.env.BIGBUY_AUDIT_PARENT_TAXONOMY = '123';
    process.env.BIGBUY_AUDIT_PRODUCT_SKU = 'BB-PRODUCT-001';
    delete process.env.BIGBUY_AUDIT_VARIATION_SKU;
    delete process.env.BIGBUY_PROBE_PRODUCTION_CONFIRMATION;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it('proves sandbox products and stock only when unauthenticated controls fail and Bearer reads contain the controlled SKU', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(response(200, [PRODUCT]))
      .mockResolvedValueOnce(response(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(response(200, [PRODUCT_STOCK]));
    vi.stubGlobal('fetch', fetchMock);

    const evidence = await runBigBuyReadOnlyCatalogProbe();

    expect(evidence).toMatchObject({
      provider: 'bigbuy',
      environment: 'sandbox',
      parentTaxonomy: 123,
      product: { sku: 'BB-PRODUCT-001', verified: true },
      stock: { sku: 'BB-PRODUCT-001', verified: true },
      variation: null,
      variationStock: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const control = fetchMock.mock.calls[0];
    const authenticated = fetchMock.mock.calls[1];
    expect(control[0]).toBe('https://api.sandbox.bigbuy.eu/rest/catalog/products.json?parentTaxonomy=123');
    expect(control[1].method).toBe('GET');
    expect(control[1].headers.Authorization).toBeUndefined();
    expect(authenticated[1].headers.Authorization).toBe('Bearer test-bigbuy-secret-api-key');

    const emitted = [...console.log.mock.calls, ...console.error.mock.calls]
      .map(args => args.join(' '))
      .join('\n');
    expect(emitted).not.toContain('test-bigbuy-secret-api-key');
    expect(emitted).not.toContain('wholesalePrice');
  });

  it('optionally verifies variation catalogue and variation stock with the same negative controls', async () => {
    process.env.BIGBUY_AUDIT_VARIATION_SKU = 'BB-VAR-001';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(response(200, [PRODUCT]))
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(response(200, [PRODUCT_STOCK]))
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(response(200, [VARIATION]))
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(response(200, [VARIATION_STOCK]));
    vi.stubGlobal('fetch', fetchMock);

    const evidence = await runBigBuyReadOnlyCatalogProbe();

    expect(evidence.variation).toMatchObject({ sku: 'BB-VAR-001', verified: true });
    expect(evidence.variationStock).toMatchObject({ sku: 'BB-VAR-001', verified: true });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it('fails closed when the authenticated response shape is not the documented contract', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(401, {}))
      .mockResolvedValueOnce(response(200, [{ id: 1001, sku: 'BB-PRODUCT-001', wholesalePrice: '12.50', active: 1 }])));

    await expect(runBigBuyReadOnlyCatalogProbe()).rejects.toThrow('BigBuy products read-only contract was not proven');
  });

  it('fails closed if the unauthenticated control can already read the expected data', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(200, [PRODUCT]))
      .mockResolvedValueOnce(response(200, [PRODUCT])));

    await expect(runBigBuyReadOnlyCatalogProbe()).rejects.toThrow('BigBuy products read-only contract was not proven');
  });

  it('requires key, taxonomy and controlled product SKU before network access', async () => {
    delete process.env.BIGBUY_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runBigBuyReadOnlyCatalogProbe()).rejects.toThrow('Missing BIGBUY_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses production unless the explicit read-only confirmation phrase is set', async () => {
    process.env.BIGBUY_API_ENVIRONMENT = 'production';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(runBigBuyReadOnlyCatalogProbe()).rejects.toThrow('Refusing production probe');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
