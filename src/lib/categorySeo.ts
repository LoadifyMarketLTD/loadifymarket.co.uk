export type CategorySearchIntent = 'retail-category' | 'trade-stock';

export interface CategorySeoLanding {
  slug: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  primaryKeyword: string;
  intent: CategorySearchIntent;
  dbSlugs: readonly string[];
}

export const CATEGORY_SEO_LANDINGS: readonly CategorySeoLanding[] = [
  {
    slug: 'electronics-and-technology',
    label: 'Electronics & Technology',
    heading: 'Electronics & Technology',
    title: 'Electronics & Technology Products UK | Loadify Market',
    description: 'Browse electronics and technology listings on Loadify Market, including phones, computers, audio, gaming accessories and smart-home products.',
    primaryKeyword: 'electronics products UK',
    intent: 'retail-category',
    dbSlugs: ['electronics', 'media-electronics'],
  },
  {
    slug: 'clothing-and-apparel',
    label: 'Clothing & Apparel',
    heading: 'Clothing & Apparel',
    title: 'Clothing & Apparel Marketplace UK | Loadify Market',
    description: "Explore clothing and apparel listings on Loadify Market across men's, women's and children's fashion, footwear, bags, accessories and sportswear.",
    primaryKeyword: 'clothing marketplace UK',
    intent: 'retail-category',
    dbSlugs: ['clothing-fashion', 'wholesale-clothing'],
  },
  {
    slug: 'home-and-garden',
    label: 'Home & Garden',
    heading: 'Home & Garden',
    title: 'Home & Garden Products UK | Loadify Market',
    description: 'Browse home and garden products on Loadify Market, from furniture and kitchenware to bedding, lighting, outdoor living and decorative accessories.',
    primaryKeyword: 'home and garden products UK',
    intent: 'retail-category',
    dbSlugs: ['home-garden', 'homeware', 'garden', 'kitchenware'],
  },
  {
    slug: 'health-and-beauty',
    label: 'Health & Beauty',
    heading: 'Health & Beauty',
    title: 'Health & Beauty Products UK | Loadify Market',
    description: 'Explore health and beauty products on Loadify Market, including skincare, haircare, cosmetics, fragrances, wellness and personal-care listings.',
    primaryKeyword: 'health and beauty products UK',
    intent: 'retail-category',
    dbSlugs: ['health-beauty'],
  },
  {
    slug: 'toys-and-games',
    label: 'Toys & Games',
    heading: 'Toys & Games',
    title: 'Toys & Games Marketplace UK | Loadify Market',
    description: 'Browse toys and games on Loadify Market, including board games, educational toys, puzzles, dolls, action figures and outdoor play products.',
    primaryKeyword: 'toys and games UK',
    intent: 'retail-category',
    dbSlugs: ['toys-games', 'toys'],
  },
  {
    slug: 'food-and-drink',
    label: 'Food & Drink',
    heading: 'Food & Drink',
    title: 'Food & Drink Marketplace UK | Loadify Market',
    description: 'Explore food and drink listings on Loadify Market, including snacks, beverages, pantry goods, health foods, gourmet products and seasonal ranges.',
    primaryKeyword: 'food and drink marketplace UK',
    intent: 'retail-category',
    dbSlugs: ['food-drink'],
  },
  {
    slug: 'tools-and-diy',
    label: 'Tools & DIY',
    heading: 'Tools & DIY',
    title: 'Tools & DIY Products UK | Loadify Market',
    description: 'Browse tools and DIY products on Loadify Market, including power tools, hand tools, electrical, plumbing, decorating and hardware listings.',
    primaryKeyword: 'tools and DIY products UK',
    intent: 'retail-category',
    dbSlugs: ['diy'],
  },
  {
    slug: 'sports-and-leisure',
    label: 'Sports & Leisure',
    heading: 'Sports & Leisure',
    title: 'Sports & Leisure Products UK | Loadify Market',
    description: 'Explore sports and leisure products on Loadify Market, including fitness, cycling, camping, hiking, water sports, team sports and travel gear.',
    primaryKeyword: 'sports and leisure products UK',
    intent: 'retail-category',
    dbSlugs: ['sports-fitness', 'leisure-hobbies'],
  },
  {
    slug: 'automotive',
    label: 'Automotive',
    heading: 'Automotive Parts & Accessories',
    title: 'Automotive Parts & Accessories UK | Loadify Market',
    description: 'Browse automotive parts and accessories on Loadify Market, including car parts, valeting products, tools, oils, fluids, tyres and wheels.',
    primaryKeyword: 'automotive parts and accessories UK',
    intent: 'retail-category',
    dbSlugs: ['automotive'],
  },
  {
    slug: 'office-and-stationery',
    label: 'Office & Stationery',
    heading: 'Office & Stationery',
    title: 'Office & Stationery Products UK | Loadify Market',
    description: 'Explore office and stationery products on Loadify Market, including office furniture, printers, ink, paper, filing, storage and writing supplies.',
    primaryKeyword: 'office and stationery products UK',
    intent: 'retail-category',
    dbSlugs: ['office-business', 'stationery'],
  },
  {
    slug: 'baby-and-nursery',
    label: 'Baby & Nursery',
    heading: 'Baby & Nursery',
    title: 'Baby & Nursery Products UK | Loadify Market',
    description: 'Browse baby and nursery products on Loadify Market, including prams, baby clothing, feeding, nursery furniture, toys and safety essentials.',
    primaryKeyword: 'baby and nursery products UK',
    intent: 'retail-category',
    dbSlugs: ['baby-supplies'],
  },
  {
    slug: 'jewellery-and-watches',
    label: 'Jewellery & Watches',
    heading: 'Jewellery & Watches',
    title: 'Jewellery & Watches Marketplace UK | Loadify Market',
    description: 'Explore jewellery and watches on Loadify Market, including necklaces, rings, earrings, bracelets, watches, fashion jewellery and accessories.',
    primaryKeyword: 'jewellery and watches UK',
    intent: 'retail-category',
    dbSlugs: [],
  },
  {
    slug: 'mixed-lots',
    label: 'Mixed Lots',
    heading: 'Wholesale job lots and mixed stock',
    title: 'Wholesale Job Lots UK | Mixed Stock Lots | Loadify Market',
    description: 'Browse wholesale job lots and mixed stock on Loadify Market, including general mixed lots, seasonal stock, high-value lots and liquidation opportunities.',
    primaryKeyword: 'wholesale job lots UK',
    intent: 'trade-stock',
    dbSlugs: [],
  },
  {
    slug: 'customer-returns',
    label: 'Customer Returns',
    heading: 'Customer returns pallets and resale stock',
    title: 'Customer Returns Pallets UK | Loadify Market',
    description: 'Browse customer returns pallets and resale stock on Loadify Market, including graded, unchecked and category-specific returns when approved listings are available.',
    primaryKeyword: 'customer returns pallets UK',
    intent: 'trade-stock',
    dbSlugs: [],
  },
  {
    slug: 'overstock',
    label: 'Overstock',
    heading: 'Wholesale overstock and excess inventory',
    title: 'Wholesale Overstock Stock UK | Loadify Market',
    description: 'Browse wholesale overstock and excess inventory on Loadify Market, including brand overstock, end-of-line stock, wholesale lots and bulk deals.',
    primaryKeyword: 'wholesale overstock stock UK',
    intent: 'trade-stock',
    dbSlugs: [],
  },
  {
    slug: 'clearance-deals',
    label: 'Clearance Deals',
    heading: 'Wholesale clearance stock and one-off deals',
    title: 'Wholesale Clearance Stock UK | Loadify Market',
    description: 'Browse wholesale clearance stock on Loadify Market, including end-of-line, damaged-packaging, short-dated, sample and one-off stock opportunities.',
    primaryKeyword: 'wholesale clearance stock UK',
    intent: 'trade-stock',
    dbSlugs: [],
  },
] as const;

const landingBySlug = new Map(CATEGORY_SEO_LANDINGS.map((landing) => [landing.slug, landing]));

export function getCategorySeoLanding(slug?: string): CategorySeoLanding | undefined {
  if (!slug) return undefined;
  return landingBySlug.get(slug);
}

export function getDbSlugsForCategoryLanding(slug?: string): readonly string[] {
  return getCategorySeoLanding(slug)?.dbSlugs ?? (slug ? [slug] : []);
}

export function categorySeoPath(slug: string): string {
  return `/category/${slug}`;
}

export const CATEGORY_SEO_PATHS = CATEGORY_SEO_LANDINGS.map((landing) => categorySeoPath(landing.slug));
