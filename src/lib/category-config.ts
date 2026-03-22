/**
 * category-config.ts
 *
 * Extends the central category definitions from src/data/categories.ts with
 * UI-specific configuration needed by CategoryPage:
 * • Lucide icon component
 * • Tailwind accent colours
 * • Subcategory filter chips
 * • Empty-state copy
 * • Supabase product filter strategy
 *
 * SINGLE SOURCE OF TRUTH for category names/slugs/images/subcategories:
 *   → src/data/categories.ts
 */

import {
  Cpu,
  Shirt,
  Home,
  Wrench,
  Car,
  Gamepad2,
  Sparkles,
  Heart,
  Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CATEGORIES from '@/data/categories';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CategoryChip {
  label: string;
  searchTerm?: string;
  condition?: string;
}

export interface CategoryProductFilter {
  types?: string[];
  categorySlug?: string;
}

export interface CategoryConfig {
  slug: string;
  label: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  accentBg: string;
  chips: CategoryChip[];
  subcategories: string[];
  image: string;
  emptyState: { title: string; description: string };
  productFilter: CategoryProductFilter;
}

// ── Per-slug UI overrides ─────────────────────────────────────────────────────

type UIOverride = Omit<CategoryConfig, 'slug' | 'label' | 'title' | 'subcategories' | 'image'>;

const UI_OVERRIDES: Record<string, UIOverride> = {
  electronics: {
    subtitle: 'Smartphones, laptops, tablets, audio, smart home and gaming gear from verified UK sellers',
    icon: Cpu,
    iconColor: 'text-blue-600',
    accentBg: 'bg-blue-600/10',
    chips: [
      { label: 'All Electronics' },
      { label: 'Smartphones',   searchTerm: 'smartphone mobile phone iphone android' },
      { label: 'Laptops',       searchTerm: 'laptop notebook computer macbook' },
      { label: 'Tablets',       searchTerm: 'tablet ipad android tablet' },
      { label: 'Audio',         searchTerm: 'headphones earbuds speaker audio bluetooth' },
      { label: 'Smart Home',    searchTerm: 'smart home alexa google nest wifi' },
      { label: 'Gaming',        searchTerm: 'gaming console controller game xbox playstation' },
      { label: 'Accessories',   searchTerm: 'electronics accessories cable charger case' },
    ],
    emptyState: {
      title: 'No Electronics found',
      description: 'Try adjusting your search or filters. New electronics are listed every day.',
    },
    productFilter: { categorySlug: 'electronics' },
  },

  fashion: {
    subtitle: 'Clothing, shoes, bags and accessories for women, men and everyone in between',
    icon: Shirt,
    iconColor: 'text-pink-500',
    accentBg: 'bg-pink-500/10',
    chips: [
      { label: 'All Fashion' },
      { label: "Women's Clothing", searchTerm: 'women clothing dress top skirt blouse' },
      { label: "Men's Clothing",   searchTerm: 'men clothing shirt trousers jacket hoodie' },
      { label: 'Shoes',            searchTerm: 'shoes trainers boots heels sandals footwear' },
      { label: 'Bags',             searchTerm: 'bag handbag tote backpack purse' },
      { label: 'Jewellery',        searchTerm: 'jewellery necklace bracelet ring earring' },
      { label: 'Accessories',      searchTerm: 'fashion accessories scarf hat belt gloves' },
    ],
    emptyState: {
      title: 'No Fashion items found',
      description: 'Try adjusting your search. New fashion items are added regularly.',
    },
    productFilter: { categorySlug: 'fashion' },
  },

  'home-kitchen': {
    subtitle: 'Appliances, cookware, storage, home decor and furniture for every room',
    icon: Home,
    iconColor: 'text-emerald-600',
    accentBg: 'bg-emerald-600/10',
    chips: [
      { label: 'All Home & Kitchen' },
      { label: 'Small Appliances', searchTerm: 'small appliance kettle toaster microwave blender' },
      { label: 'Kitchen Tools',    searchTerm: 'kitchen tools cookware pan pot utensil' },
      { label: 'Storage',          searchTerm: 'storage box shelf organiser container basket' },
      { label: 'Cleaning',         searchTerm: 'cleaning mop vacuum hoover brush cloth' },
      { label: 'Home Decor',       searchTerm: 'home decor candle vase ornament cushion lamp' },
      { label: 'Furniture',        searchTerm: 'furniture sofa chair table desk shelf unit' },
    ],
    emptyState: {
      title: 'No Home & Kitchen products found',
      description: 'Try adjusting your search or filters. New home and kitchen items are listed regularly.',
    },
    productFilter: { categorySlug: 'home-kitchen' },
  },

  beauty: {
    subtitle: 'Skincare, haircare, makeup, fragrance and beauty tools from premium brands',
    icon: Sparkles,
    iconColor: 'text-rose-500',
    accentBg: 'bg-rose-500/10',
    chips: [
      { label: 'All Beauty' },
      { label: 'Skincare',     searchTerm: 'skincare moisturiser serum cleanser toner spf' },
      { label: 'Haircare',     searchTerm: 'haircare shampoo conditioner hair dryer styling' },
      { label: 'Makeup',       searchTerm: 'makeup foundation lipstick mascara eyeshadow blush' },
      { label: 'Fragrance',    searchTerm: 'fragrance perfume cologne eau de toilette body mist' },
      { label: 'Beauty Tools', searchTerm: 'beauty tools hair dryer straightener curler device' },
    ],
    emptyState: {
      title: 'No Beauty products found',
      description: 'Try adjusting your search. New beauty and skincare products are added regularly.',
    },
    productFilter: { categorySlug: 'beauty' },
  },

  'tools-diy': {
    subtitle: 'Power tools, hand tools, hardware, workshop essentials and safety equipment',
    icon: Wrench,
    iconColor: 'text-amber-600',
    accentBg: 'bg-amber-600/10',
    chips: [
      { label: 'All Tools & DIY' },
      { label: 'Power Tools',      searchTerm: 'power drill saw grinder sander jigsaw' },
      { label: 'Hand Tools',       searchTerm: 'hand tool spanner wrench screwdriver hammer pliers' },
      { label: 'Hardware',         searchTerm: 'hardware screw bolt nut fastener fixing anchor' },
      { label: 'Workshop',         searchTerm: 'workshop workbench toolbox storage cabinet' },
      { label: 'Electrical',       searchTerm: 'electrical wire cable socket switch fuse' },
      { label: 'Safety Equipment', searchTerm: 'safety gloves goggles helmet mask ppe' },
    ],
    emptyState: {
      title: 'No Tools & DIY products found',
      description: 'Try adjusting your search. New tools and hardware are listed regularly.',
    },
    productFilter: { categorySlug: 'tools-diy' },
  },

  'toys-games': {
    subtitle: 'Educational toys, board games, outdoor play and gifts for all ages',
    icon: Gamepad2,
    iconColor: 'text-violet-500',
    accentBg: 'bg-violet-500/10',
    chips: [
      { label: 'All Toys & Games' },
      { label: 'Educational Toys', searchTerm: 'educational toy learning puzzle stem science' },
      { label: 'Outdoor Toys',     searchTerm: 'outdoor toy trampoline scooter bike ride on' },
      { label: 'Board Games',      searchTerm: 'board game card game chess checkers puzzle' },
      { label: 'Action Figures',   searchTerm: 'action figure doll collectible superhero' },
      { label: 'Baby Toys',        searchTerm: 'baby toy rattle teether activity mat sensory' },
    ],
    emptyState: {
      title: 'No Toys & Games found',
      description: 'Try adjusting your search. New toys and games are added regularly.',
    },
    productFilter: { categorySlug: 'toys-games' },
  },

  'health-wellness': {
    subtitle: 'Personal care, fitness accessories, wellness devices and supplements',
    icon: Heart,
    iconColor: 'text-red-500',
    accentBg: 'bg-red-500/10',
    chips: [
      { label: 'All Health & Wellness' },
      { label: 'Personal Care',       searchTerm: 'personal care electric toothbrush shaver razor trimmer' },
      { label: 'Fitness Accessories', searchTerm: 'fitness yoga mat resistance band weight dumbbell' },
      { label: 'Wellness Devices',    searchTerm: 'wellness blood pressure monitor thermometer pulse' },
      { label: 'Supplements',         searchTerm: 'supplement protein vitamin mineral health nutrition' },
      { label: 'Massagers',           searchTerm: 'massager massage gun foam roller percussion' },
    ],
    emptyState: {
      title: 'No Health & Wellness products found',
      description: 'Try adjusting your search. New health and wellness products are added regularly.',
    },
    productFilter: { categorySlug: 'health-wellness' },
  },

  automotive: {
    subtitle: 'Car accessories, cleaning kits, interior accessories and automotive lighting',
    icon: Car,
    iconColor: 'text-slate-600',
    accentBg: 'bg-slate-600/10',
    chips: [
      { label: 'All Automotive' },
      { label: 'Car Accessories',      searchTerm: 'car accessory phone holder dash cam parking sensor' },
      { label: 'Cleaning Kits',        searchTerm: 'car cleaning kit polish wax shampoo tyre cleaner' },
      { label: 'Interior Accessories', searchTerm: 'car interior seat cover mat organiser air freshener' },
      { label: 'Tools',                searchTerm: 'automotive tool jack torque wrench jump starter' },
      { label: 'Lighting',             searchTerm: 'car lighting led bulb strip ambient interior exterior' },
    ],
    emptyState: {
      title: 'No Automotive products found',
      description: 'Try adjusting your search. New automotive accessories are listed regularly.',
    },
    productFilter: { categorySlug: 'automotive' },
  },

  'office-supplies': {
    subtitle: 'Desk accessories, stationery, office storage and business essentials',
    icon: Briefcase,
    iconColor: 'text-indigo-600',
    accentBg: 'bg-indigo-600/10',
    chips: [
      { label: 'All Office Supplies' },
      { label: 'Desk Accessories',    searchTerm: 'desk accessory monitor stand lamp pen holder' },
      { label: 'Office Storage',      searchTerm: 'office storage file folder binder cabinet drawer' },
      { label: 'Stationery',          searchTerm: 'stationery pen pencil notebook planner sticky note' },
      { label: 'Printers & Ink',      searchTerm: 'printer ink toner cartridge paper scanner copier' },
      { label: 'Business Essentials', searchTerm: 'business card lanyard id badge shredder binding' },
    ],
    emptyState: {
      title: 'No Office Supplies found',
      description: 'Try adjusting your search. New office supplies are added regularly.',
    },
    productFilter: { categorySlug: 'office-supplies' },
  },
};

// ── Build full CategoryConfig array from central data ─────────────────────────

const CATEGORY_CONFIG: readonly CategoryConfig[] = CATEGORIES.map((cat) => {
  const ui = UI_OVERRIDES[cat.slug];
  if (!ui) {
    throw new Error(`category-config: no UI override defined for slug "${cat.slug}"`);
  }
  return {
    slug: cat.slug,
    label: cat.name,
    title: cat.name,
    subtitle: ui.subtitle,
    icon: ui.icon,
    iconColor: ui.iconColor,
    accentBg: ui.accentBg,
    chips: ui.chips,
    subcategories: cat.subcategories.map((s) => s.name),
    image: cat.image,
    emptyState: ui.emptyState,
    productFilter: ui.productFilter,
  };
});

export default CATEGORY_CONFIG;

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG.find((c) => c.slug === slug);
}
