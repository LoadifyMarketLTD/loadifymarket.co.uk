/**
 * src/data/categories.ts
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE SOURCE OF TRUTH for all categories and subcategories             │
 * │                                                                          │
 * │  Used by:                                                                │
 * │  • Navbar / mega-menu  (src/components/Navbar.tsx)                      │
 * │  • Homepage category cards  (src/pages/pixel-perfect/Index.tsx)         │
 * │  • Category pages  (src/pages/pixel-perfect/CategoryPage.tsx)           │
 * │  • Category search config  (src/lib/category-config.ts)                 │
 * │  • Product filtering / mock data                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Order is intentional — keep it consistent across the whole app.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Subcategory {
  /** Human-readable name */
  name: string;
  /** URL-safe slug, e.g. "smartphones" */
  slug: string;
}

export interface Category {
  /** Unique numeric id (stable, used as React key) */
  id: number;
  /** Human-readable display name */
  name: string;
  /** URL segment: /category/:slug */
  slug: string;
  /** One-line description shown on cards and category pages */
  description: string;
  /** Absolute public path to the representative image */
  image: string;
  /** Whether to highlight this category in homepage featured sections */
  featured: boolean;
  /** Ordered list of subcategories */
  subcategories: Subcategory[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

/** All 9 marketplace categories in approved display order. */
export const CATEGORIES: readonly Category[] = [
  // 1 ── Electronics ──────────────────────────────────────────────────────────
  {
    id: 1,
    name: "Electronics",
    slug: "electronics",
    description: "Smartphones, laptops, tablets, audio, smart home and gaming gear",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Smartphones",  slug: "smartphones"  },
      { name: "Laptops",      slug: "laptops"      },
      { name: "Tablets",      slug: "tablets"      },
      { name: "Audio",        slug: "audio"        },
      { name: "Smart Home",   slug: "smart-home"   },
      { name: "Gaming",       slug: "gaming"       },
      { name: "Accessories",  slug: "accessories"  },
    ],
  },

  // 2 ── Fashion ──────────────────────────────────────────────────────────────
  {
    id: 2,
    name: "Fashion",
    slug: "fashion",
    description: "Clothing, shoes, bags and accessories for every style",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Women's Clothing", slug: "womens-clothing" },
      { name: "Men's Clothing",   slug: "mens-clothing"   },
      { name: "Shoes",            slug: "shoes"           },
      { name: "Bags",             slug: "bags"            },
      { name: "Jewellery",        slug: "jewellery"       },
      { name: "Accessories",      slug: "accessories"     },
    ],
  },

  // 3 ── Home & Kitchen ───────────────────────────────────────────────────────
  {
    id: 3,
    name: "Home & Kitchen",
    slug: "home-kitchen",
    description: "Appliances, cookware, storage, decor and furniture",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Small Appliances", slug: "small-appliances" },
      { name: "Kitchen Tools",    slug: "kitchen-tools"    },
      { name: "Storage",          slug: "storage"          },
      { name: "Cleaning",         slug: "cleaning"         },
      { name: "Home Decor",       slug: "home-decor"       },
      { name: "Furniture",        slug: "furniture"        },
    ],
  },

  // 4 ── Beauty ───────────────────────────────────────────────────────────────
  {
    id: 4,
    name: "Beauty",
    slug: "beauty",
    description: "Skincare, haircare, makeup, fragrance and beauty tools",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Skincare",     slug: "skincare"     },
      { name: "Haircare",     slug: "haircare"     },
      { name: "Makeup",       slug: "makeup"       },
      { name: "Fragrance",    slug: "fragrance"    },
      { name: "Beauty Tools", slug: "beauty-tools" },
    ],
  },

  // 5 ── Tools & DIY ─────────────────────────────────────────────────────────
  {
    id: 5,
    name: "Tools & DIY",
    slug: "tools-diy",
    description: "Power tools, hand tools, hardware and workshop essentials",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Power Tools",       slug: "power-tools"       },
      { name: "Hand Tools",        slug: "hand-tools"        },
      { name: "Hardware",          slug: "hardware"          },
      { name: "Workshop",          slug: "workshop"          },
      { name: "Electrical",        slug: "electrical"        },
      { name: "Safety Equipment",  slug: "safety-equipment"  },
    ],
  },

  // 6 ── Toys & Games ────────────────────────────────────────────────────────
  {
    id: 6,
    name: "Toys & Games",
    slug: "toys-games",
    description: "Educational toys, board games, outdoor play and gifts for all ages",
    image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Educational Toys", slug: "educational-toys" },
      { name: "Outdoor Toys",     slug: "outdoor-toys"     },
      { name: "Board Games",      slug: "board-games"      },
      { name: "Action Figures",   slug: "action-figures"   },
      { name: "Baby Toys",        slug: "baby-toys"        },
    ],
  },

  // 7 ── Health & Wellness ───────────────────────────────────────────────────
  {
    id: 7,
    name: "Health & Wellness",
    slug: "health-wellness",
    description: "Personal care, fitness accessories, wellness devices and supplements",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Personal Care",        slug: "personal-care"        },
      { name: "Fitness Accessories",  slug: "fitness-accessories"  },
      { name: "Wellness Devices",     slug: "wellness-devices"     },
      { name: "Supplements",          slug: "supplements"          },
      { name: "Massagers",            slug: "massagers"            },
    ],
  },

  // 8 ── Automotive ──────────────────────────────────────────────────────────
  {
    id: 8,
    name: "Automotive",
    slug: "automotive",
    description: "Car accessories, cleaning kits, interior accessories and lighting",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Car Accessories",      slug: "car-accessories"      },
      { name: "Cleaning Kits",        slug: "cleaning-kits"        },
      { name: "Interior Accessories", slug: "interior-accessories" },
      { name: "Tools",                slug: "tools"                },
      { name: "Lighting",             slug: "lighting"             },
    ],
  },

  // 9 ── Office Supplies ─────────────────────────────────────────────────────
  {
    id: 9,
    name: "Office Supplies",
    slug: "office-supplies",
    description: "Desk accessories, stationery, office storage and business essentials",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Desk Accessories",    slug: "desk-accessories"    },
      { name: "Office Storage",      slug: "office-storage"      },
      { name: "Stationery",          slug: "stationery"          },
      { name: "Printers & Ink",      slug: "printers-ink"        },
      { name: "Business Essentials", slug: "business-essentials" },
    ],
  },
];

/** Featured categories (used for homepage category card grid). */
export const FEATURED_CATEGORIES = CATEGORIES.filter((c) => c.featured);

/** Look up a single category by slug. */
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Look up a subcategory by parent slug + sub slug. */
export function getSubcategoryBySlug(
  categorySlug: string,
  subcategorySlug: string,
): Subcategory | undefined {
  return getCategoryBySlug(categorySlug)?.subcategories.find(
    (s) => s.slug === subcategorySlug,
  );
}

export default CATEGORIES;
