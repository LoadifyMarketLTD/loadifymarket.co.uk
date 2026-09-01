import { describe, expect, it } from 'vitest';
import { projectBigBuyReadModel } from '../_shared/bigBuyReadProjection';

const OBSERVED_AT = '2026-09-01T20:15:00.000Z';

function stock(id: number, sku: string, quantity: number) {
  return {
    id,
    sku,
    stocks: [{ quantity, minHandlingDays: 0, maxHandlingDays: 2, warehouse: 1 }],
  };
}

describe('BigBuy canonical read projection', () => {
  it('projects an active non-variation product into canonical catalogue, EUR price and stock', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 101, sku: 'P101', wholesalePrice: 12.35, active: 1 }],
      variations: [],
      productStock: [stock(101, 'P101', 7)],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceCurrency).toBe('EUR');
    expect(result.data.catalog).toEqual([{
      externalProductRef: 'P101',
      externalVariantRefs: ['P101'],
    }]);
    expect(result.data.prices).toEqual([{
      externalVariantRef: 'P101',
      amountMinor: 1235,
      currency: 'EUR',
      observedAt: OBSERVED_AT,
    }]);
    expect(result.data.stock).toEqual([{
      externalVariantRef: 'P101',
      quantity: 7,
      availability: 'in_stock',
      observedAt: OBSERVED_AT,
    }]);
    expect(result.data.safety).toEqual({
      providerNetworkCallPerformed: false,
      providerCapabilityPromotionPerformed: false,
      marketplacePublicationPerformed: false,
      providerWritePerformed: false,
      customerPiiProcessed: false,
      financialMutationPerformed: false,
    });
  });

  it('uses variation refs, variation prices and variation stock for products that have variations', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 200, sku: 'P200', wholesalePrice: 20, active: 1 }],
      variations: [
        { id: 201, sku: 'V201', product: 200, wholesalePrice: 21.5 },
        { id: 202, sku: 'V202', product: 200, wholesalePrice: 22 },
      ],
      productStock: [stock(200, 'P200', 99)],
      variationStock: [stock(201, 'V201', 3), stock(202, 'V202', 0)],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.catalog[0]).toEqual({
      externalProductRef: 'P200',
      externalVariantRefs: ['V201', 'V202'],
    });
    expect(result.data.prices.map(item => [item.externalVariantRef, item.amountMinor, item.currency])).toEqual([
      ['V201', 2150, 'EUR'],
      ['V202', 2200, 'EUR'],
    ]);
    expect(result.data.stock).toEqual([
      { externalVariantRef: 'V201', quantity: 3, availability: 'in_stock', observedAt: OBSERVED_AT },
      { externalVariantRef: 'V202', quantity: 0, availability: 'out_of_stock', observedAt: OBSERVED_AT },
    ]);
  });

  it('treats missing provider stock as unknown rather than available or zero', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 301, sku: 'P301', wholesalePrice: 5, active: 1 }],
      variations: [],
      productStock: [],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stock).toEqual([{
      externalVariantRef: 'P301',
      availability: 'unknown',
      observedAt: OBSERVED_AT,
    }]);
  });

  it('excludes inactive products rather than publishing them', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 401, sku: 'P401', wholesalePrice: 9, active: 0 }],
      variations: [],
      productStock: [stock(401, 'P401', 8)],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.catalog).toEqual([]);
    expect(result.data.stock).toEqual([]);
    expect(result.data.prices).toEqual([]);
    expect(result.data.safety.marketplacePublicationPerformed).toBe(false);
  });

  it('fails closed on duplicate external refs', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 501, sku: 'DUP', wholesalePrice: 1, active: 1 }],
      variations: [{ id: 502, sku: 'DUP', product: 501, wholesalePrice: 2 }],
      productStock: [],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('fails closed when a variation references an unknown product', () => {
    const result = projectBigBuyReadModel({
      products: [],
      variations: [{ id: 602, sku: 'V602', product: 601, wholesalePrice: 2 }],
      productStock: [],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('rejects unsupported sub-cent provider prices instead of silently rounding supplier cost', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 701, sku: 'P701', wholesalePrice: 1.234, active: 1 }],
      variations: [],
      productStock: [],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('fails closed when provider stock id and SKU bindings disagree', () => {
    const result = projectBigBuyReadModel({
      products: [{ id: 801, sku: 'P801', wholesalePrice: 3, active: 1 }],
      variations: [],
      productStock: [stock(999, 'P801', 4)],
      variationStock: [],
      observedAt: OBSERVED_AT,
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });
});
