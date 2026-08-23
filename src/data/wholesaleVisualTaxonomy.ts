/**
 * Imported from LoadifyMarketLTD/focused-image-craft/src/data/taxonomy.ts
 * as the wholesale visual taxonomy contract for storefront/category imagery.
 *
 * This file is visual/navigation metadata only. It does not mutate the hosted
 * categories table or replace the canonical commerce/category IDs by itself.
 *
 * Contract:
 * - 16 wholesale categories
 * - exactly 6 subcategories per category (96 total)
 * - root images use the original focused-image-craft imageKey mapping
 * - subcategory images remain `subcategory-pending` until a dedicated asset
 *   exists at /category-visuals/subcategories/<slug>.jpg
 */

export type SubcategoryVisualStatus = 'subcategory-pending' | 'dedicated';

export interface WholesaleVisualSubcategory {
  label: string;
  slug: string;
  imagePath: string;
  status: SubcategoryVisualStatus;
}

export interface WholesaleVisualCategory {
  label: string;
  slug: string;
  imageKey: string;
  imagePath: string;
  subcategories: WholesaleVisualSubcategory[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const defineCategory = (
  label: string,
  imageKey: string,
  subcategories: string[],
): WholesaleVisualCategory => ({
  label,
  slug: slugify(label),
  imageKey,
  imagePath: `/assets/categories/${imageKey}.jpg`,
  subcategories: subcategories.map((subcategory) => {
    const slug = slugify(subcategory);
    return {
      label: subcategory,
      slug,
      imagePath: `/category-visuals/subcategories/${slug}.jpg`,
      status: 'subcategory-pending' as const,
    };
  }),
});

export const WHOLESALE_VISUAL_TAXONOMY: WholesaleVisualCategory[] = [
  defineCategory('Electronics & Technology', 'electronics', ['Phones & Tablets', 'Laptops & PCs', 'TV & Audio', 'Gaming Consoles', 'Accessories', 'Smart Home']),
  defineCategory('Clothing & Apparel', 'clothing', ["Men's Clothing", "Women's Clothing", "Children's Clothing", 'Footwear', 'Accessories & Bags', 'Sportswear']),
  defineCategory('Home & Garden', 'home', ['Furniture', 'Kitchen & Dining', 'Bedding & Linen', 'Garden & Outdoor', 'Lighting', 'Décor & Accessories']),
  defineCategory('Health & Beauty', 'health-beauty', ['Skincare', 'Haircare', 'Makeup & Cosmetics', 'Fragrances', 'Health & Wellness', 'Personal Care']),
  defineCategory('Toys & Games', 'toys', ['Action Figures', 'Board Games', 'Educational Toys', 'Outdoor Toys', 'Dolls & Playsets', 'Puzzles']),
  defineCategory('Food & Drink', 'food-drink', ['Snacks & Confectionery', 'Beverages', 'Canned & Dry Goods', 'Health Foods', 'Specialty & Gourmet', 'Seasonal']),
  defineCategory('Tools & DIY', 'tools', ['Power Tools', 'Hand Tools', 'Plumbing', 'Electrical', 'Paint & Decorating', 'Fixings & Hardware']),
  defineCategory('Sports & Leisure', 'sports', ['Fitness Equipment', 'Cycling', 'Camping & Hiking', 'Water Sports', 'Team Sports', 'Leisure & Travel']),
  defineCategory('Automotive', 'automotive', ['Car Parts', 'Car Accessories', 'Cleaning & Valeting', 'Tools & Equipment', 'Oils & Fluids', 'Tyres & Wheels']),
  defineCategory('Office & Stationery', 'office', ['Office Furniture', 'Printers & Ink', 'Paper & Supplies', 'Office Tech', 'Filing & Storage', 'Pens & Writing']),
  defineCategory('Baby & Nursery', 'baby', ['Prams & Pushchairs', 'Baby Clothing', 'Feeding', 'Nursery Furniture', 'Toys (0-3 yrs)', 'Safety & Care']),
  defineCategory('Jewellery & Watches', 'jewellery', ['Necklaces & Pendants', 'Rings & Earrings', 'Bracelets', 'Watches', 'Fashion Jewellery', 'Accessories']),
  defineCategory('Mixed Lots', 'mixed-pallets', ['General Mixed', 'Department Store Returns', 'Amazon Returns', 'Seasonal Mixed', 'High Value Mixed', 'Liquidation Lots']),
  defineCategory('Customer Returns', 'returns', ['Electronics Returns', 'Clothing Returns', 'Home Returns', 'Appliance Returns', 'Graded Returns', 'Unchecked Returns']),
  defineCategory('Overstock', 'overstock', ['Brand Overstock', 'Seasonal Overstock', 'End of Line', 'Excess Inventory', 'Wholesale Lots', 'Bulk Deals']),
  defineCategory('Clearance Deals', 'clearance', ['Flash Sales', 'Closing Down Stock', 'Damaged Packaging', 'Short Dated', 'Sample Stock', 'One-Off Deals']),
];

export const WHOLESALE_VISUAL_CATEGORY_COUNT = WHOLESALE_VISUAL_TAXONOMY.length;
export const WHOLESALE_VISUAL_SUBCATEGORY_COUNT = WHOLESALE_VISUAL_TAXONOMY.reduce(
  (total, category) => total + category.subcategories.length,
  0,
);

export const allWholesaleSubcategoriesPending = () =>
  WHOLESALE_VISUAL_TAXONOMY.every((category) =>
    category.subcategories.every((subcategory) => subcategory.status === 'subcategory-pending'),
  );
