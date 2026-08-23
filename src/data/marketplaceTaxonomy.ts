/** Canonical marketplace visual taxonomy imported from the Official Reserve. */
export interface MarketplaceTaxonomyCategory {
  label: string;
  imageKey: string;
  subcategories: string[];
}

export const marketplaceTaxonomy: MarketplaceTaxonomyCategory[] = [
  { label: "Electronics & Technology", imageKey: "electronics", subcategories: ["Phones & Tablets", "Laptops & PCs", "TV & Audio", "Gaming Consoles", "Accessories", "Smart Home"] },
  { label: "Clothing & Apparel", imageKey: "clothing", subcategories: ["Men's Clothing", "Women's Clothing", "Children's Clothing", "Footwear", "Accessories & Bags", "Sportswear"] },
  { label: "Home & Garden", imageKey: "home", subcategories: ["Furniture", "Kitchen & Dining", "Bedding & Linen", "Garden & Outdoor", "Lighting", "Décor & Accessories"] },
  { label: "Health & Beauty", imageKey: "health-beauty", subcategories: ["Skincare", "Haircare", "Makeup & Cosmetics", "Fragrances", "Health & Wellness", "Personal Care"] },
  { label: "Toys & Games", imageKey: "toys", subcategories: ["Action Figures", "Board Games", "Educational Toys", "Outdoor Toys", "Dolls & Playsets", "Puzzles"] },
  { label: "Food & Drink", imageKey: "food-drink", subcategories: ["Snacks & Confectionery", "Beverages", "Canned & Dry Goods", "Health Foods", "Specialty & Gourmet", "Seasonal"] },
  { label: "Tools & DIY", imageKey: "tools", subcategories: ["Power Tools", "Hand Tools", "Plumbing", "Electrical", "Paint & Decorating", "Fixings & Hardware"] },
  { label: "Sports & Leisure", imageKey: "sports", subcategories: ["Fitness Equipment", "Cycling", "Camping & Hiking", "Water Sports", "Team Sports", "Leisure & Travel"] },
  { label: "Automotive", imageKey: "automotive", subcategories: ["Car Parts", "Car Accessories", "Cleaning & Valeting", "Tools & Equipment", "Oils & Fluids", "Tyres & Wheels"] },
  { label: "Office & Stationery", imageKey: "office", subcategories: ["Office Furniture", "Printers & Ink", "Paper & Supplies", "Office Tech", "Filing & Storage", "Pens & Writing"] },
  { label: "Baby & Nursery", imageKey: "baby", subcategories: ["Prams & Pushchairs", "Baby Clothing", "Feeding", "Nursery Furniture", "Toys (0-3 yrs)", "Safety & Care"] },
  { label: "Jewellery & Watches", imageKey: "jewellery", subcategories: ["Necklaces & Pendants", "Rings & Earrings", "Bracelets", "Watches", "Fashion Jewellery", "Accessories"] },
  { label: "Mixed Lots", imageKey: "mixed-pallets", subcategories: ["General Mixed", "Department Store Returns", "Amazon Returns", "Seasonal Mixed", "High Value Mixed", "Liquidation Lots"] },
  { label: "Customer Returns", imageKey: "returns", subcategories: ["Electronics Returns", "Clothing Returns", "Home Returns", "Appliance Returns", "Graded Returns", "Unchecked Returns"] },
  { label: "Overstock", imageKey: "overstock", subcategories: ["Brand Overstock", "Seasonal Overstock", "End of Line", "Excess Inventory", "Wholesale Lots", "Bulk Deals"] },
  { label: "Clearance Deals", imageKey: "clearance", subcategories: ["Flash Sales", "Closing Down Stock", "Damaged Packaging", "Short Dated", "Sample Stock", "One-Off Deals"] },
];

export const marketplaceCategorySlug = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const marketplaceSubcategorySlug = (category: string, subcategory: string) =>
  `${marketplaceCategorySlug(category)}-${marketplaceCategorySlug(subcategory)}`;
