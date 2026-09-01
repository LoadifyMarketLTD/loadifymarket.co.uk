import { describe, expect, it } from 'vitest';
import { parseBigBuyImagesResponse } from '../_shared/bigBuyContracts';
import {
  BIGBUY_ORDER_SUBMISSION_BLOCKERS,
  BIGBUY_TRANSACTIONAL_ENDPOINTS,
  buildBigBuyShippingQuoteRequest,
  parseBigBuyOrderCheckResponse,
  parseBigBuyOrderCreateResponse,
  parseBigBuyShippingOptionsResponse,
} from '../_shared/bigBuyTransactionalContracts';

describe('BigBuy documented image contract', () => {
  it('normalizes the documented boolean/string cover ambiguity without fetching the image', () => {
    const parsed = parseBigBuyImagesResponse([{
      id: 63272,
      images: [{
        id: 1050714,
        isCover: 'TRUE',
        name: '5011546498423_0_P00',
        url: 'https://cdnbigbuy.com/images/5011546498423_0_P00.jpg',
        logo: false,
        whiteBackground: false,
      }],
    }]);

    expect(parsed).toEqual({
      ok: true,
      data: [{
        id: 63272,
        images: [{
          id: 1050714,
          isCover: true,
          name: '5011546498423_0_P00',
          url: 'https://cdnbigbuy.com/images/5011546498423_0_P00.jpg',
          logo: false,
          whiteBackground: false,
        }],
      }],
    });
  });

  it('rejects non-HTTPS provider image URLs', () => {
    const parsed = parseBigBuyImagesResponse([{
      id: 1,
      images: [{
        id: 2,
        isCover: true,
        name: 'unsafe',
        url: 'http://example.invalid/image.jpg',
        logo: false,
        whiteBackground: false,
      }],
    }]);

    expect(parsed.ok).toBe(false);
    expect(parsed && !parsed.ok ? parsed.errorClass : null).toBe('MALFORMED_RESPONSE');
  });
});

describe('BigBuy pre-order shipping contract', () => {
  it('requires country plus postcode and builds only the documented quote envelope', () => {
    const result = buildBigBuyShippingQuoteRequest({
      isoCountry: 'gb',
      postcode: 'BB1 9QL',
      products: [{ reference: 'S6483140', quantity: 1 }],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        order: {
          delivery: { isoCountry: 'GB', postcode: 'BB1 9QL' },
          products: [{ reference: 'S6483140', quantity: 1 }],
        },
      },
    });
  });

  it('fails closed when postcode is missing', () => {
    const result = buildBigBuyShippingQuoteRequest({
      isoCountry: 'GB',
      postcode: ' ',
      products: [{ reference: 'S6483140', quantity: 1 }],
    });
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('PERMANENT_REJECTION');
  });

  it('parses documented shipping service, delay and cost fields', () => {
    const result = parseBigBuyShippingOptionsResponse({
      shippingOptions: [{
        shippingService: {
          id: '180',
          delay: '4-6 days',
          name: 'GLS',
          transportMethod: 'van',
          serviceName: 'GLS',
        },
        cost: 9.68,
        weight: 0.05,
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0].shippingService.serviceName).toBe('GLS');
    expect(result.data[0].cost).toBe(9.68);
  });
});

describe('BigBuy CHECK-before-CREATE contract', () => {
  it('marks a clean CHECK response as eligible for a later CREATE without performing a mutation', () => {
    const result = parseBigBuyOrderCheckResponse({
      orders: [{
        productReferences: ['F1520215'],
        totalWithoutTaxesAndWithoutShippingCost: 503.8,
        totalWithoutTaxes: 509.15,
        total: 616.07,
        warehouse: 1,
      }],
      errors: [],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        orders: [{
          productReferences: ['F1520215'],
          totalWithoutTaxesAndWithoutShippingCost: 503.8,
          totalWithoutTaxes: 509.15,
          total: 616.07,
          warehouse: 1,
        }],
        errors: [],
        canCreate: true,
        providerMutationPerformed: false,
      },
    });
  });

  it('does not allow CREATE after a CHECK response containing provider errors', () => {
    const result = parseBigBuyOrderCheckResponse({
      orders: [],
      errors: [{ status: 409, code: 'ER003', message: 'Products have no stock.' }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.canCreate).toBe(false);
    expect(result.data.providerMutationPerformed).toBe(false);
  });
});

describe('BigBuy multi-warehouse partial-create truth', () => {
  it('classifies mixed created orders plus errors as partial and reconciliation-required', () => {
    const result = parseBigBuyOrderCreateResponse({
      orders: [{
        productReferences: ['F1520215', 'V0720216'],
        id: '15012345',
        warehouse: 1,
        url: '/rest/order/15012345',
      }],
      errors: [{
        status: 409,
        code: 'ER003',
        message: 'Products have no stock.',
        productReferences: ['H1500113'],
        warehouse: 2,
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.outcome).toBe('partial');
    expect(result.data.partialCreationDetected).toBe(true);
    expect(result.data.requiresReconciliation).toBe(true);
    expect(result.data.orders[0].id).toBe('15012345');
  });

  it('rejects an empty CREATE response rather than treating it as success', () => {
    const result = parseBigBuyOrderCreateResponse({ orders: [], errors: [] });
    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('keeps order submission blocked on runtime, PII, idempotency and recovery evidence', () => {
    expect(BIGBUY_TRANSACTIONAL_ENDPOINTS.orderCheck).toBe('/rest/order/check/multishipping.json');
    expect(BIGBUY_TRANSACTIONAL_ENDPOINTS.orderCreate).toBe('/rest/order/create/multishipping.json');
    expect(BIGBUY_ORDER_SUBMISSION_BLOCKERS).toContain('bigbuy_idempotency_contract_missing');
    expect(BIGBUY_ORDER_SUBMISSION_BLOCKERS).toContain('bigbuy_lost_response_recovery_contract_missing');
    expect(BIGBUY_ORDER_SUBMISSION_BLOCKERS).toContain('bigbuy_partial_creation_reconciliation_not_runtime_verified');
  });
});
