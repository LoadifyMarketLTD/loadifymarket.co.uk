/**
 * SINGLE SOURCE OF TRUTH for root/category imagery.
 *
 * Reserve uses a local/bundled category-image layer so navigation does not
 * depend on third-party hotlinks. The primary repo already has a same-origin
 * library under public/images/categories, so that local layer is authoritative.
 */

export const categoryImages: Record<string, string> = {
  // Canonical 16x96 taxonomy
  electronics: "/images/categories/electronics.jpeg",
  clothing: "/images/categories/fashion.jpeg",
  home: "/images/categories/home-kitchen.jpeg",
  "health-beauty": "/images/categories/beauty.jpeg",
  toys: "/images/categories/toys-games.jpeg",
  "food-drink": "/images/categories/food-drink.jpeg",
  tools: "/images/categories/tools-diy.jpeg",
  sports: "/images/categories/sports.jpeg",
  automotive: "/images/categories/automotive.jpeg",
  office: "/images/categories/office-supplies.jpeg",

  // Dedicated primary-site files for these six families are still missing.
  // Keep the source same-origin and non-broken until the exact Reserve assets
  // are physically ported and approved.
  baby: "/hero-marketplace.jpg",
  jewellery: "/hero-gold.jpeg",
  "mixed-pallets": "/hero-marketplace.jpg",
  returns: "/images/deals-hero.jpg",
  overstock: "/hero-marketplace.jpg",
  clearance: "/images/deals-hero.jpg",

  // Existing/legacy taxonomy aliases
  "large-letter-items": "/images/categories/office-supplies.jpeg",
  garden: "/images/categories/home-kitchen.jpeg",
  diy: "/images/categories/tools-diy.jpeg",
  cleaning: "/images/categories/home-kitchen.jpeg",
  "party-gift": "/images/deals-hero.jpg",
  "wholesale-pound-lines": "/images/deals-hero.jpg",
  "leisure-hobbies": "/images/categories/sports.jpeg",
  "baby-supplies": "/hero-marketplace.jpg",
  kitchenware: "/images/categories/home-kitchen.jpeg",
  homeware: "/images/categories/home-kitchen.jpeg",
  electrical: "/images/categories/electronics.jpeg",
  "pet-supplies": "/hero-marketplace.jpg",
  stationery: "/images/categories/office-supplies.jpeg",
  seasonal: "/images/deals-hero.jpg",
  "wholesale-clothing": "/images/categories/fashion.jpeg",
  fashion: "/images/categories/fashion.jpeg",
  "home-kitchen": "/images/categories/home-kitchen.jpeg",
  beauty: "/images/categories/beauty.jpeg",
  "tools-diy": "/images/categories/tools-diy.jpeg",
  "toys-games": "/images/categories/toys-games.jpeg",
  "health-wellness": "/images/categories/sports.jpeg",
  "office-supplies": "/images/categories/office-supplies.jpeg",
};

export const categoryImageById: Record<string, string> = {
  "cat-electronics": categoryImages.electronics,
  "cat-clothing": categoryImages.clothing,
  "cat-shoes": categoryImages.clothing,
  "cat-jewellery": categoryImages.jewellery,
  "cat-accessories": categoryImages.clothing,
  "cat-toys": categoryImages.toys,
  "cat-health-beauty": categoryImages["health-beauty"],
  "cat-pets": categoryImages["pet-supplies"],
  "cat-memorabilia": categoryImages.electronics,
  "cat-mixed-lots": categoryImages["mixed-pallets"],
  "cat-food-drink": categoryImages["food-drink"],
  "cat-office": categoryImages.office,
  "cat-home-garden": categoryImages.home,
  "cat-sports-outdoors": categoryImages.sports,
  "cat-adult": categoryImages.clothing,
};

export const DEFAULT_CATEGORY_IMAGE = "/hero-marketplace.jpg";

export const imageForCategoryKey = (key?: string | null) =>
  (key && categoryImages[key]) || DEFAULT_CATEGORY_IMAGE;
