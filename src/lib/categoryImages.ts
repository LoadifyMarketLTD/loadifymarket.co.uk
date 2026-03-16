import type { Product } from '../types';

/**
 * Minimal product fields required to resolve a category fallback image.
 * Both `categoryId` and `type` are used so that products without a
 * recognised category still receive a sensible visual (e.g. a pallet
 * image for bulk/logistics listings).
 */
export type CategoryImageProduct = Pick<Product, 'categoryId' | 'type'>;

/** Shared warehouse / pallet image for bulk-type categories and the default fallback. */
const WAREHOUSE_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80&auto=format&fit=crop';

/**
 * High-quality Unsplash fallback images keyed by category ID.
 * These are used when a product listing has no uploaded image, so that
 * product cards never display a bare placeholder icon.
 *
 * Category IDs must match the values seeded in database-seed-categories.sql.
 * To add a new category, insert its id → Unsplash URL here.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  'cat-electronics':
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&auto=format&fit=crop',
  'cat-clothing':
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop',
  'cat-shoes':
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&auto=format&fit=crop',
  'cat-jewellery':
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80&auto=format&fit=crop',
  'cat-accessories':
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80&auto=format&fit=crop',
  'cat-toys':
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80&auto=format&fit=crop',
  'cat-health-beauty':
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80&auto=format&fit=crop',
  'cat-pets':
    'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=600&q=80&auto=format&fit=crop',
  'cat-memorabilia':
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80&auto=format&fit=crop',
  'cat-mixed-lots': WAREHOUSE_IMAGE,
  'cat-food-drink':
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop',
  'cat-office':
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80&auto=format&fit=crop',
  'cat-home-garden':
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80&auto=format&fit=crop',
  'cat-sports-outdoors':
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80&auto=format&fit=crop',
  'cat-adult':
    'https://images.unsplash.com/photo-1558887890-d9a4f0b75c8b?w=600&q=80&auto=format&fit=crop',
};

/**
 * Fallback images keyed by product `type` — used when no category-specific
 * image is defined (or when `categoryId` is absent).
 */
const TYPE_IMAGES: Record<string, string> = {
  handmade:
    'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80&auto=format&fit=crop',
  logistics:
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80&auto=format&fit=crop',
  pallet: WAREHOUSE_IMAGE,
  lot: WAREHOUSE_IMAGE,
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
