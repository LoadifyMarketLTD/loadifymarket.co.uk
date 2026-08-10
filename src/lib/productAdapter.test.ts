import { describe, expect, it } from 'vitest';
import {
  adaptProducts,
  getDBProductAvailability,
  isSellableDBProduct,
  type DBProduct,
} from './productAdapter';

function product(overrides: Partial<DBProduct> = {}): DBProduct {
  return {
    id: 'product-1',
    title: 'Test product',
    price: 120,
    priceExVat: 100,
    images: [],
    condition: 'new',
    stockQuantity: 5,
    views: 0,
    rating: 0,
    reviewCount: 0,
    createdAt: '2026-08-10T12:00:00.000Z',
    sellerId: 'seller-1',
    isActive: true,
    isApproved: true,
    listingStatus: 'active',
    listingContext: 'product',
    stockStatus: 'in_stock',
    ...overrides,
  };
}

describe('getDBProductAvailability', () => {
  it('allows an active approved physical listing with positive stock', () => {
    expect(getDBProductAvailability(product())).toEqual({ isAvailable: true });
    expect(isSellableDBProduct(product())).toBe(true);
  });

  it('blocks inactive and unapproved listings', () => {
    expect(getDBProductAvailability(product({ isActive: false })).isAvailable).toBe(false);
    expect(getDBProductAvailability(product({ isApproved: false })).isAvailable).toBe(false);
  });

  it('blocks reserved listings even when stock remains', () => {
    const result = getDBProductAvailability(product({ listingStatus: 'reserved' }));
    expect(result.isAvailable).toBe(false);
    expect(result.message).toMatch(/reserved/i);
  });

  it('blocks sold listings', () => {
    const result = getDBProductAvailability(product({ listingStatus: 'sold' }));
    expect(result.isAvailable).toBe(false);
    expect(result.message).toMatch(/sold/i);
  });

  it('blocks physical listings with zero stock', () => {
    const result = getDBProductAvailability(
      product({ stockQuantity: 0, stockStatus: 'out_of_stock' }),
    );
    expect(result).toEqual({ isAvailable: false, message: 'Out of stock.' });
  });

  it('does not apply physical stock rules to service listings', () => {
    const result = getDBProductAvailability(
      product({ listingContext: 'service', stockQuantity: 0, stockStatus: 'in_stock' }),
    );
    expect(result).toEqual({ isAvailable: true });
  });
});

describe('adaptProducts', () => {
  it('removes unavailable listings from public product grids', () => {
    const rows = [
      product({ id: 'available' }),
      product({ id: 'reserved', listingStatus: 'reserved' }),
      product({ id: 'out-of-stock', stockQuantity: 0, stockStatus: 'out_of_stock' }),
      product({ id: 'service', listingContext: 'service', stockQuantity: 0 }),
    ];

    expect(adaptProducts(rows).map((row) => row.id)).toEqual(['available', 'service']);
  });
});
