import { afterEach, describe, expect, it, vi } from 'vitest';
import { BigBuyClient } from '../_shared/bigBuyClient';
import { runBigBuyControlledReadSession } from '../_shared/bigBuyControlledReadSession';

const OBSERVED_AT = '2026-09-01T20:45:00.000Z';
const CONTEXT = { correlationId: 'bigbuy-controlled-read-session-test' };
const SCOPE = {
  parentTaxonomy: 1234,
  productId: 100,
  productSku: 'P100',
  variationId: 101,
  variationSku: 'V101',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function productStock(id: number, sku: string, quantity: number) {
  return {
    id,
    sku,
    stocks: [{ quantity, minHandlingDays: 0, maxHandlingDays: 2, warehouse: 1 }],
  };
}

function sandboxClient() {
  return new BigBuyClient({ environment: 'sandbox', apiKey: 'sandbox-key' });
}

function mockHappyControlledResponses(variationStockQuantity = 6) {
  return vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(jsonResponse([
      { id: 100, sku: 'P100', wholesalePrice: 12, active: 1 },
      { id: 900, sku: 'UNRELATED-PRODUCT', wholesalePrice: 99, active: 1 },
    ]))
    .mockResolvedValueOnce(jsonResponse([
      { id: 101, sku: 'V101', product: 100, wholesalePrice: 12.5 },
      { id: 901, sku: 'UNRELATED-VARIATION', product: 900, wholesalePrice: 99.5 },
    ]))
    .mockResolvedValueOnce(jsonResponse([
      productStock(100, 'P100', 20),
      productStock(900, 'UNRELATED-PRODUCT', 50),
    ]))
    .mockResolvedValueOnce(jsonResponse([
      productStock(101, 'V101', variationStockQuantity),
      productStock(901, 'UNRELATED-VARIATION', 40),
    ]));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BigBuy controlled sandbox read session', () => {
  it('projects only the controlled product/variation after exactly four sandbox GETs', async () => {
    const fetchMock = mockHappyControlledResponses(6);

    const result = await runBigBuyControlledReadSession({
      client: sandboxClient(),
      context: CONTEXT,
      scope: SCOPE,
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.environment).toBe('sandbox');
    expect(result.data.scope).toEqual({
      parentTaxonomy: 1234,
      product: { id: 100, sku: 'P100' },
      variation: { id: 101, sku: 'V101', productId: 100 },
    });
    expect(result.data.projection.catalog).toEqual([{
      externalProductRef: 'P100',
      externalVariantRefs: ['V101'],
    }]);
    expect(result.data.projection.prices).toEqual([{
      externalVariantRef: 'V101',
      amountMinor: 1250,
      currency: 'EUR',
      observedAt: OBSERVED_AT,
    }]);
    expect(result.data.projection.stock).toEqual([{
      externalVariantRef: 'V101',
      quantity: 6,
      availability: 'in_stock',
      observedAt: OBSERVED_AT,
    }]);
    expect(result.data.transport).toEqual({
      requestCount: 4,
      method: 'GET',
      productionAllowed: false,
      writeRequestsPerformed: false,
      customerPiiProcessed: false,
      capabilityPromotionPerformed: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url).startsWith('https://api.sandbox.bigbuy.eu/rest/catalog/')).toBe(true);
      expect(init?.method).toBe('GET');
    }
  });

  it('keeps missing controlled variation stock unknown instead of inferring zero or availability', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse([
        { id: 100, sku: 'P100', wholesalePrice: 12, active: 1 },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { id: 101, sku: 'V101', product: 100, wholesalePrice: 12.5 },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        productStock(100, 'P100', 20),
      ]))
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await runBigBuyControlledReadSession({
      client: sandboxClient(),
      context: CONTEXT,
      scope: SCOPE,
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.projection.stock).toEqual([{
      externalVariantRef: 'V101',
      availability: 'unknown',
      observedAt: OBSERVED_AT,
    }]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('fails closed after the first response when controlled product identity is ambiguous', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse([
      { id: 100, sku: 'P100', wholesalePrice: 12, active: 1 },
      { id: 100, sku: 'P100-SECOND', wholesalePrice: 13, active: 1 },
    ]));

    const result = await runBigBuyControlledReadSession({
      client: sandboxClient(),
      context: CONTEXT,
      scope: SCOPE,
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed after the second response when the controlled variation belongs to another product', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse([
        { id: 100, sku: 'P100', wholesalePrice: 12, active: 1 },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { id: 101, sku: 'V101', product: 999, wholesalePrice: 12.5 },
      ]));

    const result = await runBigBuyControlledReadSession({
      client: sandboxClient(),
      context: CONTEXT,
      scope: SCOPE,
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops immediately on a retryable first transport failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({ error: 'temporary' }, 500));

    const result = await runBigBuyControlledReadSession({
      client: sandboxClient(),
      context: CONTEXT,
      scope: SCOPE,
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('RETRYABLE_FAILURE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cannot use a production BigBuy client and performs zero network calls', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await runBigBuyControlledReadSession({
      client: new BigBuyClient({ environment: 'production', apiKey: 'production-key' }),
      context: CONTEXT,
      scope: SCOPE,
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'invalid product id',
      scope: { ...SCOPE, productId: 0 },
      observedAt: OBSERVED_AT,
    },
    {
      label: 'blank variation sku',
      scope: { ...SCOPE, variationSku: '   ' },
      observedAt: OBSERVED_AT,
    },
    {
      label: 'duplicate product/variation sku',
      scope: { ...SCOPE, variationSku: 'P100' },
      observedAt: OBSERVED_AT,
    },
    {
      label: 'invalid observedAt',
      scope: SCOPE,
      observedAt: 'not-a-date',
    },
  ])('rejects $label during preflight with zero network calls', async ({ scope, observedAt }) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const result = await runBigBuyControlledReadSession({
      client: sandboxClient(),
      context: CONTEXT,
      scope,
      observedAt,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('PERMANENT_REJECTION');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
