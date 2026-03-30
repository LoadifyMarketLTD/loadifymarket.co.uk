/**
 * src/data/categoryImages.ts
 *
 * SINGLE SOURCE OF TRUTH for all category images.
 *
 * • categoryImages  — keyed by category slug (used in section components)
 * • categoryImageById — keyed by database category ID (used in ProductCard)
 *
 * To add or change a category image, update this file only.
 */

/** Category images keyed by URL slug */
export const categoryImages: Record<string, string> = {
  electronics:       "/images/categories/electronics.jpeg",
  fashion:           "/images/categories/fashion.jpeg",
  "home-kitchen":    "/images/categories/home-kitchen.jpeg",
  beauty:            "/images/categories/beauty.jpeg",
  "tools-diy":       "/images/categories/tools-diy.jpeg",
  "toys-games":      "/images/categories/toys-games.jpeg",
  "health-wellness": "/images/categories/health-wellness.jpeg",
  automotive:        "/images/categories/automotive.jpeg",
  "office-supplies": "/images/categories/office-supplies.jpeg",
};

/** Category images keyed by database category ID */
export const categoryImageById: Record<string, string> = {
  "cat-electronics":    categoryImages.electronics,
  "cat-clothing":       categoryImages.fashion,
  "cat-shoes":          categoryImages.fashion,
  "cat-jewellery":      categoryImages.fashion,
  "cat-accessories":    categoryImages.fashion,
  "cat-toys":           categoryImages["toys-games"],
  "cat-health-beauty":  categoryImages.beauty,
  "cat-pets":           categoryImages["health-wellness"],
  // Collectibles/memorabilia: no dedicated image; electronics is the closest match
  "cat-memorabilia":    categoryImages.electronics,
  // Mixed lots: broad home/household representation
  "cat-mixed-lots":     categoryImages["home-kitchen"],
  "cat-food-drink":     categoryImages["home-kitchen"],
  "cat-office":         categoryImages["office-supplies"],
  "cat-home-garden":    categoryImages["home-kitchen"],
  "cat-sports-outdoors": categoryImages["health-wellness"],
  // Adult category: fashion/apparel is the nearest available visual
  "cat-adult":          categoryImages.fashion,
};

/** Fallback image when no category match is found */
export const DEFAULT_CATEGORY_IMAGE = categoryImages.electronics;
