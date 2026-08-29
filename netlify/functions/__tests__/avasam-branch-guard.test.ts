import { describe, expect, it } from 'vitest';
import { AvasamAdapterV1 } from '../_shared/avasamAdapter';
import { AVASAM_VERIFIED_ENDPOINTS } from '../_shared/avasamContracts';

describe('Avasam Phase O branch guard', () => {
  it('does not advertise capabilities merely because provider contracts are documented', () => {
    const adapter = new AvasamAdapterV1();
    expect(adapter.capabilities).toEqual([]);
    expect(AVASAM_VERIFIED_ENDPOINTS.getSellerProductList).toContain('GetSellerProductList');
    expect(AVASAM_VERIFIED_ENDPOINTS.getInventoryListWithFilter).toContain('GetInventoryListWithFilter');
    expect(AVASAM_VERIFIED_ENDPOINTS.sellerStockList).toContain('SellerStockList');
  });

  it('does not turn unavailable supplier truth into commercial zeroes', async () => {
    const adapter = new AvasamAdapterV1();
    const context = {
      correlationId: 'guard-correlation',
      idempotencyKey: 'guard-idempotency',
      supplierKey: 'avasam',
      territory: 'GB',
    };
    const stock = await adapter.getStock?.(context, ['variant']);
    const price = await adapter.getPrices?.(context, ['variant']);
    expect(stock && !stock.ok ? stock.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(price && !price.ok ? price.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });

  it('does not submit an order before the provider contract and account permission gates are verified', async () => {
    const adapter = new AvasamAdapterV1();
    const result = await adapter.submitOrder?.({
      correlationId: 'guard-correlation',
      idempotencyKey: 'guard-order-idempotency',
      supplierKey: 'avasam',
      territory: 'GB',
    }, {
      externalOfferRef: 'offer',
      quantity: 1,
      destinationCountry: 'GB',
    });
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });
});
