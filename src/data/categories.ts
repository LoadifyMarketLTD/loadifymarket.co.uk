/**
 * src/data/categories.ts
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE SOURCE OF TRUTH for all categories and subcategories             │
 * │                                                                          │
 * │  Used by:                                                                │
 * │  • Header / drawer nav  (src/components/Header.tsx)                     │
 * │  • Mobile/desktop drawer  (src/components/MobileDrawer.tsx)             │
 * │  • Homepage category cards  (src/pages/pixel-perfect/Index.tsx)         │
 * │  • Category pages  (src/pages/pixel-perfect/CategoryPage.tsx)           │
 * │  • Category search config  (src/lib/category-config.ts)                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Order is intentional — keep it consistent across the whole app.
 * 17 wholesale B2B categories matching the Loadify Market taxonomy.
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
  // 1 ── Large Letter Items ───────────────────────────────────────────────────
  {
    id: 1,
    name: "Large Letter Items",
    slug: "large-letter-items",
    description: "Small, lightweight items ideal for postal and large-letter format shipping",
    image: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Stationery & Cards",      slug: "stationery-cards"      },
      { name: "Jewellery & Accessories", slug: "jewellery-accessories"  },
      { name: "Phone Accessories",        slug: "phone-accessories"      },
      { name: "Hair Accessories",         slug: "hair-accessories"       },
      { name: "Small Gifts & Novelties",  slug: "small-gifts"            },
      { name: "Keyrings & Badges",        slug: "keyrings-badges"        },
      { name: "Beauty Accessories",       slug: "beauty-accessories"     },
      { name: "Craft Supplies",           slug: "craft-supplies"         },
    ],
  },

  // 2 ── Garden ───────────────────────────────────────────────────────────────
  {
    id: 2,
    name: "Garden",
    slug: "garden",
    description: "Garden tools, outdoor furniture, planters, BBQ and garden décor",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Garden Tools",           slug: "garden-tools"           },
      { name: "Plant Pots & Planters",  slug: "plant-pots-planters"    },
      { name: "Garden Furniture",       slug: "garden-furniture"       },
      { name: "Outdoor Lighting",       slug: "outdoor-lighting"       },
      { name: "BBQ & Outdoor Cooking",  slug: "bbq-outdoor-cooking"    },
      { name: "Watering Equipment",     slug: "watering-equipment"     },
      { name: "Garden Décor",           slug: "garden-decor"           },
      { name: "Seeds & Bulbs",          slug: "seeds-bulbs"            },
    ],
  },

  // 3 ── DIY ──────────────────────────────────────────────────────────────────
  {
    id: 3,
    name: "DIY",
    slug: "diy",
    description: "Power tools, hand tools, fixings, paint and home improvement supplies",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Power Tools",        slug: "power-tools"        },
      { name: "Hand Tools",         slug: "hand-tools"         },
      { name: "Fixings & Fastenings", slug: "fixings-fastenings" },
      { name: "Safety Equipment",   slug: "safety-equipment"   },
      { name: "Paint & Decorating", slug: "paint-decorating"   },
      { name: "Plumbing",           slug: "plumbing"           },
      { name: "Electrical Supplies",slug: "electrical-supplies"},
      { name: "Storage Solutions",  slug: "storage-solutions"  },
    ],
  },

  // 4 ── Cleaning ─────────────────────────────────────────────────────────────
  {
    id: 4,
    name: "Cleaning",
    slug: "cleaning",
    description: "Cleaning products, mops, cloths, bin liners, disinfectants and laundry",
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Cleaning Products",      slug: "cleaning-products"      },
      { name: "Mops & Brushes",         slug: "mops-brushes"           },
      { name: "Cloths & Sponges",       slug: "cloths-sponges"         },
      { name: "Bin Liners & Bags",      slug: "bin-liners-bags"        },
      { name: "Air Fresheners",         slug: "air-fresheners"         },
      { name: "Disinfectants",          slug: "disinfectants"          },
      { name: "Laundry Products",       slug: "laundry-products"       },
      { name: "Household Essentials",   slug: "household-essentials"   },
    ],
  },

  // 5 ── Party & Gift ─────────────────────────────────────────────────────────
  {
    id: 5,
    name: "Party & Gift",
    slug: "party-gift",
    description: "Party supplies, balloons, decorations, gifting and tableware",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Party Supplies",         slug: "party-supplies"         },
      { name: "Balloons & Decorations", slug: "balloons-decorations"   },
      { name: "Gifting & Wrapping",     slug: "gifting-wrapping"       },
      { name: "Candles & Holders",      slug: "candles-holders"        },
      { name: "Novelty Gifts",          slug: "novelty-gifts"          },
      { name: "Seasonal Gifts",         slug: "seasonal-gifts"         },
      { name: "Tableware",              slug: "tableware"              },
      { name: "Cards & Stationery",     slug: "cards-stationery"       },
    ],
  },

  // 6 ── Wholesale Pound Lines ────────────────────────────────────────────────
  {
    id: 6,
    name: "Wholesale Pound Lines",
    slug: "wholesale-pound-lines",
    description: "High-volume pound-line products across all categories",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Household Goods",   slug: "household-goods"   },
      { name: "Health & Beauty",   slug: "health-beauty"     },
      { name: "Stationery",        slug: "stationery"        },
      { name: "Toys & Gifts",      slug: "toys-gifts"        },
      { name: "Cleaning",          slug: "cleaning"          },
      { name: "Food & Snacks",     slug: "food-snacks"       },
      { name: "Seasonal Items",    slug: "seasonal-items"    },
      { name: "Miscellaneous",     slug: "miscellaneous"     },
    ],
  },

  // 7 ── Toys ─────────────────────────────────────────────────────────────────
  {
    id: 7,
    name: "Toys",
    slug: "toys",
    description: "Action figures, educational toys, outdoor toys, board games and arts & crafts",
    image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Action Figures",      slug: "action-figures"     },
      { name: "Educational Toys",    slug: "educational-toys"   },
      { name: "Outdoor Toys",        slug: "outdoor-toys"       },
      { name: "Board Games",         slug: "board-games"        },
      { name: "Dolls & Accessories", slug: "dolls-accessories"  },
      { name: "Baby Toys",           slug: "baby-toys"          },
      { name: "Arts & Crafts",       slug: "arts-crafts"        },
      { name: "Remote Control Toys", slug: "remote-control-toys"},
    ],
  },

  // 8 ── Leisure & Hobbies ────────────────────────────────────────────────────
  {
    id: 8,
    name: "Leisure & Hobbies",
    slug: "leisure-hobbies",
    description: "Arts & crafts, sports, camping, puzzles and hobby equipment",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Arts & Crafts",         slug: "arts-crafts"          },
      { name: "Puzzles & Games",        slug: "puzzles-games"        },
      { name: "Sports & Fitness",       slug: "sports-fitness"       },
      { name: "Camping & Outdoor",      slug: "camping-outdoor"      },
      { name: "Photography",            slug: "photography"          },
      { name: "Collecting",             slug: "collecting"           },
      { name: "Musical Instruments",    slug: "musical-instruments"  },
      { name: "Reading & Books",        slug: "reading-books"        },
    ],
  },

  // 9 ── Baby Supplies ────────────────────────────────────────────────────────
  {
    id: 9,
    name: "Baby Supplies",
    slug: "baby-supplies",
    description: "Baby clothing, feeding, nappies, nursery essentials and baby monitors",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Baby Clothing",       slug: "baby-clothing"       },
      { name: "Feeding & Nursing",   slug: "feeding-nursing"     },
      { name: "Nappies & Changing",  slug: "nappies-changing"    },
      { name: "Baby Toys",           slug: "baby-toys"           },
      { name: "Baby Monitors",       slug: "baby-monitors"       },
      { name: "Travel & Pushchairs", slug: "travel-pushchairs"   },
      { name: "Nursery",             slug: "nursery"             },
      { name: "Safety & Babyproofing", slug: "safety-babyproofing" },
    ],
  },

  // 10 ── Kitchenware ─────────────────────────────────────────────────────────
  {
    id: 10,
    name: "Kitchenware",
    slug: "kitchenware",
    description: "Cookware, bakeware, kitchen tools, storage and small appliances",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Cookware",             slug: "cookware"            },
      { name: "Bakeware",             slug: "bakeware"            },
      { name: "Kitchen Tools",        slug: "kitchen-tools"       },
      { name: "Storage Containers",   slug: "storage-containers"  },
      { name: "Cutlery & Flatware",   slug: "cutlery-flatware"    },
      { name: "Drinkware",            slug: "drinkware"           },
      { name: "Small Appliances",     slug: "small-appliances"    },
      { name: "Kitchen Gadgets",      slug: "kitchen-gadgets"     },
    ],
  },

  // 11 ── Health & Beauty ─────────────────────────────────────────────────────
  {
    id: 11,
    name: "Health & Beauty",
    slug: "health-beauty",
    description: "Skincare, haircare, makeup, personal care, vitamins and fragrances",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Skincare",          slug: "skincare"          },
      { name: "Haircare",          slug: "haircare"          },
      { name: "Makeup & Cosmetics",slug: "makeup-cosmetics"  },
      { name: "Personal Care",     slug: "personal-care"     },
      { name: "Vitamins & Supplements", slug: "vitamins-supplements" },
      { name: "Fragrances",        slug: "fragrances"        },
      { name: "Medical Supplies",  slug: "medical-supplies"  },
      { name: "Oral Care",         slug: "oral-care"         },
    ],
  },

  // 12 ── Homeware ────────────────────────────────────────────────────────────
  {
    id: 12,
    name: "Homeware",
    slug: "homeware",
    description: "Bedding, curtains, rugs, bathroom accessories and home décor",
    image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Bedding & Pillows",        slug: "bedding-pillows"        },
      { name: "Curtains & Blinds",        slug: "curtains-blinds"        },
      { name: "Rugs & Flooring",          slug: "rugs-flooring"          },
      { name: "Cushions & Throws",        slug: "cushions-throws"        },
      { name: "Bathroom Accessories",     slug: "bathroom-accessories"   },
      { name: "Picture Frames & Clocks",  slug: "picture-frames-clocks"  },
      { name: "Candles & Home Fragrance", slug: "candles-home-fragrance" },
      { name: "Home Décor",               slug: "home-decor"             },
    ],
  },

  // 13 ── Electrical ──────────────────────────────────────────────────────────
  {
    id: 13,
    name: "Electrical",
    slug: "electrical",
    description: "LED lighting, phone accessories, cables, smart home and audio",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "LED Lighting",          slug: "led-lighting"          },
      { name: "Phone Accessories",     slug: "phone-accessories"     },
      { name: "Cables & Adapters",     slug: "cables-adapters"       },
      { name: "Smart Home",            slug: "smart-home"            },
      { name: "Batteries",             slug: "batteries"             },
      { name: "Audio",                 slug: "audio"                 },
      { name: "Small Appliances",      slug: "small-appliances"      },
      { name: "Computer Accessories",  slug: "computer-accessories"  },
    ],
  },

  // 14 ── Pet Supplies ────────────────────────────────────────────────────────
  {
    id: 14,
    name: "Pet Supplies",
    slug: "pet-supplies",
    description: "Dog, cat, small animal, bird and fish supplies, food, toys and grooming",
    image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Dog Supplies",         slug: "dog-supplies"         },
      { name: "Cat Supplies",         slug: "cat-supplies"         },
      { name: "Small Animal Supplies",slug: "small-animal-supplies"},
      { name: "Bird Supplies",        slug: "bird-supplies"        },
      { name: "Fish & Aquatics",      slug: "fish-aquatics"        },
      { name: "Pet Food",             slug: "pet-food"             },
      { name: "Pet Toys",             slug: "pet-toys"             },
      { name: "Grooming",             slug: "grooming"             },
    ],
  },

  // 15 ── Stationery ──────────────────────────────────────────────────────────
  {
    id: 15,
    name: "Stationery",
    slug: "stationery",
    description: "Pens, notebooks, office supplies, art materials and greeting cards",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Pens & Pencils",    slug: "pens-pencils"    },
      { name: "Notebooks & Journals", slug: "notebooks-journals" },
      { name: "Office Supplies",   slug: "office-supplies" },
      { name: "Art Supplies",      slug: "art-supplies"    },
      { name: "Greeting Cards",    slug: "greeting-cards"  },
      { name: "Gift Wrap",         slug: "gift-wrap"       },
      { name: "Labels & Tags",     slug: "labels-tags"     },
      { name: "Filing & Storage",  slug: "filing-storage"  },
    ],
  },

  // 16 ── Seasonal ────────────────────────────────────────────────────────────
  {
    id: 16,
    name: "Seasonal",
    slug: "seasonal",
    description: "Christmas, Easter, Halloween, Valentine's and all seasonal ranges",
    image: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: false,
    subcategories: [
      { name: "Christmas",       slug: "christmas"       },
      { name: "Easter",          slug: "easter"          },
      { name: "Halloween",       slug: "halloween"       },
      { name: "Valentine's Day", slug: "valentines-day"  },
      { name: "Summer",          slug: "summer"          },
      { name: "Back to School",  slug: "back-to-school"  },
      { name: "Spring",          slug: "spring"          },
      { name: "Diwali & Eid",    slug: "diwali-eid"      },
    ],
  },

  // 17 ── Wholesale Clothing ──────────────────────────────────────────────────
  {
    id: 17,
    name: "Wholesale Clothing",
    slug: "wholesale-clothing",
    description: "Women's, men's and children's clothing, sportswear and underwear",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=75&fm=webp",
    featured: true,
    subcategories: [
      { name: "Women's Clothing",  slug: "womens-clothing"  },
      { name: "Men's Clothing",    slug: "mens-clothing"    },
      { name: "Children's Clothing", slug: "childrens-clothing" },
      { name: "Baby Clothing",     slug: "baby-clothing"    },
      { name: "Sportswear",        slug: "sportswear"       },
      { name: "Underwear & Socks", slug: "underwear-socks"  },
      { name: "Accessories",       slug: "accessories"      },
      { name: "Swimwear",          slug: "swimwear"         },
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
