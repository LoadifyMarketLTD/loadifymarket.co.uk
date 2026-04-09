/**
 * src/data/categories.ts
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE SOURCE OF TRUTH — CATEGORY TREE                                  │
 * │                                                                          │
 * │  Used by:                                                                │
 * │  • Mobile drawer (src/components/MobileDrawer.tsx)                      │
 * │  • Header category nav (src/components/Header.tsx)                      │
 * │  • Homepage category cards / slider                                      │
 * │  • Category pages (src/pages/pixel-perfect/CategoryPage.tsx)            │
 * │  • Category search config (src/lib/category-config.ts)                  │
 * │  • Seller upload / filters                                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Order is intentional — keep it consistent across the whole app.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Subcategory {
  /** Human-readable name */
  name: string;
  /** URL-safe slug, e.g. "garden-tools" */
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

/** All 17 wholesale marketplace categories in approved display order. */
export const CATEGORIES: readonly Category[] = [
  // 1 ── Large Letter Items ──────────────────────────────────────────────────
  {
    id: 1,
    name: "Large Letter Items",
    slug: "large-letter-items",
    description: "Books, cards, jewellery, phone accessories and more — all letterbox-friendly",
    image: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Books & Media",       slug: "books-media"        },
      { name: "Greeting Cards",      slug: "greeting-cards"     },
      { name: "Jewellery",           slug: "jewellery"          },
      { name: "Phone Accessories",   slug: "phone-accessories"  },
      { name: "Beauty Samples",      slug: "beauty-samples"     },
      { name: "Art Prints",          slug: "art-prints"         },
    ],
  },

  // 2 ── Garden ──────────────────────────────────────────────────────────────
  {
    id: 2,
    name: "Garden",
    slug: "garden",
    description: "Garden tools, outdoor furniture, planting, pest control and more",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Garden Tools",               slug: "garden-tools"               },
      { name: "Planting & Growing",         slug: "planting-growing"           },
      { name: "Decorative & Novelty",       slug: "decorative-novelty"         },
      { name: "Outdoor Lighting",           slug: "outdoor-lighting"           },
      { name: "Pest Killers & Deterrents",  slug: "pest-killers-deterrents"    },
      { name: "Bird Feeders",               slug: "bird-feeders"               },
      { name: "BBQ & Picnic",               slug: "bbq-picnic"                 },
      { name: "Hoses & Watering",           slug: "hoses-watering"             },
      { name: "Pegs & Clotheslines",        slug: "pegs-clotheslines"          },
      { name: "Garden Wear",                slug: "garden-wear"                },
      { name: "Shed & Garage Accessories",  slug: "shed-garage-accessories"    },
      { name: "Twine & Garden Ties",        slug: "twine-garden-ties"          },
    ],
  },

  // 3 ── DIY ─────────────────────────────────────────────────────────────────
  {
    id: 3,
    name: "DIY",
    slug: "diy",
    description: "Power tools, hand tools, hardware, fixings, plumbing and decorating",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Power Tools",          slug: "power-tools"       },
      { name: "Hand Tools",           slug: "hand-tools"        },
      { name: "Hardware & Fixings",   slug: "hardware-fixings"  },
      { name: "Plumbing",             slug: "plumbing"          },
      { name: "Electrical",           slug: "electrical"        },
      { name: "Decorating & Painting",slug: "decorating-painting"},
      { name: "Adhesives & Sealants", slug: "adhesives-sealants"},
      { name: "Safety & PPE",         slug: "safety-ppe"        },
    ],
  },

  // 4 ── Cleaning ────────────────────────────────────────────────────────────
  {
    id: 4,
    name: "Cleaning",
    slug: "cleaning",
    description: "Surface cleaners, floor care, laundry, kitchen and bathroom cleaning",
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Surface Cleaners",    slug: "surface-cleaners"   },
      { name: "Floor Care",          slug: "floor-care"         },
      { name: "Laundry Products",    slug: "laundry-products"   },
      { name: "Kitchen Cleaning",    slug: "kitchen-cleaning"   },
      { name: "Bathroom Cleaning",   slug: "bathroom-cleaning"  },
      { name: "Cleaning Equipment",  slug: "cleaning-equipment" },
      { name: "Disposable Gloves",   slug: "disposable-gloves"  },
      { name: "Air Fresheners",      slug: "air-fresheners"     },
    ],
  },

  // 5 ── Party & Gift ────────────────────────────────────────────────────────
  {
    id: 5,
    name: "Party & Gift",
    slug: "party-gift",
    description: "Decorations, tableware, balloons, fancy dress and gift wrap",
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Party Decorations",   slug: "party-decorations"  },
      { name: "Balloons",            slug: "balloons"           },
      { name: "Gift Wrap & Bags",    slug: "gift-wrap-bags"     },
      { name: "Tableware",           slug: "tableware"          },
      { name: "Banners & Bunting",   slug: "banners-bunting"    },
      { name: "Candles & Holders",   slug: "candles-holders"    },
      { name: "Fancy Dress",         slug: "fancy-dress"        },
      { name: "Seasonal Decorations",slug: "seasonal-decorations"},
    ],
  },

  // 6 ── Wholesale Pound Lines ───────────────────────────────────────────────
  {
    id: 6,
    name: "Wholesale Pound Lines",
    slug: "wholesale-pound-lines",
    description: "High-volume pound line products: household, snacks, toiletries and more",
    image: "https://images.unsplash.com/photo-1542601906897-ecd92e08d0c4?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Household",           slug: "household"          },
      { name: "Stationery",          slug: "stationery"         },
      { name: "Confectionery & Snacks", slug: "confectionery-snacks" },
      { name: "Toiletries & Beauty", slug: "toiletries-beauty"  },
      { name: "Toys & Games",        slug: "toys-games"         },
      { name: "Seasonal Lines",      slug: "seasonal-lines"     },
    ],
  },

  // 7 ── Toys ────────────────────────────────────────────────────────────────
  {
    id: 7,
    name: "Toys",
    slug: "toys",
    description: "Action figures, educational toys, outdoor play and arts & crafts",
    image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
    featured: true,
    subcategories: [
      { name: "Action Figures",      slug: "action-figures"    },
      { name: "Educational Toys",    slug: "educational-toys"  },
      { name: "Outdoor Play",        slug: "outdoor-play"      },
      { name: "Arts & Crafts",       slug: "arts-crafts"       },
      { name: "Puzzles & Games",     slug: "puzzles-games"     },
      { name: "Dolls & Accessories", slug: "dolls-accessories" },
      { name: "Building Toys",       slug: "building-toys"     },
      { name: "Baby Toys",           slug: "baby-toys"         },
    ],
  },

  // 8 ── Leisure & Hobbies ───────────────────────────────────────────────────
  {
    id: 8,
    name: "Leisure & Hobbies",
    slug: "leisure-hobbies",
    description: "Sports, camping, cycling, arts, music and travel accessories",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Sports & Fitness",    slug: "sports-fitness"      },
      { name: "Camping & Hiking",    slug: "camping-hiking"      },
      { name: "Cycling",             slug: "cycling"             },
      { name: "Water Sports",        slug: "water-sports"        },
      { name: "Arts & Crafts",       slug: "arts-crafts"         },
      { name: "Musical Instruments", slug: "musical-instruments" },
      { name: "Photography",         slug: "photography"         },
      { name: "Travel Accessories",  slug: "travel-accessories"  },
    ],
  },

  // 9 ── Baby Supplies ───────────────────────────────────────────────────────
  {
    id: 9,
    name: "Baby Supplies",
    slug: "baby-supplies",
    description: "Feeding, nursery, clothing, bath & changing and baby travel essentials",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Feeding",             slug: "feeding"            },
      { name: "Nursery",             slug: "nursery"            },
      { name: "Clothing & Accessories", slug: "clothing-accessories" },
      { name: "Bath & Changing",     slug: "bath-changing"      },
      { name: "Travel & Safety",     slug: "travel-safety"      },
      { name: "Toys & Development",  slug: "toys-development"   },
      { name: "Health & Care",       slug: "health-care"        },
    ],
  },

  // 10 ── Kitchenware ────────────────────────────────────────────────────────
  {
    id: 10,
    name: "Kitchenware",
    slug: "kitchenware",
    description: "Cookware, bakeware, kitchen tools, tableware and kitchen appliances",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Cookware",                 slug: "cookware"            },
      { name: "Bakeware",                 slug: "bakeware"            },
      { name: "Kitchen Tools & Gadgets",  slug: "kitchen-tools-gadgets" },
      { name: "Tableware",                slug: "tableware"           },
      { name: "Storage & Organisation",   slug: "storage-organisation"},
      { name: "Kitchen Appliances",       slug: "kitchen-appliances"  },
      { name: "Cutlery",                  slug: "cutlery"             },
      { name: "Drinkware",                slug: "drinkware"           },
    ],
  },

  // 11 ── Health & Beauty ────────────────────────────────────────────────────
  {
    id: 11,
    name: "Health & Beauty",
    slug: "health-beauty",
    description: "Skincare, haircare, makeup, fragrance, personal care and supplements",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Skincare",            slug: "skincare"           },
      { name: "Haircare",            slug: "haircare"           },
      { name: "Makeup & Cosmetics",  slug: "makeup-cosmetics"   },
      { name: "Fragrance",           slug: "fragrance"          },
      { name: "Personal Care",       slug: "personal-care"      },
      { name: "Health Supplements",  slug: "health-supplements" },
      { name: "Dental Care",         slug: "dental-care"        },
      { name: "Eye Care",            slug: "eye-care"           },
    ],
  },

  // 12 ── Homeware ───────────────────────────────────────────────────────────
  {
    id: 12,
    name: "Homeware",
    slug: "homeware",
    description: "Bedding, curtains, rugs, cushions, towels and home accessories",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Bedding",             slug: "bedding"            },
      { name: "Curtains & Blinds",   slug: "curtains-blinds"    },
      { name: "Rugs & Mats",         slug: "rugs-mats"          },
      { name: "Cushions & Throws",   slug: "cushions-throws"    },
      { name: "Towels & Bath Linen", slug: "towels-bath-linen"  },
      { name: "Home Fragrance",      slug: "home-fragrance"     },
      { name: "Picture Frames",      slug: "picture-frames"     },
      { name: "Clocks",              slug: "clocks"             },
    ],
  },

  // 13 ── Electrical ─────────────────────────────────────────────────────────
  {
    id: 13,
    name: "Electrical",
    slug: "electrical",
    description: "Small appliances, lighting, TV & audio, computing and smart home",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Small Appliances",    slug: "small-appliances"   },
      { name: "Lighting",            slug: "lighting"           },
      { name: "TV & Audio",          slug: "tv-audio"           },
      { name: "Computing",           slug: "computing"          },
      { name: "Smart Home",          slug: "smart-home"         },
      { name: "Phone Accessories",   slug: "phone-accessories"  },
      { name: "Batteries & Power",   slug: "batteries-power"    },
      { name: "Cables & Adapters",   slug: "cables-adapters"    },
    ],
  },

  // 14 ── Pet Supplies ───────────────────────────────────────────────────────
  {
    id: 14,
    name: "Pet Supplies",
    slug: "pet-supplies",
    description: "Dog, cat, bird and small pet supplies, food, grooming and health",
    image: "https://images.unsplash.com/photo-1548767797-d8c844163c4a?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Dog Supplies",        slug: "dog-supplies"       },
      { name: "Cat Supplies",        slug: "cat-supplies"       },
      { name: "Bird Supplies",       slug: "bird-supplies"      },
      { name: "Fish & Aquatic",      slug: "fish-aquatic"       },
      { name: "Small Pets",          slug: "small-pets"         },
      { name: "Pet Food & Treats",   slug: "pet-food-treats"    },
      { name: "Pet Grooming",        slug: "pet-grooming"       },
      { name: "Pet Health",          slug: "pet-health"         },
    ],
  },

  // 15 ── Stationery ─────────────────────────────────────────────────────────
  {
    id: 15,
    name: "Stationery",
    slug: "stationery",
    description: "Pens, notebooks, art supplies, office essentials and craft materials",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Pens & Pencils",      slug: "pens-pencils"       },
      { name: "Notebooks & Pads",    slug: "notebooks-pads"     },
      { name: "Filing & Storage",    slug: "filing-storage"     },
      { name: "Art Supplies",        slug: "art-supplies"       },
      { name: "Office Supplies",     slug: "office-supplies"    },
      { name: "Craft Supplies",      slug: "craft-supplies"     },
      { name: "Cards & Envelopes",   slug: "cards-envelopes"    },
      { name: "Educational",         slug: "educational"        },
    ],
  },

  // 16 ── Seasonal ───────────────────────────────────────────────────────────
  {
    id: 16,
    name: "Seasonal",
    slug: "seasonal",
    description: "Christmas, Easter, Halloween, summer and all seasonal occasions",
    image: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Christmas",           slug: "christmas"          },
      { name: "Easter",              slug: "easter"             },
      { name: "Halloween",           slug: "halloween"          },
      { name: "Summer",              slug: "summer"             },
      { name: "Back to School",      slug: "back-to-school"     },
      { name: "Valentine's Day",     slug: "valentines-day"     },
      { name: "Mother's Day",        slug: "mothers-day"        },
      { name: "Father's Day",        slug: "fathers-day"        },
    ],
  },

  // 17 ── Wholesale Clothing ─────────────────────────────────────────────────
  {
    id: 17,
    name: "Wholesale Clothing",
    slug: "wholesale-clothing",
    description: "Bulk men's, women's and children's clothing, footwear and accessories",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    featured: false,
    subcategories: [
      { name: "Men's",               slug: "mens"               },
      { name: "Women's",             slug: "womens"             },
      { name: "Children's",          slug: "childrens"          },
      { name: "Footwear",            slug: "footwear"           },
      { name: "Accessories",         slug: "accessories"        },
      { name: "Sportswear",          slug: "sportswear"         },
      { name: "Underwear & Socks",   slug: "underwear-socks"    },
      { name: "Bags & Luggage",      slug: "bags-luggage"       },
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
