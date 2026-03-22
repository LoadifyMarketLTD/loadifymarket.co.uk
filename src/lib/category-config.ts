/**
 * category-config.ts
 *
 * Single source of truth for the 9 main marketplace category pages served
 * by /category/:slug.  Each entry drives the CategoryPage's title, subtitle,
 * icon, subcategory chips, empty-state copy, and the Supabase product filter.
 *
 * "All Categories" is served by /catalog.
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

// ── Types ────────────────────────────────────────────────────────────────────

/** A chip displayed inside a category page to filter results. */
export interface CategoryChip {
  label: string;
  /** Full-text search term added to the query */
  searchTerm?: string;
  /** Filter by product condition */
  condition?: string;
}

/** How to query products for this category. */
export interface CategoryProductFilter {
  /** Query by product type column values */
  types?: string[];
  /** Query by category.slug (resolved to UUID at runtime) */
  categorySlug?: string;
}

export interface CategoryConfig {
  /** URL segment: /category/:slug */
  slug: string;
  /** Short label used in navigation and breadcrumbs */
  label: string;
  /** Page <h1> heading */
  title: string;
  /** Page subheading / description */
  subtitle: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind text-color class for the icon */
  iconColor: string;
  /** Tailwind bg-color class for the icon container */
  accentBg: string;
  /** Category-specific filter chips shown beneath the hero */
  chips: CategoryChip[];
  /** Subcategory names (used in nav mega-menu and category page) */
  subcategories: string[];
  /** Representative image for cards */
  image: string;
  emptyState: {
    title: string;
    description: string;
  };
  productFilter: CategoryProductFilter;
}

