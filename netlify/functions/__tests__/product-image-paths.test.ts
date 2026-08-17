import { describe, expect, it } from 'vitest';
import { extractOwnedProductImagePath } from '../_shared/productImagePaths';

const SUPABASE_URL = 'https://test.supabase.co';

describe('product image path ownership', () => {
  it('extracts only Loadify product-image paths owned by the seller', () => {
    expect(extractOwnedProductImagePath(
      'https://test.supabase.co/storage/v1/object/public/product-images/sellers/seller-1/photo.jpg',
      SUPABASE_URL,
      'seller-1',
    )).toBe('sellers/seller-1/photo.jpg');
  });

  it('rejects external, other-seller and non-product-image URLs', () => {
    expect(extractOwnedProductImagePath('https://example.com/photo.jpg', SUPABASE_URL, 'seller-1')).toBeNull();
    expect(extractOwnedProductImagePath(
      'https://test.supabase.co/storage/v1/object/public/product-images/sellers/seller-2/photo.jpg',
      SUPABASE_URL,
      'seller-1',
    )).toBeNull();
    expect(extractOwnedProductImagePath(
      'https://test.supabase.co/storage/v1/object/public/other-bucket/sellers/seller-1/photo.jpg',
      SUPABASE_URL,
      'seller-1',
    )).toBeNull();
  });

  it('fails closed for malformed URLs', () => {
    expect(extractOwnedProductImagePath('not-a-url', SUPABASE_URL, 'seller-1')).toBeNull();
  });
});
