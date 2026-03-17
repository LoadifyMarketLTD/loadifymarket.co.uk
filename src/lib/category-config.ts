/**
 * category-config.ts
 *
 * Single source of truth for the 8 main product category pages served by
 * /category/:slug.  Each entry drives the CategoryPage's title, subtitle,
 * icon, subcategory chips, empty-state copy, and the Supabase product filter.
 *
 * "All Categories" (/catalog) and "Wholesale" (/bulk) are handled by their
 * own dedicated pages and are therefore NOT in this list.
 */

import {
  Cpu, Shirt, Home, Wrench, Car, Briefcase, RotateCcw, Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A chip displayed inside a category page.
 * Clicking it narrows the product listing within the parent category.
 */
export interface CategoryChip {
  /** Display label on the chip button */
  label: string;
  /**
   * Space-separated search terms applied as OR-ilike against title &
   * description.  e.g. "laptop notebook" matches either word.
   */
  searchTerm?: string;
  /** Filter by product condition field ('new' | 'used' | 'refurbished'). */
  condition?: string;
}

/**
 * How to query products for this category.
 * Exactly one of `types` or `categorySlug` must be set.
 */
export interface CategoryProductFilter {
  /** Filter by product.type IN (...types).  Used for Amazon Returns / Clearance. */
  types?: string[];
  /** Filter by category slug → resolved to UUID via the categories table. */
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
  emptyState: {
    title: string;
    description: string;
  };
  productFilter: CategoryProductFilter;
}

// ── Config entries ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: readonly CategoryConfig[] = [
  // ── Amazon Returns ─────────────────────────────────────────────────────────
  {
    slug: 'amazon-returns',
    label: 'Amazon Returns',
    title: 'Amazon Returns',
    subtitle: 'Grade A, B and C customer returns — warehouse-direct at unbeatable prices',
    icon: RotateCcw,
    iconColor: 'text-orange-500',
    accentBg: 'bg-orange-500/15',
    chips: [
      { label: 'All Returns' },
      { label: 'New / Sealed', condition: 'new' },
      { label: 'Used Returns', condition: 'used' },
      { label: 'Refurbished', condition: 'refurbished' },
      { label: 'Electronics', searchTerm: 'electronics' },
      { label: 'Fashion', searchTerm: 'clothing fashion' },
      { label: 'Home & Garden', searchTerm: 'home garden' },
      { label: 'Mixed Lots', searchTerm: 'mixed lot' },
    ],
    emptyState: {
      title: 'No Amazon Returns listings right now',
      description:
        'Return lots are added as new pallets arrive. Check back soon or browse Clearance stock below.',
    },
    productFilter: { types: ['lot'] },
  },

  // ── Clearance ──────────────────────────────────────────────────────────────
  {
    slug: 'clearance',
    label: 'Clearance',
    title: 'Clearance Stock',
    subtitle: 'End of line, overstock and liquidation — everything heavily discounted',
    icon: Tag,
    iconColor: 'text-red-500',
    accentBg: 'bg-red-500/15',
    chips: [
      { label: 'All Clearance' },
      { label: 'New Stock', condition: 'new' },
      { label: 'Used / Returns', condition: 'used' },
      { label: 'Electronics', searchTerm: 'electronics' },
      { label: 'Fashion', searchTerm: 'clothing fashion' },
      { label: 'Tools & DIY', searchTerm: 'tools diy' },
      { label: 'Home', searchTerm: 'home' },
      { label: 'End of Line', searchTerm: 'end of line eol' },
    ],
    emptyState: {
      title: 'No clearance listings available yet',
      description:
        'Clearance lines are added as sellers clear stock. Browse Wholesale or all categories in the meantime.',
    },
    productFilter: { types: ['clearance'] },
  },

  // ── Electronics ───────────────────────────────────────────────────────────
  {
    slug: 'electronics',
    label: 'Electronics',
    title: 'Electronics',
    subtitle: 'Phones, laptops, gaming, audio, cameras and more',
    icon: Cpu,
    iconColor: 'text-blue-500',
    accentBg: 'bg-blue-500/15',
    chips: [
      { label: 'All Electronics' },
      { label: 'Phones & Tablets', searchTerm: 'phone tablet mobile' },
      { label: 'Laptops', searchTerm: 'laptop notebook computer' },
      { label: 'Gaming', searchTerm: 'gaming console game' },
      { label: 'Audio', searchTerm: 'headphone speaker audio earphone' },
      { label: 'Cameras', searchTerm: 'camera photography' },
      { label: 'New', condition: 'new' },
      { label: 'Refurbished', condition: 'refurbished' },
    ],
    emptyState: {
      title: 'No electronics products found',
      description:
        'Try adjusting your search or filters. New electronics are listed by sellers every day.',
    },
    productFilter: { categorySlug: 'electronics' },
  },

  // ── Home & Garden ─────────────────────────────────────────────────────────
  {
    slug: 'home-garden',
    label: 'Home & Garden',
    title: 'Home & Garden',
    subtitle: 'Furniture, kitchenware, décor, lighting and garden essentials',
    icon: Home,
    iconColor: 'text-emerald-500',
    accentBg: 'bg-emerald-500/15',
    chips: [
      { label: 'All Home & Garden' },
      { label: 'Furniture', searchTerm: 'furniture sofa chair table' },
      { label: 'Kitchen & Dining', searchTerm: 'kitchen cookware dining' },
      { label: 'Garden & Outdoor', searchTerm: 'garden outdoor patio' },
      { label: 'Bedding & Bath', searchTerm: 'bedding duvet pillow towel' },
      { label: 'Lighting', searchTerm: 'lighting lamp light' },
      { label: 'New', condition: 'new' },
    ],
    emptyState: {
      title: 'No Home & Garden products found',
      description:
        'Try adjusting your search or filters. New home and garden items are added regularly.',
    },
    productFilter: { categorySlug: 'home-garden' },
  },

  // ── Tools & DIY ───────────────────────────────────────────────────────────
  {
    slug: 'tools-diy',
    label: 'Tools & DIY',
    title: 'Tools & DIY',
    subtitle: 'Hand tools, power tools, safety equipment and building supplies',
    icon: Wrench,
    iconColor: 'text-amber-600',
    accentBg: 'bg-amber-600/15',
    chips: [
      { label: 'All Tools' },
      { label: 'Hand Tools', searchTerm: 'hand tool spanner wrench' },
      { label: 'Power Tools', searchTerm: 'power drill saw grinder' },
      { label: 'Safety & PPE', searchTerm: 'safety ppe gloves helmet' },
      { label: 'Building', searchTerm: 'building construction timber' },
      { label: 'Electrical', searchTerm: 'electrical cable wire socket' },
      { label: 'New', condition: 'new' },
    ],
    emptyState: {
      title: 'No Tools & DIY products found',
      description:
        'Try adjusting your search or filters. New tools are listed by trade sellers regularly.',
    },
    productFilter: { categorySlug: 'tools' },
  },

  // ── Business Supplies ─────────────────────────────────────────────────────
  {
    slug: 'business-supplies',
    label: 'Business Supplies',
    title: 'Business Supplies',
    subtitle: 'Office essentials, safety, cleaning and business-ready stock',
    icon: Briefcase,
    iconColor: 'text-indigo-500',
    accentBg: 'bg-indigo-500/15',
    chips: [
      { label: 'All Business' },
      { label: 'Office Supplies', searchTerm: 'office stationery printer paper' },
      { label: 'Safety & PPE', searchTerm: 'safety ppe workwear' },
      { label: 'Cleaning', searchTerm: 'cleaning janitorial hygiene' },
      { label: 'Packaging', searchTerm: 'packaging boxes bags tape' },
      { label: 'IT & Tech', searchTerm: 'computer monitor printer server' },
    ],
    emptyState: {
      title: 'No Business Supplies listed yet',
      description:
        'Try adjusting your filters or browse all categories for business-friendly stock.',
    },
    productFilter: { categorySlug: 'business' },
  },

  // ── Fashion ───────────────────────────────────────────────────────────────
  {
    slug: 'fashion',
    label: 'Fashion',
    title: 'Fashion',
    subtitle: "Men's, women's and children's clothing, shoes and accessories",
    icon: Shirt,
    iconColor: 'text-pink-500',
    accentBg: 'bg-pink-500/15',
    chips: [
      { label: 'All Fashion' },
      { label: "Men's", searchTerm: 'mens men male' },
      { label: "Women's", searchTerm: 'womens women ladies female' },
      { label: 'Kids', searchTerm: 'kids children boys girls baby' },
      { label: 'Shoes', searchTerm: 'shoes trainers boots heels' },
      { label: 'Accessories', searchTerm: 'accessories handbag belt scarf hat' },
      { label: 'New', condition: 'new' },
      { label: 'Used', condition: 'used' },
    ],
    emptyState: {
      title: 'No fashion products found',
      description:
        'Try adjusting your search or filters. New clothing and accessories are added daily.',
    },
    productFilter: { categorySlug: 'fashion' },
  },

  // ── Automotive ────────────────────────────────────────────────────────────
  {
    slug: 'automotive',
    label: 'Automotive',
    title: 'Automotive',
    subtitle: 'Car parts, accessories, maintenance tools and vehicle essentials',
    icon: Car,
    iconColor: 'text-rose-600',
    accentBg: 'bg-rose-600/15',
    chips: [
      { label: 'All Automotive' },
      { label: 'Car Parts', searchTerm: 'car parts engine exhaust brake' },
      { label: 'Accessories', searchTerm: 'car accessories interior exterior' },
      { label: 'Tools', searchTerm: 'car tool garage mechanics' },
      { label: 'Wheels & Tyres', searchTerm: 'wheels tyres tires alloy' },
      { label: 'Car Electronics', searchTerm: 'dash cam sat nav stereo' },
      { label: 'New', condition: 'new' },
    ],
    emptyState: {
      title: 'No automotive products found',
      description:
        'Try adjusting your search or filters. New automotive parts and accessories are added regularly.',
    },
    productFilter: { categorySlug: 'vehicles' },
  },
];

export default CATEGORY_CONFIG;

/** Look up a single category config by its URL slug. */
export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG.find((c) => c.slug === slug);
}
