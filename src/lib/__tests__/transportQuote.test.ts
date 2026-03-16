import { describe, it, expect } from 'vitest';
import { buildTransportQuoteUrl, buildXDriveAppUrl } from '../transportQuote';

const minProduct = { id: 'prod-1', title: 'Test Pallet', weight: undefined };

describe('buildTransportQuoteUrl', () => {
  it('includes listing id and title', () => {
    const url = buildTransportQuoteUrl(minProduct);
    expect(url).toContain('listing=prod-1');
    expect(url).toContain('title=Test+Pallet');
  });

  it('always appends source=loadify-market', () => {
    const url = buildTransportQuoteUrl(minProduct);
    expect(url).toContain('source=loadify-market');
  });

  it('starts with /transport-quote', () => {
    const url = buildTransportQuoteUrl(minProduct);
    expect(url.startsWith('/transport-quote?')).toBe(true);
  });

  it('includes pallets when palletInfo is set', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, palletInfo: { palletCount: 3 } });
    expect(url).toContain('pallets=3');
  });

  it('omits pallets when palletInfo is null', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, palletInfo: null });
    expect(url).not.toContain('pallets');
  });

  it('includes weight when set', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, weight: 500 });
    expect(url).toContain('weight=500');
  });

  it('includes category when set', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, categoryId: 'cat-abc' });
    expect(url).toContain('category=cat-abc');
  });

  it('includes qty when stockQuantity > 0', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, stockQuantity: 10 });
    expect(url).toContain('qty=10');
  });

  it('omits qty when stockQuantity is 0', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, stockQuantity: 0 });
    expect(url).not.toContain('qty');
  });

  it('includes sellerId when set', () => {
    const url = buildTransportQuoteUrl({ ...minProduct, sellerId: 'seller-1' });
    expect(url).toContain('sellerId=seller-1');
  });

  it('prefers businessName over storeName for sellerName', () => {
    const url = buildTransportQuoteUrl({
      ...minProduct,
      seller: { businessName: 'Biz Name', storeName: 'Store Name' },
    });
    expect(url).toContain('sellerName=Biz+Name');
  });

  it('falls back to storeName when businessName is absent', () => {
    const url = buildTransportQuoteUrl({
      ...minProduct,
      seller: { storeName: 'Store Name' },
    });
    expect(url).toContain('sellerName=Store+Name');
  });

  it('logistics pickup overrides seller location for pickup', () => {
    const url = buildTransportQuoteUrl({
      ...minProduct,
      seller: { location: 'London' },
      logisticsInfo: { pickupLocation: 'Manchester' },
    });
    expect(url).toContain('pickup=Manchester');
    expect(url).not.toContain('pickup=London');
  });

  it('includes dropoff from logisticsInfo', () => {
    const url = buildTransportQuoteUrl({
      ...minProduct,
      logisticsInfo: { deliveryLocation: 'Birmingham' },
    });
    expect(url).toContain('dropoff=Birmingham');
  });
});

describe('buildXDriveAppUrl', () => {
  it('returns base URL when no params are given', () => {
    expect(buildXDriveAppUrl({})).toBe('https://app.xdrivelogistics.co.uk/');
  });

  it('appends non-empty params as query string', () => {
    const url = buildXDriveAppUrl({ ref: 'abc', listing: 'prod-1' });
    expect(url).toContain('ref=abc');
    expect(url).toContain('listing=prod-1');
  });

  it('omits params with undefined values', () => {
    const url = buildXDriveAppUrl({ ref: 'abc', listing: undefined });
    expect(url).not.toContain('listing');
  });

  it('omits params with empty string values', () => {
    const url = buildXDriveAppUrl({ ref: 'abc', title: '' });
    expect(url).not.toContain('title');
  });
});
