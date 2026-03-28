import type { Product } from '../types';

/**
 * Minimal product fields required to resolve a category fallback image.
 * Both `categoryId` and `type` are used so that products without a
 * recognised category still receive a sensible visual (e.g. a pallet
 * image for bulk/pallet listings).
 */
export type CategoryImageProduct = Pick<Product, 'categoryId' | 'type'>;

/** Shared storage image for bulk-type categories and the default fallback. */
const WAREHOUSE_IMAGE = '/images/products/toolset.jpg';

/**
 * Local fallback images keyed by category ID.
 * These are used when a product listing has no uploaded image, so that
 * product cards never display a bare placeholder icon.
 *
 * Category IDs must match the values seeded in database-seed-categories.sql.
 * To add a new category, insert its id → local path here.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  'cat-electronics':    '/images/categories/electronics.jpg',
  'cat-clothing':       '/images/categories/fashion.jpg',
  'cat-shoes':          '/images/categories/fashion.jpg',
  'cat-jewellery':      '/images/products/handbag.jpg',
  'cat-accessories':    '/images/products/handbag.jpg',
  'cat-toys':           '/images/categories/toys-games.jpg',
  'cat-health-beauty':  '/images/categories/beauty.jpg',
  'cat-pets':           '/images/categories/health-wellness.jpg',
  'cat-memorabilia':    '/images/products/sample-listing.jpg',
  'cat-mixed-lots':     WAREHOUSE_IMAGE,
  'cat-food-drink':     '/images/categories/health-wellness.jpg',
  'cat-office':         '/images/categories/office-supplies.jpg',
  'cat-home-garden':    '/images/categories/home-kitchen.jpg',
  'cat-sports-outdoors': '/images/categories/health-wellness.jpg',
  'cat-adult':          '/images/products/sample-listing.jpg',
};

/**
 * Fallback images keyed by product `type` — used when no category-specific
 * image is defined (or when `categoryId` is absent).
 */
const TYPE_IMAGES: Record<string, string> = {
  handmade:  '/images/products/sample-listing.jpg',
  logistics: '/images/categories/automotive.jpg',
  pallet:    WAREHOUSE_IMAGE,
  lot:       WAREHOUSE_IMAGE,
  wholesale: WAREHOUSE_IMAGE,
  clearance: WAREHOUSE_IMAGE,
};

/** Generic warehouse image shown when neither category nor type has a mapping. */
const DEFAULT_IMAGE = WAREHOUSE_IMAGE;

/**
 * Returns the best available fallback image URL for a product that has no
 * uploaded images.
 *
 * Resolution order:
 * 1. Category-specific image (via `product.categoryId`)
 * 2. Product-type image (via `product.type`)
 * 3. Generic warehouse / pallet image
 */
export function getCategoryFallbackImage(product: CategoryImageProduct): string {
  return (
    CATEGORY_IMAGES[product.categoryId] ??
    TYPE_IMAGES[product.type] ??
    DEFAULT_IMAGE
  );
}
