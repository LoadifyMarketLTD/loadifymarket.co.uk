export type CategoryVisualSpec = {
  slug: string;
  label: string;
  imagePath: string;
  alt: string;
  focalPoint?: string;
  parentSlug?: string;
  level: 1 | 2 | 3;
};

/**
 * Category Visual Contract
 *
 * Visual rules:
 * - every category/subcategory has its own descriptive editorial image
 * - 4:3 master crop, object-fit cover
 * - bright, premium, commercial photography
 * - no fake product/listing claims and no invented listing counts
 * - image identity follows the canonical category slug, never display text
 *
 * Files are staged/generated under /category-visuals/<slug>.webp.
 */
export const ROOT_CATEGORY_VISUALS: CategoryVisualSpec[] = [
  { slug: 'electronics', label: 'Electronics', imagePath: '/category-visuals/electronics.webp', alt: 'Laptops, phones, headphones and consumer electronics arranged in a premium retail composition', focalPoint: '50% 50%', level: 1 },
  { slug: 'home-garden', label: 'Home & Garden', imagePath: '/category-visuals/home-garden.webp', alt: 'Modern home, kitchen, decor and garden products in a bright premium setting', focalPoint: '50% 50%', level: 1 },
  { slug: 'clothing-fashion', label: 'Clothing & Fashion', imagePath: '/category-visuals/clothing-fashion.webp', alt: 'Premium clothing, footwear and fashion accessories arranged for marketplace browsing', focalPoint: '50% 45%', level: 1 },
  { slug: 'toys-games', label: 'Toys & Games', imagePath: '/category-visuals/toys-games.webp', alt: 'Colourful toys, puzzles and family games displayed in a clean premium composition', focalPoint: '50% 50%', level: 1 },
  { slug: 'sports-fitness', label: 'Sports & Fitness', imagePath: '/category-visuals/sports-fitness.webp', alt: 'Fitness, football and outdoor sports equipment in a bright commercial composition', focalPoint: '50% 50%', level: 1 },
  { slug: 'automotive', label: 'Automotive', imagePath: '/category-visuals/automotive.webp', alt: 'Car parts, detailing products, tyres and automotive tools in a premium workshop setting', focalPoint: '50% 50%', level: 1 },
  { slug: 'health-beauty', label: 'Health & Beauty', imagePath: '/category-visuals/health-beauty.webp', alt: 'Skincare, haircare, personal care and beauty products arranged in a clean premium setting', focalPoint: '50% 50%', level: 1 },
  { slug: 'pets', label: 'Pets', imagePath: '/category-visuals/pets.webp', alt: 'Dog, cat and aquarium supplies arranged as a premium pet retail category image', focalPoint: '50% 50%', level: 1 },
  { slug: 'food-drink', label: 'Food & Drink', imagePath: '/category-visuals/food-drink.webp', alt: 'Packaged pantry food, snacks, tea, coffee and soft drinks in a bright retail composition', focalPoint: '50% 50%', level: 1 },
  { slug: 'office-business', label: 'Office & Business', imagePath: '/category-visuals/office-business.webp', alt: 'Office furniture, stationery, printers and business supplies in a clean professional composition', focalPoint: '50% 50%', level: 1 },
];

export const LEVEL_TWO_VISUAL_SLUGS = [
  'mobile-phones','phone-accessories','tvs-home-entertainment','audio','computers-tablets','gaming',
  'furniture','kitchen-dining','garden-outdoor',
  'mens-clothing','womens-clothing','footwear',
  'action-toys','educational-toys','board-games',
  'gym-training','team-sports','skating',
  'car-parts','car-care','tyres-wheels',
  'skincare','haircare','personal-care',
  'dog-supplies','cat-supplies','aquatics',
  'pantry','snacks','beverages',
  'office-supplies','office-furniture','tech-printing',
] as const;

export const LEVEL_THREE_VISUAL_SLUGS = [
  'smartphones','feature-phones','refurbished-phones','cases','chargers','screen-protectors','power-banks',
  'televisions','smart-tvs','tv-accessories','soundbars','headphones','earbuds','speakers','laptops','desktop-pcs','tablets','monitors','consoles','games','controllers',
  'living-room-furniture','bedroom-furniture','home-office-furniture','cookware','tableware','small-appliances','garden-tools','outdoor-furniture','plants-seeds',
  'mens-tops','mens-bottoms','mens-outerwear','dresses','womens-tops','womens-outerwear','trainers','boots','sandals',
  'action-figures','rc-toys','stem-toys','puzzles','family-games','strategy-games',
  'cardio-equipment','weights','football','basketball','skates','protective-gear',
  'engine-parts','brakes-suspension','cleaning-kits','oils-fluids','tyres','alloy-wheels',
  'cleansers','moisturisers','shampoo-conditioner','styling','oral-care','fragrances',
  'dog-food','leads-collars','cat-food','litter','aquariums','aquarium-filters',
  'pasta-rice','canned-food','crisps','chocolate','soft-drinks','tea-coffee',
  'paper','writing','desks','office-chairs','printers','ink-toner',
] as const;

export function categoryVisualPath(slug: string): string {
  return `/category-visuals/${slug}.webp`;
}
