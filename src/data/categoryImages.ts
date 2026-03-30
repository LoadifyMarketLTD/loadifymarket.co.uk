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

/** Category images keyed by URL slug — real product photos from Unsplash CDN */
export const categoryImages: Record<string, string> = {
  electronics:       "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  fashion:           "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  "home-kitchen":    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  beauty:            "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  "tools-diy":       "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
  "toys-games":      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
  "health-wellness": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  automotive:        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
  "office-supplies": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
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
  // Collectibles/memorabilia: maps to electronics as a neutral, non-misleading visual
  // until a dedicated memorabilia image is added
  "cat-memorabilia":    categoryImages.electronics,
  // Mixed lots: broad home/household representation
  "cat-mixed-lots":     categoryImages["home-kitchen"],
  "cat-food-drink":     categoryImages["home-kitchen"],
  "cat-office":         categoryImages["office-supplies"],
  "cat-home-garden":    categoryImages["home-kitchen"],
  "cat-sports-outdoors": categoryImages["health-wellness"],
  // Adult category: maps to fashion as a neutral fallback; no explicit adult category image
  // is served — update this mapping when a suitable image is added
  "cat-adult":          categoryImages.fashion,
};

/** Fallback image when no category match is found */
export const DEFAULT_CATEGORY_IMAGE = categoryImages.electronics;
