/**
 * SINGLE SOURCE OF TRUTH for root/category imagery.
 *
 * The canonical 16 root images below are copied byte-for-byte from the
 * focused-image-craft Reserve and served same-origin from /public.
 */

export const categoryImages: Record<string, string> = {
  // Canonical 16x96 taxonomy — exact Reserve root assets
  electronics: "/images/categories/electronics.jpg",
  clothing: "/images/categories/clothing.jpg",
  home: "/images/categories/home.jpg",
  "health-beauty": "/images/categories/health-beauty.jpg",
  toys: "/images/categories/toys.jpg",
  "food-drink": "/images/categories/food-drink.jpg",
  tools: "/images/categories/tools.jpg",
  sports: "/images/categories/sports.jpg",
  automotive: "/images/categories/automotive.jpg",
  office: "/images/categories/office.jpg",
  baby: "/images/categories/baby.jpg",
  jewellery: "/images/categories/jewellery.jpg",
  "mixed-pallets": "/images/categories/mixed-pallets.jpg",
  returns: "/images/categories/returns.jpg",
  overstock: "/images/categories/overstock.jpg",
  clearance: "/images/categories/clearance.jpg",

  // Existing/legacy taxonomy aliases resolve into the same local library.
  "large-letter-items": "/images/categories/office.jpg",
  garden: "/images/categories/home.jpg",
  diy: "/images/categories/tools.jpg",
  cleaning: "/images/categories/home.jpg",
  "party-gift": "/images/categories/clearance.jpg",
  "wholesale-pound-lines": "/images/categories/mixed-pallets.jpg",
  "leisure-hobbies": "/images/categories/sports.jpg",
  "baby-supplies": "/images/categories/baby.jpg",
  kitchenware: "/images/categories/home.jpg",
  homeware: "/images/categories/home.jpg",
  electrical: "/images/categories/electronics.jpg",
  "pet-supplies": "/images/categories/home.jpg",
  stationery: "/images/categories/office.jpg",
  seasonal: "/images/categories/clearance.jpg",
  "wholesale-clothing": "/images/categories/clothing.jpg",
  fashion: "/images/categories/clothing.jpg",
  "home-kitchen": "/images/categories/home.jpg",
  beauty: "/images/categories/health-beauty.jpg",
  "tools-diy": "/images/categories/tools.jpg",
  "toys-games": "/images/categories/toys.jpg",
  "health-wellness": "/images/categories/health-beauty.jpg",
  "office-supplies": "/images/categories/office.jpg",
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

export const DEFAULT_CATEGORY_IMAGE = categoryImages["mixed-pallets"];

export const imageForCategoryKey = (key?: string | null) =>
  (key && categoryImages[key]) || DEFAULT_CATEGORY_IMAGE;
