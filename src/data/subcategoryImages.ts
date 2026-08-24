export type SubcategoryImageSource = {
  image: string;
  source: "unsplash" | "loadify-generated";
  license: "Unsplash License" | "Loadify Market editorial asset";
};

const local = (category: string, filename: string) => `/images/subcategories/${category}/${filename}.webp`;
const key = (category: string, subcategory: string) => `${category}::${subcategory}`;

/** Representative editorial navigation imagery only; never product listings. */
export const subcategoryImages: Record<string, SubcategoryImageSource> = {
  [key("Electronics & Technology", "Phones & Tablets")]: { image: local("electronics-technology", "phones-tablets"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Electronics & Technology", "Laptops & PCs")]: { image: local("electronics-technology", "laptops-pcs"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Electronics & Technology", "TV & Audio")]: { image: local("electronics-technology", "tv-audio"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Electronics & Technology", "Gaming Consoles")]: { image: local("electronics-technology", "gaming-consoles"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Electronics & Technology", "Accessories")]: { image: local("electronics-technology", "accessories"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Electronics & Technology", "Smart Home")]: { image: local("electronics-technology", "smart-home"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Clothing & Apparel", "Men's Clothing")]: { image: local("clothing-apparel", "mens-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Women's Clothing")]: { image: local("clothing-apparel", "womens-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Children's Clothing")]: { image: local("clothing-apparel", "childrens-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Footwear")]: { image: local("clothing-apparel", "footwear"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Accessories & Bags")]: { image: local("clothing-apparel", "accessories-bags"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clothing & Apparel", "Sportswear")]: { image: local("clothing-apparel", "sportswear"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Home & Garden", "Furniture")]: { image: local("home-garden", "furniture"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Kitchen & Dining")]: { image: local("home-garden", "kitchen-dining"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Bedding & Linen")]: { image: local("home-garden", "bedding-linen"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Garden & Outdoor")]: { image: local("home-garden", "garden-outdoor"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Lighting")]: { image: local("home-garden", "lighting"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Home & Garden", "Décor & Accessories")]: { image: local("home-garden", "decor-accessories"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Health & Beauty", "Skincare")]: { image: local("health-beauty", "skincare"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Haircare")]: { image: local("health-beauty", "haircare"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Makeup & Cosmetics")]: { image: local("health-beauty", "makeup-cosmetics"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Fragrances")]: { image: local("health-beauty", "fragrances"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Health & Wellness")]: { image: local("health-beauty", "health-wellness"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Health & Beauty", "Personal Care")]: { image: local("health-beauty", "personal-care"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Toys & Games", "Action Figures")]: { image: local("toys-games", "action-figures"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Board Games")]: { image: local("toys-games", "board-games"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Educational Toys")]: { image: local("toys-games", "educational-toys"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Outdoor Toys")]: { image: local("toys-games", "outdoor-toys"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Dolls & Playsets")]: { image: local("toys-games", "dolls-playsets"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Toys & Games", "Puzzles")]: { image: local("toys-games", "puzzles"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Food & Drink", "Snacks & Confectionery")]: { image: local("food-drink", "snacks-confectionery"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Beverages")]: { image: local("food-drink", "beverages"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Canned & Dry Goods")]: { image: local("food-drink", "canned-dry-goods"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Health Foods")]: { image: local("food-drink", "health-foods"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Specialty & Gourmet")]: { image: local("food-drink", "specialty-gourmet"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Food & Drink", "Seasonal")]: { image: local("food-drink", "seasonal"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Tools & DIY", "Power Tools")]: { image: local("tools-diy", "power-tools"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Hand Tools")]: { image: local("tools-diy", "hand-tools"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Plumbing")]: { image: local("tools-diy", "plumbing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Electrical")]: { image: local("tools-diy", "electrical"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Paint & Decorating")]: { image: local("tools-diy", "paint-decorating"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Tools & DIY", "Fixings & Hardware")]: { image: local("tools-diy", "fixings-hardware"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Sports & Leisure", "Fitness Equipment")]: { image: local("sports-leisure", "fitness-equipment"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Sports & Leisure", "Cycling")]: { image: local("sports-leisure", "cycling"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Sports & Leisure", "Camping & Hiking")]: { image: local("sports-leisure", "camping-hiking"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Sports & Leisure", "Water Sports")]: { image: local("sports-leisure", "water-sports"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Sports & Leisure", "Team Sports")]: { image: local("sports-leisure", "team-sports"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Sports & Leisure", "Leisure & Travel")]: { image: local("sports-leisure", "leisure-travel"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Automotive", "Car Parts")]: { image: local("automotive", "car-parts"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Automotive", "Car Accessories")]: { image: local("automotive", "car-accessories"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Automotive", "Cleaning & Valeting")]: { image: local("automotive", "cleaning-valeting"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Automotive", "Tools & Equipment")]: { image: local("automotive", "tools-equipment"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Automotive", "Oils & Fluids")]: { image: local("automotive", "oils-fluids"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Automotive", "Tyres & Wheels")]: { image: local("automotive", "tyres-wheels"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Office & Stationery", "Office Furniture")]: { image: local("office-stationery", "office-furniture"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Office & Stationery", "Printers & Ink")]: { image: local("office-stationery", "printers-ink"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Office & Stationery", "Paper & Supplies")]: { image: local("office-stationery", "paper-supplies"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Office & Stationery", "Office Tech")]: { image: local("office-stationery", "office-tech"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Office & Stationery", "Filing & Storage")]: { image: local("office-stationery", "filing-storage"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Office & Stationery", "Pens & Writing")]: { image: local("office-stationery", "pens-writing"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Baby & Nursery", "Prams & Pushchairs")]: { image: local("baby-nursery", "prams-pushchairs"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Baby & Nursery", "Baby Clothing")]: { image: local("baby-nursery", "baby-clothing"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Baby & Nursery", "Feeding")]: { image: local("baby-nursery", "feeding"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Baby & Nursery", "Nursery Furniture")]: { image: local("baby-nursery", "nursery-furniture"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Baby & Nursery", "Toys (0-3 yrs)")]: { image: local("baby-nursery", "toys-0-3"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Baby & Nursery", "Safety & Care")]: { image: local("baby-nursery", "safety-care"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Jewellery & Watches", "Necklaces & Pendants")]: { image: local("jewellery-watches", "necklaces-pendants"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Jewellery & Watches", "Rings & Earrings")]: { image: local("jewellery-watches", "rings-earrings"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Jewellery & Watches", "Bracelets")]: { image: local("jewellery-watches", "bracelets"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Jewellery & Watches", "Watches")]: { image: local("jewellery-watches", "watches"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Jewellery & Watches", "Fashion Jewellery")]: { image: local("jewellery-watches", "fashion-jewellery"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Jewellery & Watches", "Accessories")]: { image: local("jewellery-watches", "accessories"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Mixed Lots", "General Mixed")]: { image: local("mixed-lots", "general-mixed"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Mixed Lots", "Department Store Returns")]: { image: local("mixed-lots", "department-store-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Mixed Lots", "Amazon Returns")]: { image: local("mixed-lots", "amazon-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Mixed Lots", "Seasonal Mixed")]: { image: local("mixed-lots", "seasonal-mixed"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Mixed Lots", "High Value Mixed")]: { image: local("mixed-lots", "high-value-mixed"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Mixed Lots", "Liquidation Lots")]: { image: local("mixed-lots", "liquidation-lots"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Customer Returns", "Electronics Returns")]: { image: local("customer-returns", "electronics-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Customer Returns", "Clothing Returns")]: { image: local("customer-returns", "clothing-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Customer Returns", "Home Returns")]: { image: local("customer-returns", "home-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Customer Returns", "Appliance Returns")]: { image: local("customer-returns", "appliance-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Customer Returns", "Graded Returns")]: { image: local("customer-returns", "graded-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Customer Returns", "Unchecked Returns")]: { image: local("customer-returns", "unchecked-returns"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Overstock", "Brand Overstock")]: { image: local("overstock", "brand-overstock"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Overstock", "Seasonal Overstock")]: { image: local("overstock", "seasonal-overstock"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Overstock", "End of Line")]: { image: local("overstock", "end-of-line"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Overstock", "Excess Inventory")]: { image: local("overstock", "excess-inventory"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Overstock", "Wholesale Lots")]: { image: local("overstock", "wholesale-lots"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Overstock", "Bulk Deals")]: { image: local("overstock", "bulk-deals"), source: "loadify-generated", license: "Loadify Market editorial asset" },

  [key("Clearance Deals", "Flash Sales")]: { image: local("clearance-deals", "flash-sales"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clearance Deals", "Closing Down Stock")]: { image: local("clearance-deals", "closing-down-stock"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clearance Deals", "Damaged Packaging")]: { image: local("clearance-deals", "damaged-packaging"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clearance Deals", "Short Dated")]: { image: local("clearance-deals", "short-dated"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clearance Deals", "Sample Stock")]: { image: local("clearance-deals", "sample-stock"), source: "loadify-generated", license: "Loadify Market editorial asset" },
  [key("Clearance Deals", "One-Off Deals")]: { image: local("clearance-deals", "one-off-deals"), source: "loadify-generated", license: "Loadify Market editorial asset" },
};

export const imageForSubcategory = (category: string, subcategory: string, fallback: string) =>
  subcategoryImages[key(category, subcategory)]?.image || fallback;

export const hasDedicatedSubcategoryImage = (category: string, subcategory: string) =>
  Boolean(subcategoryImages[key(category, subcategory)]);

export const duplicateDedicatedImagesWithinCategory = (category: string) => {
  const prefix = `${category}::`;
  const images = Object.entries(subcategoryImages).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v.image);
  return images.filter((value, index) => images.indexOf(value) !== index);
};

export const duplicateDedicatedImagesGlobally = () => {
  const images = Object.values(subcategoryImages).map((value) => value.image);
  return images.filter((value, index) => images.indexOf(value) !== index);
};
