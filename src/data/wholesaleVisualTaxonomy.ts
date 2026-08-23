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
 * - root images are served from /category-visuals/wholesale/<slug>.jpg
 * - each subcategory has its own final visual; parent fallback is work-branch-only
 */

export type SubcategoryVisualStatus = 'subcategory-pending' | 'dedicated';

export interface WholesaleVisualSubcategory {
  label: string;
  slug: string;
  imagePath: string;
  displayImage: string;
  sourcePage?: string;
  status: SubcategoryVisualStatus;
}

export interface WholesaleVisualCategory {
  label: string;
  slug: string;
  imageKey: string;
  imagePath: string;
  fallbackImage: string;
  subcategories: WholesaleVisualSubcategory[];
}

type DedicatedVisual = { displayImage: string; sourcePage: string };

const FOCUSED_IMAGE_CRAFT_RAW =
  'https://raw.githubusercontent.com/LoadifyMarketLTD/focused-image-craft/main/src/assets/categories';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ELECTRONICS_DEDICATED_VISUALS: Record<string, DedicatedVisual> = {
  'Phones & Tablets': {
    displayImage: 'https://images.unsplash.com/photo-1750744788280-aa47aba79a57?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/devices-like-laptops-tablets-and-phones-are-on-a-desk-TK0kQP476cU',
  },
  'Laptops & PCs': {
    displayImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/turned-on-gray-laptop-computer-XJXWbfSo2f0',
  },
  'TV & Audio': {
    displayImage: 'https://images.unsplash.com/photo-1567466062001-5d3ad19e8418?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/white-and-gray-google-smart-speaker-beside-black-flat-screen-tv-o9KZozGAKQo',
  },
  'Gaming Consoles': {
    displayImage: 'https://images.unsplash.com/photo-1754006126024-f8b0c002877b?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/close-up-view-of-a-gaming-controller-lit-in-green--dNlbaqOZJU',
  },
  Accessories: {
    displayImage: 'https://images.unsplash.com/photo-1706290134049-c5c72d24146a?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/a-close-up-of-a-power-cord-and-a-charger-Fhyt8se0E50',
  },
  'Smart Home': {
    displayImage: 'https://images.unsplash.com/photo-1761384409444-2f8359d67a69?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/a-white-smart-speaker-on-a-white-surface-kDCIBGqU0_0',
  },
};

const CLOTHING_DEDICATED_VISUALS: Record<string, DedicatedVisual> = {
  "Men's Clothing": {
    displayImage: 'https://images.unsplash.com/photo-1603400521630-9f2de124b33b?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/mwa_nzFpnJw',
  },
  "Women's Clothing": {
    displayImage: 'https://unsplash.com/photos/dlxLGIy-2VU/download?force=true',
    sourcePage: 'https://unsplash.com/photos/dlxLGIy-2VU',
  },
  "Children's Clothing": {
    displayImage: 'https://images.unsplash.com/photo-1566454544259-f4b94c3d758c?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/GCDjllzoKLo',
  },
  Footwear: {
    displayImage: 'https://unsplash.com/photos/bdCdXvEgWIQ/download?force=true',
    sourcePage: 'https://unsplash.com/photos/bdCdXvEgWIQ',
  },
  'Accessories & Bags': {
    displayImage: 'https://unsplash.com/photos/tcVH_BwHtrc/download?force=true',
    sourcePage: 'https://unsplash.com/photos/tcVH_BwHtrc',
  },
  Sportswear: {
    displayImage: 'https://unsplash.com/photos/d3bYmnZ0ank/download?force=true',
    sourcePage: 'https://unsplash.com/photos/d3bYmnZ0ank',
  },
};

const HOME_GARDEN_DEDICATED_VISUALS: Record<string, DedicatedVisual> = {
  Furniture: {
    displayImage: 'https://images.unsplash.com/photo-1741288340498-d78d59a33675?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/a-bright-modern-living-room-with-comfortable-furniture-jw_Y7R3NabQ',
  },
  'Kitchen & Dining': {
    displayImage: 'https://images.unsplash.com/photo-1771003936708-bfeb23b5d082?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/bright-kitchen-with-dining-table-and-stainless-steel-refrigerator-alXdbCZoQZI',
  },
  'Bedding & Linen': {
    displayImage: 'https://images.unsplash.com/photo-1750271334785-4f6008035021?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/a-clean-bright-bedroom-with-a-large-bed-L9GsIbPCXKU',
  },
  'Garden & Outdoor': {
    displayImage: 'https://images.unsplash.com/photo-1782033799503-ef0687f7ce57?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/garden-patio-with-two-chairs-lush-plants-and-warm-lighting-fVRSm1R5U_Q',
  },
  Lighting: {
    displayImage: 'https://images.unsplash.com/photo-1768578927267-d589f8a294b8?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/three-modern-pendant-lights-hang-over-a-kitchen-island-Vhtg2xwr6rc',
  },
  'Décor & Accessories': {
    displayImage: 'https://images.unsplash.com/photo-1770513649192-c59f4e17df59?auto=format&fit=crop&fm=jpg&q=82&w=1400',
    sourcePage: 'https://unsplash.com/photos/three-lit-candles-reflect-in-a-mirror-qwA42l83ylg',
  },
};

const DEDICATED_VISUALS_BY_CATEGORY: Record<string, Record<string, DedicatedVisual>> = {
  'Electronics & Technology': ELECTRONICS_DEDICATED_VISUALS,
  'Clothing & Apparel': CLOTHING_DEDICATED_VISUALS,
  'Home & Garden': HOME_GARDEN_DEDICATED_VISUALS,
};

const defineCategory = (
  label: string,
  imageKey: string,
  subcategories: string[],
): WholesaleVisualCategory => {
  const slug = slugify(label);
  const dedicatedBySubcategory = DEDICATED_VISUALS_BY_CATEGORY[label];
  return {
    label,
    slug,
    imageKey,
    imagePath: `/category-visuals/wholesale/${slug}.jpg`,
    fallbackImage: `${FOCUSED_IMAGE_CRAFT_RAW}/${imageKey}.jpg`,
    subcategories: subcategories.map((subcategory) => {
      const subcategorySlug = slugify(subcategory);
      const dedicated = dedicatedBySubcategory?.[subcategory];
      return {
        label: subcategory,
        slug: subcategorySlug,
        imagePath: `/category-visuals/subcategories/${subcategorySlug}.jpg`,
        displayImage: dedicated?.displayImage ?? `/category-visuals/subcategories/${subcategorySlug}.jpg`,
        sourcePage: dedicated?.sourcePage,
        status: dedicated ? ('dedicated' as const) : ('subcategory-pending' as const),
      };
    }),
  };
};

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
