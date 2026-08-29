import { describe, expect, it } from 'vitest';
import {
  AVASAM_VERIFIED_ENDPOINTS,
  createInventoryFilterRequest,
  createSellerProductListRequest,
  createSellerStockRequest,
  parseInventoryListResponse,
  parseSellerProductListResponse,
  parseSellerStockResponse,
  parseStockWebhookEnvelope,
} from '../_shared/avasamContracts';

describe('Avasam verified Seller API contracts', () => {
  it('locks the documented read-only endpoint paths', () => {
    expect(AVASAM_VERIFIED_ENDPOINTS).toEqual({
      requestToken: '/api/auth/request-token',
      getSellerProductList: '/apiseeker/Products/GetSellerProductList',
      getInventoryListWithFilter: '/apiseeker/ProductModule/GetInventoryListWithFilter',
      sellerStockList: '/apiseeker/Products/SellerStockList',
      acknowledgeStockUpdate: '/api-seller/Product/AcknowledgeStockUpdate',
    });
  });

  it('builds the documented GetSellerProductList pagination request', () => {
    expect(createSellerProductListRequest(0, 10)).toEqual({ Page: 0, Limit: 10 });
    expect(() => createSellerProductListRequest(-1, 10)).toThrow();
    expect(() => createSellerProductListRequest(0, 0)).toThrow();
  });

  it('accepts a documented seller product row and rejects missing commercial truth', () => {
    const ok = parseSellerProductListResponse([{
      SKU: 'K314CP',
      Price: 16.66,
      Title: '2 pc. Frying Pan Set',
      BarCode: '5.06005E+12',
      Vat: 20,
      RetailPrice: 24.99,
      Category: '25105102',
      ProductWeight: 1.25,
      ProductImage: ['https://example.invalid/image.jpg'],
      IsVariation: false,
    }]);
    expect(ok.ok).toBe(true);

    const malformed = parseSellerProductListResponse([{ SKU: 'K314CP' }]);
    expect(malformed.ok).toBe(false);
    expect(malformed && !malformed.ok ? malformed.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('builds the documented inventory filter envelope without forcing variation-only mode', () => {
    expect(createInventoryFilterRequest(0, 1000)).toEqual({
      ProductType: [],
      Supplier: '',
      Sortby: 'SKU',
      SortStatus: 'down',
      limit: 1000,
      PriceDelimeter: '0',
      PriceValue: 0,
      StockValue: '0',
      Stock: 0,
      Category: '',
      CategoryName: '',
      IsMapped: '',
      PriceMaxValue: 0,
      PriceMaxDelimeter: '0',
      page: 0,
    });
  });

  it('accepts inventory rows only when SKU, price and stock are explicit numbers', () => {
    const ok = parseInventoryListResponse({
      data: [{
        SKU: '2358Green',
        Price: 4.68,
        RetailPrice: 6.55,
        Stock: 400,
        Number: 'ZIZ002358_Green',
        VATPercentage: 20,
        PriceIncVat: 5.616,
        IsActive: false,
        HasVariations: false,
        isMapped: false,
      }],
      total: 131,
    });
    expect(ok.ok).toBe(true);

    const malformed = parseInventoryListResponse({ data: [{ SKU: '2358Green', Price: 4.68 }], total: 1 });
    expect(malformed.ok).toBe(false);
    expect(malformed && !malformed.ok ? malformed.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('parses SellerStockList without converting missing stock into zero', () => {
    expect(parseSellerStockResponse([{ SKU: 'K314CP', Stock: 12 }])).toEqual({
      ok: true,
      data: [{ SKU: 'K314CP', Stock: 12 }],
    });
    expect(parseSellerStockResponse([{ SKU: 'K314CP' }]).ok).toBe(false);
    expect(createSellerStockRequest(0, 10)).toEqual({ limit: 10, page: 0 });
  });

  it('parses the documented stock webhook envelope but does not claim JWT verification', () => {
    const result = parseStockWebhookEnvelope({
      requestId: 'request-1',
      on: '2026-08-29T14:00:00Z',
      token: 'signed-provider-token',
      data: [{ sku: 'K314CP', quantity: 9, updatedOn: '2026-08-29T14:00:00Z' }],
    });
    expect(result.ok).toBe(true);
    expect(parseStockWebhookEnvelope({ requestId: 'request-1', data: [] }).ok).toBe(false);
  });
});
