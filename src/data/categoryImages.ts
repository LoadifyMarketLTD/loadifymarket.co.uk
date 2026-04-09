/**
 * src/data/categoryImages.ts
 *
 * SINGLE SOURCE OF TRUTH for all category images used by product cards and adapters.
 *
 * • categoryImages  — keyed by category slug (used in section components)
 * • categoryImageById — keyed by database category ID (used in ProductCard)
 *
 * To add or change a category image, update this file only.
 */

/** Category images keyed by URL slug — real product photos from Unsplash CDN */
export const categoryImages: Record<string, string> = {
  // ── Wholesale marketplace categories (current taxonomy) ──────────────────
  "large-letter-items":   "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=800&q=80",
  "garden":               "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
  "diy":                  "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
  "cleaning":             "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",
  "party-gift":           "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
  "wholesale-pound-lines":"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
  "toys":                 "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
  "leisure-hobbies":      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  "baby-supplies":        "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80",
  "kitchenware":          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  "health-beauty":        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  "homeware":             "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=800&q=80",
  "electrical":           "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  "pet-supplies":         "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=800&q=80",
  "stationery":           "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  "seasonal":             "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80",
  "wholesale-clothing":   "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",

  // ── Legacy slugs (kept for backward compat with any existing DB records) ─
  electronics:            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  fashion:                "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  "home-kitchen":         "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
  beauty:                 "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
  "tools-diy":            "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
  "toys-games":           "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
  "health-wellness":      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  automotive:             "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
  "office-supplies":      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
};

/** Category images keyed by database category ID */
export const categoryImageById: Record<string, string> = {
  "cat-electronics":      categoryImages.electrical,
  "cat-clothing":         categoryImages["wholesale-clothing"],
  "cat-shoes":            categoryImages["wholesale-clothing"],
  "cat-jewellery":        categoryImages["wholesale-clothing"],
  "cat-accessories":      categoryImages["wholesale-clothing"],
  "cat-toys":             categoryImages.toys,
  "cat-health-beauty":    categoryImages["health-beauty"],
  "cat-pets":             categoryImages["pet-supplies"],
  "cat-memorabilia":      categoryImages.electrical,
  "cat-mixed-lots":       categoryImages["wholesale-pound-lines"],
  "cat-food-drink":       categoryImages["wholesale-pound-lines"],
  "cat-office":           categoryImages.stationery,
  "cat-home-garden":      categoryImages.homeware,
  "cat-sports-outdoors":  categoryImages["leisure-hobbies"],
  "cat-adult":            categoryImages["wholesale-clothing"],
};

/** Fallback image when no category match is found */
export const DEFAULT_CATEGORY_IMAGE = categoryImages["wholesale-pound-lines"];
