import { describe, expect, it } from 'vitest';
import { isSellerLowStock, isSellerOutOfStock } from '../../../src/lib/sellerInventory';

describe('seller inventory attention rules', () => {
  it('does not flag one-of-a-kind listings as low stock while their unit is available', () => {
    expect(isSellerLowStock({ stockQuantity: 1, isUnique: true })).toBe(false);
    expect(isSellerOutOfStock({ stockQuantity: 1, isUnique: true })).toBe(false);
  });

  it('still marks a sold-out one-of-a-kind listing as out of stock', () => {
    expect(isSellerLowStock({ stockQuantity: 0, isUnique: true })).toBe(false);
    expect(isSellerOutOfStock({ stockQuantity: 0, isUnique: true })).toBe(true);
  });

  it('flags ordinary tracked listings at five units or fewer', () => {
    expect(isSellerLowStock({ stockQuantity: 5, isUnique: false })).toBe(true);
    expect(isSellerLowStock({ stockQuantity: 6, isUnique: false })).toBe(false);
  });

  it('never treats reusable service listings as low or out of stock', () => {
    expect(isSellerLowStock({ listingContext: 'service', stockQuantity: 1 })).toBe(false);
    expect(isSellerOutOfStock({ listingContext: 'service', stockQuantity: 0 })).toBe(false);
  });
});
