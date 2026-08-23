export interface CategoryVisual {
  image: string;
  alt: string;
  objectPosition?: string;
}

const ROOT_CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  electronics: { image: '/category-visuals/electronics.webp', alt: 'Electronics including laptops, headphones and smart devices' },
  'home-garden': { image: '/category-visuals/home-garden.webp', alt: 'Home and garden products including furniture, decor and plants' },
  'clothing-fashion': { image: '/category-visuals/clothing-fashion.webp', alt: 'Clothing and fashion products including apparel, footwear and accessories' },
  'toys-games': { image: '/category-visuals/toys-games.webp', alt: 'Toys and games including educational toys, board games and play products' },
  'sports-fitness': { image: '/category-visuals/sports-fitness.webp', alt: 'Sports and fitness equipment including weights and training accessories' },
  automotive: { image: '/category-visuals/automotive.webp', alt: 'Automotive products including car parts, care products and accessories' },
  'health-beauty': { image: '/category-visuals/health-beauty.webp', alt: 'Health and beauty products including skincare, haircare and personal care' },
  pets: { image: '/category-visuals/pets.webp', alt: 'Pet supplies for dogs, cats and aquatics' },
  'food-drink': { image: '/category-visuals/food-drink.webp', alt: 'Food and drink products including pantry goods, snacks and beverages' },
  'office-business': { image: '/category-visuals/office-business.webp', alt: 'Office and business products including stationery, furniture and printing equipment' },
};

const CATEGORY_PARENT_BY_SLUG: Record<string, string> = {
  'mobile-phones': 'electronics', 'phone-accessories': 'electronics', 'tvs-home-entertainment': 'electronics', audio: 'electronics', 'computers-tablets': 'electronics', gaming: 'electronics',
  furniture: 'home-garden', 'kitchen-dining': 'home-garden', 'garden-outdoor': 'home-garden',
  'mens-clothing': 'clothing-fashion', 'womens-clothing': 'clothing-fashion', footwear: 'clothing-fashion',
  'action-toys': 'toys-games', 'educational-toys': 'toys-games', 'board-games': 'toys-games',
  'gym-training': 'sports-fitness', 'team-sports': 'sports-fitness', skating: 'sports-fitness',
  'car-parts': 'automotive', 'car-care': 'automotive', 'tyres-wheels': 'automotive',
  skincare: 'health-beauty', haircare: 'health-beauty', 'personal-care': 'health-beauty',
  'dog-supplies': 'pets', 'cat-supplies': 'pets', aquatics: 'pets',
  pantry: 'food-drink', snacks: 'food-drink', beverages: 'food-drink',
  'office-supplies': 'office-business', 'office-furniture': 'office-business', 'tech-printing': 'office-business',
};

/**
 * Visual navigation contract:
 * - every canonical slug gets its own expected /category-visuals/<slug>.webp asset;
 * - until that specific asset is staged, callers may use the root-category image as a safe visual fallback;
 * - visuals never imply that a real product listing exists.
 */
export function getCategoryVisual(slug: string, parentSlug?: string | null, label?: string): CategoryVisual {
  const own = `/category-visuals/${slug}.webp`;
  const resolvedParent = parentSlug ?? CATEGORY_PARENT_BY_SLUG[slug];
  const fallback = resolvedParent ? ROOT_CATEGORY_VISUALS[resolvedParent] : ROOT_CATEGORY_VISUALS[slug];

  return {
    image: own,
    alt: `${label ?? slug.replace(/-/g, ' ')} category`,
    objectPosition: fallback?.objectPosition ?? 'center',
  };
}

export function getRootCategoryFallback(slug: string): CategoryVisual | undefined {
  return ROOT_CATEGORY_VISUALS[slug];
}
