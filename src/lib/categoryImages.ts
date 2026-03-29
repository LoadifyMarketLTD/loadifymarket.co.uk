import type { Product } from '../types';

/**
 * Minimal product fields required to resolve a category fallback image.
 * Both `categoryId` and `type` are used so that products without a
 * recognised category still receive a sensible visual (e.g. a pallet
 * image for bulk/pallet listings).
 */
export type CategoryImageProduct = Pick<Product, 'categoryId' | 'type'>;

/** Shared storage image for bulk-type categories and the default fallback. */
const WAREHOUSE_IMAGE = '/images/products/toolset.jpeg';

/**
 * Local fallback images keyed by category ID.
 * These are used when a product listing has no uploaded image, so that
 * product cards never display a bare placeholder icon.
 *
 * Category IDs must match the values seeded in database-seed-categories.sql.
 * To add a new category, insert its id → local path here.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  'cat-electronics':    '/images/categories/electronics.jpeg',
  'cat-clothing':       '/images/categories/fashion.jpeg',
  'cat-shoes':          '/images/categories/fashion.jpeg',
  'cat-jewellery':      '/images/products/handbag.jpeg',
  'cat-accessories':    '/images/products/handbag.jpeg',
  'cat-toys':           '/images/categories/toys-games.jpeg',
  'cat-health-beauty':  '/images/categories/beauty.jpeg',
  'cat-pets':           '/images/categories/health-wellness.jpeg',
  'cat-memorabilia':    '/images/products/sample-listing.jpeg',
  'cat-mixed-lots':     WAREHOUSE_IMAGE,
  'cat-food-drink':     '/images/categories/food-drink.jpeg',
  'cat-office':         '/images/categories/office-supplies.jpeg',
  'cat-home-garden':    '/images/categories/home-kitchen.jpeg',
  'cat-sports-outdoors': '/images/categories/sports.jpeg',
  'cat-adult':          '/images/products/sample-listing.jpeg',
};

/**
 * Fallback images keyed by product `type` — used when no category-specific
 * image is defined (or when `categoryId` is absent).
 */
const TYPE_IMAGES: Record<string, string> = {
  handmade:  '/images/products/sample-listing.jpeg',
  logistics: '/images/categories/automotive.jpeg',
  pallet:    WAREHOUSE_IMAGE,
  lot:       WAREHOUSE_IMAGE,
  wholesale: WAREHOUSE_IMAGE,
  clearance: WAREHOUSE_IMAGE,
};

/** Generic fallback image shown when neither category nor type has a mapping. */
const DEFAULT_IMAGE = WAREHOUSE_IMAGE;

/**
 * Returns the best available fallback image URL for a product that has no
 * uploaded images.
 *
 * Resolution order:
 * 1. Category-specific image (via `product.categoryId`)
 * 2. Product-type image (via `product.type`)
 * 3. Generic fallback image
 */
export function getCategoryFallbackImage(product: CategoryImageProduct): string {
  return (
    CATEGORY_IMAGES[product.categoryId] ??
    TYPE_IMAGES[product.type] ??
    DEFAULT_IMAGE
  );
}