// ── Config entries ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: readonly CategoryConfig[] = [
  // ── Electronics ────────────────────────────────────────────────────────────
  {
    slug: 'electronics',
    label: 'Electronics',
    title: 'Electronics',
    subtitle: 'Smartphones, laptops, tablets, audio, smart home and gaming gear from verified UK sellers',
    icon: Cpu,
    iconColor: 'text-blue-600',
    accentBg: 'bg-blue-600/10',
    image: '/images/categories/electronics.jpg',
    subcategories: ['Smartphones', 'Laptops', 'Tablets', 'Audio', 'Smart Home', 'Gaming', 'Accessories'],
    chips: [
      { label: 'All Electronics' },
      { label: 'Smartphones', searchTerm: 'smartphone mobile phone iphone android' },
      { label: 'Laptops', searchTerm: 'laptop notebook computer macbook' },
      { label: 'Tablets', searchTerm: 'tablet ipad android tablet' },
      { label: 'Audio', searchTerm: 'headphones earbuds speaker audio bluetooth' },
      { label: 'Smart Home', searchTerm: 'smart home alexa google nest wifi' },
      { label: 'Gaming', searchTerm: 'gaming console controller game xbox playstation' },
      { label: 'Accessories', searchTerm: 'electronics accessories cable charger case' },
    ],
    emptyState: {
      title: 'No Electronics found',
      description:
        'Try adjusting your search or filters. New electronics are listed every day.',
    },
    productFilter: { categorySlug: 'electronics' },
  },

  // ── Fashion ────────────────────────────────────────────────────────────────
  {
    slug: 'fashion',
    label: 'Fashion',
    title: 'Fashion',
    subtitle: 'Clothing, shoes, bags and accessories for women, men and everyone in between',
    icon: Shirt,
    iconColor: 'text-pink-500',
    accentBg: 'bg-pink-500/10',
    image: '/images/categories/fashion.jpg',
    subcategories: ["Women's Clothing", "Men's Clothing", 'Shoes', 'Bags', 'Jewellery', 'Accessories'],
    chips: [
      { label: 'All Fashion' },
      { label: "Women's Clothing", searchTerm: "women clothing dress top skirt blouse" },
      { label: "Men's Clothing", searchTerm: "men clothing shirt trousers jacket hoodie" },
      { label: 'Shoes', searchTerm: 'shoes trainers boots heels sandals footwear' },
      { label: 'Bags', searchTerm: 'bag handbag tote backpack purse' },
      { label: 'Jewellery', searchTerm: 'jewellery necklace bracelet ring earring' },
      { label: 'Accessories', searchTerm: 'fashion accessories scarf hat belt gloves' },
    ],
    emptyState: {
      title: 'No Fashion items found',
      description:
        'Try adjusting your search or browse other categories. New fashion items are added regularly.',
    },
    productFilter: { categorySlug: 'fashion' },
  },

  // ── Home & Kitchen ─────────────────────────────────────────────────────────
  {
    slug: 'home-kitchen',
    label: 'Home & Kitchen',
    title: 'Home & Kitchen',
    subtitle: 'Appliances, cookware, storage, home decor and furniture for every room',
    icon: Home,
    iconColor: 'text-emerald-600',
    accentBg: 'bg-emerald-600/10',
    image: '/images/categories/home-kitchen.jpg',
    subcategories: ['Small Appliances', 'Kitchen Tools', 'Storage', 'Cleaning', 'Home Decor', 'Furniture'],
    chips: [
      { label: 'All Home & Kitchen' },
      { label: 'Small Appliances', searchTerm: 'small appliance kettle toaster microwave blender' },
      { label: 'Kitchen Tools', searchTerm: 'kitchen tools cookware pan pot utensil' },
      { label: 'Storage', searchTerm: 'storage box shelf organiser container basket' },
      { label: 'Cleaning', searchTerm: 'cleaning mop vacuum hoover brush cloth' },
      { label: 'Home Decor', searchTerm: 'home decor candle vase ornament cushion lamp' },
      { label: 'Furniture', searchTerm: 'furniture sofa chair table desk shelf unit' },
    ],
    emptyState: {
      title: 'No Home & Kitchen products found',
      description:
        'Try adjusting your search or filters. New home and kitchen items are listed regularly.',
    },
    productFilter: { categorySlug: 'home-kitchen' },
  },

  // ── Beauty ─────────────────────────────────────────────────────────────────
  {
    slug: 'beauty',
    label: 'Beauty',
    title: 'Beauty',
    subtitle: 'Skincare, haircare, makeup, fragrance and beauty tools from premium brands',
    icon: Sparkles,
    iconColor: 'text-rose-500',
    accentBg: 'bg-rose-500/10',
    image: '/images/categories/beauty.jpg',
    subcategories: ['Skincare', 'Haircare', 'Makeup', 'Fragrance', 'Beauty Tools'],
    chips: [
      { label: 'All Beauty' },
      { label: 'Skincare', searchTerm: 'skincare moisturiser serum cleanser toner spf' },
      { label: 'Haircare', searchTerm: 'haircare shampoo conditioner hair dryer styling' },
      { label: 'Makeup', searchTerm: 'makeup foundation lipstick mascara eyeshadow blush' },
      { label: 'Fragrance', searchTerm: 'fragrance perfume cologne eau de toilette body mist' },
      { label: 'Beauty Tools', searchTerm: 'beauty tools hair dryer straightener curler device' },
    ],
    emptyState: {
      title: 'No Beauty products found',
      description:
        'Try adjusting your search or filters. New beauty and skincare products are added regularly.',
    },
    productFilter: { categorySlug: 'beauty' },
  },

  // ── Tools & DIY ────────────────────────────────────────────────────────────
  {
    slug: 'tools-diy',
    label: 'Tools & DIY',
    title: 'Tools & DIY',
    subtitle: 'Power tools, hand tools, hardware, workshop essentials and safety equipment',
    icon: Wrench,
    iconColor: 'text-amber-600',
    accentBg: 'bg-amber-600/10',
    image: '/images/categories/tools-diy.jpg',
    subcategories: ['Power Tools', 'Hand Tools', 'Hardware', 'Workshop', 'Electrical', 'Safety Equipment'],
    chips: [
      { label: 'All Tools & DIY' },
      { label: 'Power Tools', searchTerm: 'power drill saw grinder sander jigsaw circular' },
      { label: 'Hand Tools', searchTerm: 'hand tool spanner wrench screwdriver hammer pliers' },
      { label: 'Hardware', searchTerm: 'hardware screw bolt nut fastener fixing anchor' },
      { label: 'Workshop', searchTerm: 'workshop workbench toolbox storage cabinet organiser' },
      { label: 'Electrical', searchTerm: 'electrical wire cable socket switch fuse breaker' },
      { label: 'Safety Equipment', searchTerm: 'safety equipment gloves goggles helmet mask ppe' },
    ],
    emptyState: {
      title: 'No Tools & DIY products found',
      description:
        'Try adjusting your search or filters. New tools and hardware are listed regularly.',
    },
    productFilter: { categorySlug: 'tools-diy' },
  },

  // ── Toys & Games ───────────────────────────────────────────────────────────
  {
    slug: 'toys-games',
    label: 'Toys & Games',
    title: 'Toys & Games',
    subtitle: 'Educational toys, board games, outdoor play and gifts for all ages',
    icon: Gamepad2,
    iconColor: 'text-violet-500',
    accentBg: 'bg-violet-500/10',
    image: '/images/categories/toys-games.jpg',
    subcategories: ['Educational Toys', 'Outdoor Toys', 'Board Games', 'Action Figures', 'Baby Toys'],
    chips: [
      { label: 'All Toys & Games' },
      { label: 'Educational Toys', searchTerm: 'educational toy learning puzzle stem science' },
      { label: 'Outdoor Toys', searchTerm: 'outdoor toy trampoline scooter bike ride on' },
      { label: 'Board Games', searchTerm: 'board game card game chess checkers puzzle strategy' },
      { label: 'Action Figures', searchTerm: 'action figure doll collectible superhero toy' },
      { label: 'Baby Toys', searchTerm: 'baby toy rattle teether activity mat sensory' },
    ],
    emptyState: {
      title: 'No Toys & Games found',
      description:
        'Try adjusting your search or filters. New toys and games are added regularly.',
    },
    productFilter: { categorySlug: 'toys-games' },
  },

  // ── Health & Wellness ──────────────────────────────────────────────────────
  {
    slug: 'health-wellness',
    label: 'Health & Wellness',
    title: 'Health & Wellness',
    subtitle: 'Personal care, fitness accessories, wellness devices and supplements',
    icon: Heart,
    iconColor: 'text-red-500',
    accentBg: 'bg-red-500/10',
    image: '/images/categories/health-wellness.jpg',
    subcategories: ['Personal Care', 'Fitness Accessories', 'Wellness Devices', 'Supplements', 'Massagers'],
    chips: [
      { label: 'All Health & Wellness' },
      { label: 'Personal Care', searchTerm: 'personal care electric toothbrush shaver razor trimmer' },
      { label: 'Fitness Accessories', searchTerm: 'fitness accessory yoga mat resistance band weight dumbbell' },
      { label: 'Wellness Devices', searchTerm: 'wellness device blood pressure monitor thermometer pulse oximeter' },
      { label: 'Supplements', searchTerm: 'supplement protein vitamin mineral health nutrition' },
      { label: 'Massagers', searchTerm: 'massager massage gun foam roller percussion back neck' },
    ],
    emptyState: {
      title: 'No Health & Wellness products found',
      description:
        'Try adjusting your search or filters. New health and wellness products are added regularly.',
    },
    productFilter: { categorySlug: 'health-wellness' },
  },

  // ── Automotive ─────────────────────────────────────────────────────────────
  {
    slug: 'automotive',
    label: 'Automotive',
    title: 'Automotive',
    subtitle: 'Car accessories, cleaning kits, interior accessories and automotive lighting',
    icon: Car,
    iconColor: 'text-slate-600',
    accentBg: 'bg-slate-600/10',
    image: '/images/categories/automotive.jpg',
    subcategories: ['Car Accessories', 'Cleaning Kits', 'Interior Accessories', 'Tools', 'Lighting'],
    chips: [
      { label: 'All Automotive' },
      { label: 'Car Accessories', searchTerm: 'car accessory phone holder dash cam parking sensor' },
      { label: 'Cleaning Kits', searchTerm: 'car cleaning kit polish wax shampoo tyre cleaner' },
      { label: 'Interior Accessories', searchTerm: 'car interior seat cover mat organiser air freshener' },
      { label: 'Tools', searchTerm: 'automotive tool jack torque wrench jump starter' },
      { label: 'Lighting', searchTerm: 'car lighting led bulb strip ambient interior exterior' },
    ],
    emptyState: {
      title: 'No Automotive products found',
      description:
        'Try adjusting your search or filters. New automotive accessories are listed regularly.',
    },
    productFilter: { categorySlug: 'automotive' },
  },

  // ── Office Supplies ────────────────────────────────────────────────────────
  {
    slug: 'office-supplies',
    label: 'Office Supplies',
    title: 'Office Supplies',
    subtitle: 'Desk accessories, stationery, office storage and business essentials',
    icon: Briefcase,
    iconColor: 'text-indigo-600',
    accentBg: 'bg-indigo-600/10',
    image: '/images/categories/office-supplies.jpg',
    subcategories: ['Desk Accessories', 'Office Storage', 'Stationery', 'Printers & Ink', 'Business Essentials'],
    chips: [
      { label: 'All Office Supplies' },
      { label: 'Desk Accessories', searchTerm: 'desk accessory monitor stand lamp pen holder calendar' },
      { label: 'Office Storage', searchTerm: 'office storage file folder binder cabinet drawer' },
      { label: 'Stationery', searchTerm: 'stationery pen pencil notebook planner sticky note' },
      { label: 'Printers & Ink', searchTerm: 'printer ink toner cartridge paper scanner copier' },
      { label: 'Business Essentials', searchTerm: 'business card lanyard id badge shredder binding' },
    ],
    emptyState: {
      title: 'No Office Supplies found',
      description:
        'Try adjusting your search or filters. New office supplies are added regularly.',
    },
    productFilter: { categorySlug: 'office-supplies' },
  },
];

export default CATEGORY_CONFIG;

/** Look up a single category config by its URL slug. */
export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG.find((c) => c.slug === slug);
}
