import { describe, expect, it } from 'vitest';
import { AvasamAdapterV1 } from '../_shared/avasamAdapter';

describe('Avasam Phase O branch guard', () => {
  it('does not advertise unverified capabilities', () => {
    const adapter = new AvasamAdapterV1({});
    expect(adapter.capabilities).toEqual([]);
  });

  it('does not turn unavailable supplier truth into commercial zeroes', async () => {
    const adapter = new AvasamAdapterV1({});
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

  it('does not submit an order before the provider contract is verified', async () => {
    const adapter = new AvasamAdapterV1({});
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
