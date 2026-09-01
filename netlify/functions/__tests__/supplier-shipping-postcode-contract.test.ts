import { describe, expect, it } from 'vitest';
import { InactiveSupplierAdapterV1 } from '../_shared/inactiveSupplierAdapter';
import type {
  SupplierAdapterContext,
  SupplierShippingQuoteRequest,
} from '../_shared/supplierAdapter';
import { buildBigBuyShippingQuoteRequest } from '../_shared/bigBuyTransactionalContracts';

const CONTEXT: SupplierAdapterContext = {
  correlationId: 'shipping-postcode-contract-test',
  idempotencyKey: 'shipping-postcode-contract-test-idempotency',
  supplierKey: 'supplier-test',
  territory: 'GB',
};

describe('provider-neutral shipping postcode contract', () => {
  it('accepts an optional postcode without enabling an inactive provider', async () => {
    const request: SupplierShippingQuoteRequest = {
      externalOfferRef: 'provider-offer-ref',
      quantity: 1,
      destinationCountry: 'GB',
      destinationPostcode: 'BB1 9QL',
    };

    const adapter = new InactiveSupplierAdapterV1('bigbuy');
    const result = await adapter.quoteShipping(CONTEXT, request);

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
    expect(adapter.capabilities).toEqual([]);
  });

  it('remains backward-compatible for providers that do not require postcode', async () => {
    const request: SupplierShippingQuoteRequest = {
      externalOfferRef: 'provider-offer-ref',
      quantity: 1,
      destinationCountry: 'GB',
    };

    const adapter = new InactiveSupplierAdapterV1('unverified-provider');
    const result = await adapter.quoteShipping(CONTEXT, request);

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });

  it('lets BigBuy continue to fail closed when its required postcode is absent', () => {
    const request: SupplierShippingQuoteRequest = {
      externalOfferRef: 'S6483140',
      quantity: 1,
      destinationCountry: 'GB',
    };

    const result = buildBigBuyShippingQuoteRequest({
      isoCountry: request.destinationCountry,
      postcode: request.destinationPostcode ?? '',
      products: [{ reference: request.externalOfferRef, quantity: request.quantity }],
    });

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('PERMANENT_REJECTION');
  });
});
