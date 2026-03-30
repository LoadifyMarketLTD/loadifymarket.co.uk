import type { Product } from '../types';
import { categoryImageById, DEFAULT_CATEGORY_IMAGE } from '@/data/categoryImages';

/**
 * Minimal product fields required to resolve a category fallback image.
 */
export type CategoryImageProduct = Pick<Product, 'categoryId'>;

/**
 * Returns the category image URL for a product that has no uploaded images.
 * Resolution is based on the product's categoryId only — no type-based
 * (pallet / clearance / wholesale) overrides.
 */
export function getCategoryFallbackImage(product: CategoryImageProduct): string {
  return categoryImageById[product.categoryId] ?? DEFAULT_CATEGORY_IMAGE;
}
