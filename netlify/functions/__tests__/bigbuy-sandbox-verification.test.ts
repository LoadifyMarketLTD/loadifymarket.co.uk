import { describe, expect, it, vi } from 'vitest';
import type { SupplierAdapterResult } from '../_shared/supplierAdapter';
import type { BigBuyReadOnlyTransport } from '../_shared/bigBuySandboxVerification';
import { runBigBuySandboxVerification } from '../_shared/bigBuySandboxVerification';

const CONFIG = {
  parentTaxonomy: 1234,
  productId: 111,
  productSku: 'P111',
  variationId: 222,
  variationSku: 'V222',
};

function ok<T>(data: T): SupplierAdapterResult<T> {
  return { ok: true, data };
}

function transportFor(overrides: Partial<Record<'products' | 'variations' | 'productStock' | 'variationStock', unknown>> = {}) {
  const request = vi.fn(async <T>(_context: { correlationId: string }, path: string): Promise<SupplierAdapterResult<T>> => {
    if (path.startsWith('/rest/catalog/products.json?')) {
      return ok(overrides.products ?? [{ id: 111, sku: 'P111', wholesalePrice: 10.5, active: 1 }]) as SupplierAdapterResult<T>;
    }
    if (path.startsWith('/rest/catalog/productsvariations.json?')) {
      return ok(overrides.variations ?? [{ id: 222, sku: 'V222', product: 111, wholesalePrice: 11.75 }]) as SupplierAdapterResult<T>;
    }
    if (path.startsWith('/rest/catalog/productsstockbyhandlingdays.json?')) {
      return ok(overrides.productStock ?? [{
        id: 111,
        sku: 'P111',
        stocks: [
          { quantity: 4, minHandlingDays: 0, maxHandlingDays: 1, warehouse: 1 },
          { quantity: 3, minHandlingDays: 2, maxHandlingDays: 4, warehouse: 2 },
        ],
      }]) as SupplierAdapterResult<T>;
    }
    if (path.startsWith('/rest/catalog/productsvariationsstockbyhandlingdays.json?')) {
      return ok(overrides.variationStock ?? [{
        id: 222,
        sku: 'V222',
        stocks: [{ quantity: 2, minHandlingDays: 0, maxHandlingDays: 2, warehouse: 1 }],
      }]) as SupplierAdapterResult<T>;
    }
    return {
      ok: false,
      errorClass: 'PERMANENT_REJECTION',
      message: `Unexpected test path ${path}`,
    } as SupplierAdapterResult<T>;
  });

  return { request } satisfies BigBuyReadOnlyTransport;
}

describe('BigBuy sandbox verification runner', () => {
  it('verifies one controlled product/variation set without exposing raw payloads or promoting capabilities', async () => {
    const client = transportFor();
    const result = await runBigBuySandboxVerification({
      client,
      context: { correlationId: 'bigbuy-sandbox-evidence-1' },
      config: CONFIG,
      now: () => Date.parse('2026-09-01T12:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(client.request).toHaveBeenCalledTimes(4);
    for (const call of client.request.mock.calls) {
      expect(call[2]).toEqual({ method: 'GET' });
      expect(call[1]).toContain('parentTaxonomy=1234');
    }

    expect(result.data.environment).toBe('sandbox');
    expect(result.data.controlledScope).toEqual(CONFIG);
    expect(result.data.observedContracts.products).toEqual({
      matched: true,
      active: 1,
      wholesalePrice: 10.5,
    });
    expect(result.data.observedContracts.variations).toEqual({
      matched: true,
      parentProductMatched: true,
      wholesalePrice: 11.75,
    });
    expect(result.data.observedContracts.productStock.totalQuantity).toBe(7);
    expect(result.data.observedContracts.variationStock.totalQuantity).toBe(2);
    expect(result.data.safety).toEqual({
      ordersCalled: false,
      piiProcessed: false,
      providerWriteExecuted: false,
      capabilityPromotionPerformed: false,
      marketplacePublicationPerformed: false,
      rawProviderPayloadReturned: false,
    });
    expect(result.data.promotion.automaticallyAllowed).toBe(false);
    expect(result.data).not.toHaveProperty('rawPayload');
  });

  it('fails closed when the controlled variation belongs to another product', async () => {
    const client = transportFor({
      variations: [{ id: 222, sku: 'V222', product: 999, wholesalePrice: 11.75 }],
    });

    const result = await runBigBuySandboxVerification({
      client,
      context: { correlationId: 'bigbuy-sandbox-evidence-2' },
      config: CONFIG,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('PERMANENT_REJECTION');
    expect(result && !result.ok ? result.message : '').toMatch(/not bound to the controlled product/);
  });

  it('fails closed on malformed provider stock rather than producing evidence', async () => {
    const client = transportFor({
      variationStock: [{
        id: 222,
        sku: 'V222',
        stocks: [{ quantity: -1, minHandlingDays: 0, maxHandlingDays: 1, warehouse: 1 }],
      }],
    });

    const result = await runBigBuySandboxVerification({
      client,
      context: { correlationId: 'bigbuy-sandbox-evidence-3' },
      config: CONFIG,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('requires controlled positive IDs and a correlation id before provider access', async () => {
    const client = transportFor();
    const invalidId = await runBigBuySandboxVerification({
      client,
      context: { correlationId: 'bigbuy-sandbox-evidence-4' },
      config: { ...CONFIG, productId: 0 },
    });
    expect(invalidId.ok).toBe(false);
    expect(client.request).not.toHaveBeenCalled();

    const missingCorrelation = await runBigBuySandboxVerification({
      client,
      context: { correlationId: '   ' },
      config: CONFIG,
    });
    expect(missingCorrelation.ok).toBe(false);
    expect(client.request).not.toHaveBeenCalled();
  });

  it('requires exactly one controlled id/SKU match', async () => {
    const client = transportFor({
      products: [
        { id: 111, sku: 'P111', wholesalePrice: 10.5, active: 1 },
        { id: 111, sku: 'P111', wholesalePrice: 10.5, active: 1 },
      ],
    });

    const result = await runBigBuySandboxVerification({
      client,
      context: { correlationId: 'bigbuy-sandbox-evidence-5' },
      config: CONFIG,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.message : '').toMatch(/exactly one controlled id\/SKU match/);
  });
});
