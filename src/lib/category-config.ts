/**
 * category-config.ts
 *
 * Single source of truth for the 12 main product category pages served by
 * /category/:slug.  Each entry drives the CategoryPage's title, subtitle,
 * icon, subcategory chips, empty-state copy, and the Supabase product filter.
 *
 * "All Categories" is served by /catalog.
 * All 12 main categories are served exclusively by /category/:slug.
 */

import {
  Cpu, Shirt, Home, Wrench, Car, Briefcase, RotateCcw, Tag,
  Gamepad2, PawPrint, Sparkles, Layers,
  Trophy, Heart, Baby, UtensilsCrossed,
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
      { label: 'Mixed Returns', searchTerm: 'mixed returns lot' },
      { label: 'Customer Returns', condition: 'used' },
      { label: 'Electronics Returns', searchTerm: 'electronics returns' },
      { label: 'Home Returns', searchTerm: 'home garden returns' },
      { label: 'General Merchandise', searchTerm: 'general merchandise returns' },
      { label: 'Small Appliance Returns', searchTerm: 'appliance small returns' },
    ],
    emptyState: {
      title: 'No Amazon Returns listings right now',
      description:
        'Return lots are added as new pallets arrive. Check back soon or browse Clearance stock.',
    },
    productFilter: { types: ['lot'] },
  },

  // ── Clearance ──────────────────────────────────────────────────────────────
  {
    slug: 'clearance',
    label: 'Clearance',
    title: 'Clearance',
    subtitle: 'End of line, overstock and liquidation — everything heavily discounted',
    icon: Tag,
    iconColor: 'text-red-500',
    accentBg: 'bg-red-500/15',
    chips: [
      { label: 'All Clearance' },
      { label: 'End of Line', searchTerm: 'end of line eol' },
      { label: 'Overstock', searchTerm: 'overstock surplus excess' },
      { label: 'Liquidation', searchTerm: 'liquidation liquidated' },
      { label: 'Retail Clearance', searchTerm: 'retail clearance' },
      { label: 'Seasonal Clearance', searchTerm: 'seasonal clearance' },
      { label: 'Warehouse Clearance', searchTerm: 'warehouse clearance' },
    ],
    emptyState: {
      title: 'No clearance listings available yet',
      description:
        'Clearance lines are added as sellers clear stock. Browse Wholesale or all categories in the meantime.',
    },
    productFilter: { types: ['clearance'] },
  },

  // ── Wholesale ─────────────────────────────────────────────────────────────
  {
    slug: 'wholesale',
    label: 'Wholesale',
    title: 'Wholesale',
    subtitle: 'Bulk pallet listings, job lots and trade bundles from verified UK wholesalers',
    icon: Layers,
    iconColor: 'text-yellow-500',
    accentBg: 'bg-yellow-500/15',
    chips: [
      { label: 'All Wholesale' },
      { label: 'Bulk Lots', searchTerm: 'bulk lot' },
      { label: 'Mixed Pallets', searchTerm: 'mixed pallet' },
      { label: 'Full Pallets', searchTerm: 'full pallet' },
      { label: 'Business Clearance', searchTerm: 'business clearance' },
      { label: 'Job Lots', searchTerm: 'job lot joblot' },
      { label: 'Trade Bundles', searchTerm: 'trade bundle wholesale' },
    ],
    emptyState: {
      title: 'No wholesale lots listed yet',
      description:
        'Wholesale pallets and bulk lots are added by verified trade sellers. Check back soon or browse all categories.',
    },
    productFilter: { types: ['pallet', 'wholesale', 'lot'] },
  },

  // ── Electronics ───────────────────────────────────────────────────────────
  {
    slug: 'electronics',
    label: 'Electronics',
    title: 'Electronics',
    subtitle: 'Phones, laptops, gaming, audio, cameras, smart home and more',
    icon: Cpu,
    iconColor: 'text-blue-500',
    accentBg: 'bg-blue-500/15',
    chips: [
      { label: 'All Electronics' },
      { label: 'Mobile Phones', searchTerm: 'mobile phone smartphone' },
      { label: 'Laptops', searchTerm: 'laptop notebook computer' },
      { label: 'Tablets', searchTerm: 'tablet ipad android' },
      { label: 'Audio', searchTerm: 'headphone speaker audio earphone' },
      { label: 'TVs & Displays', searchTerm: 'tv television display monitor screen' },
      { label: 'Gaming', searchTerm: 'gaming console game controller' },
      { label: 'Cameras', searchTerm: 'camera photography dslr' },
      { label: 'Accessories', searchTerm: 'electronics accessories cable charger' },
      { label: 'Smart Home', searchTerm: 'smart home alexa google nest' },
      { label: 'Small Electronics', searchTerm: 'small appliance gadget device' },
    ],
    emptyState: {
      title: 'No electronics products found',
      description:
        'Try adjusting your search or filters, or browse another subcategory. New electronics are listed every day.',
    },
    productFilter: { categorySlug: 'electronics' },
  },

  // ── Home & Garden ─────────────────────────────────────────────────────────
  {
    slug: 'home-garden',
    label: 'Home & Garden',
    title: 'Home & Garden',
    subtitle: 'Furniture, kitchenware, décor, bedding, lighting and garden essentials',
    icon: Home,
    iconColor: 'text-emerald-500',
    accentBg: 'bg-emerald-500/15',
    chips: [
      { label: 'All Home & Garden' },
      { label: 'Furniture', searchTerm: 'furniture sofa chair table desk' },
      { label: 'Kitchen & Dining', searchTerm: 'kitchen cookware dining utensil' },
      { label: 'Home Decor', searchTerm: 'home decor decoration ornament' },
      { label: 'Bedding', searchTerm: 'bedding duvet pillow mattress' },
      { label: 'Lighting', searchTerm: 'lighting lamp light bulb' },
      { label: 'Storage', searchTerm: 'storage box shelf organiser' },
      { label: 'Garden Tools', searchTerm: 'garden tool spade fork mower' },
      { label: 'Outdoor Living', searchTerm: 'outdoor patio garden furniture' },
      { label: 'DIY Home Essentials', searchTerm: 'diy home paint tile flooring' },
    ],
    emptyState: {
      title: 'No Home & Garden products found',
      description:
        'Try adjusting your search or filters, or select another subcategory. New home and garden items are added regularly.',
    },
    productFilter: { categorySlug: 'home-garden' },
  },

  // ── Tools & DIY ───────────────────────────────────────────────────────────
  {
    slug: 'tools-diy',
    label: 'Tools & DIY',
    title: 'Tools & DIY',
    subtitle: 'Power tools, hand tools, hardware, safety equipment and building supplies',
    icon: Wrench,
    iconColor: 'text-amber-600',
    accentBg: 'bg-amber-600/15',
    chips: [
      { label: 'All Tools & DIY' },
      { label: 'Power Tools', searchTerm: 'power drill saw grinder sander' },
      { label: 'Hand Tools', searchTerm: 'hand tool spanner wrench screwdriver' },
      { label: 'Tool Storage', searchTerm: 'tool storage box chest bag' },
      { label: 'Hardware', searchTerm: 'hardware bolt nut fixing bracket' },
      { label: 'Building Materials', searchTerm: 'building construction timber brick' },
      { label: 'Safety Equipment', searchTerm: 'safety ppe gloves helmet high vis' },
      { label: 'Electrical Tools', searchTerm: 'electrical cable wire socket tester' },
      { label: 'Plumbing Tools', searchTerm: 'plumbing pipe fitting valve' },
      { label: 'Workshop Equipment', searchTerm: 'workshop bench vice lathe grinder' },
    ],
    emptyState: {
      title: 'No Tools & DIY products found',
      description:
        'Try adjusting your search or filters, or browse another subcategory. New tools are listed by trade sellers regularly.',
    },
    productFilter: { categorySlug: 'tools' },
  },

  // ── Business Supplies ─────────────────────────────────────────────────────
  {
    slug: 'business-supplies',
    label: 'Business Supplies',
    title: 'Business Supplies',
    subtitle: 'Office essentials, packaging, catering, cleaning and warehouse stock',
    icon: Briefcase,
    iconColor: 'text-indigo-500',
    accentBg: 'bg-indigo-500/15',
    chips: [
      { label: 'All Business Supplies' },
      { label: 'Office Supplies', searchTerm: 'office stationery printer paper desk' },
      { label: 'Packaging', searchTerm: 'packaging boxes bags tape bubble' },
      { label: 'Storage & Shelving', searchTerm: 'storage shelf racking shelving' },
      { label: 'Cleaning Supplies', searchTerm: 'cleaning hygiene janitorial sanitiser' },
      { label: 'Catering Supplies', searchTerm: 'catering food service kitchen commercial' },
      { label: 'Retail Supplies', searchTerm: 'retail pos display signage' },
      { label: 'Warehouse Essentials', searchTerm: 'warehouse pallet truck forklift' },
      { label: 'Workwear & PPE', searchTerm: 'workwear ppe safety uniform hi-vis' },
    ],
    emptyState: {
      title: 'No Business Supplies listed yet',
      description:
        'Try adjusting your filters or browse a different subcategory. Business stock is added regularly.',
    },
    productFilter: { categorySlug: 'business' },
  },

  // ── Fashion ───────────────────────────────────────────────────────────────
  {
    slug: 'fashion',
    label: 'Fashion',
    title: 'Fashion',
    subtitle: "Men's, women's and kids' clothing, shoes, bags, jewellery and accessories",
    icon: Shirt,
    iconColor: 'text-pink-500',
    accentBg: 'bg-pink-500/15',
    chips: [
      { label: 'All Fashion' },
      { label: "Men's Clothing", searchTerm: 'mens clothing shirt trouser jacket' },
      { label: "Women's Clothing", searchTerm: 'womens ladies clothing dress blouse' },
      { label: "Kids' Clothing", searchTerm: 'kids children boys girls baby clothing' },
      { label: 'Shoes', searchTerm: 'shoes trainers boots heels sandals' },
      { label: 'Bags & Accessories', searchTerm: 'handbag bag accessories belt scarf hat' },
      { label: 'Jewellery', searchTerm: 'jewellery necklace ring bracelet earring' },
      { label: 'Watches', searchTerm: 'watch timepiece wristwatch' },
      { label: 'Workwear', searchTerm: 'workwear uniform hi-vis work clothing' },
      { label: 'Mixed Fashion Lots', searchTerm: 'mixed fashion lot clothing bundle' },
    ],
    emptyState: {
      title: 'No fashion products found',
      description:
        'Try adjusting your search or filters, or select another subcategory. New clothing and accessories are added daily.',
    },
    productFilter: { categorySlug: 'fashion' },
  },

  // ── Automotive ────────────────────────────────────────────────────────────
  {
    slug: 'automotive',
    label: 'Automotive',
    title: 'Automotive',
    subtitle: 'Car parts, van parts, tyres, batteries, tools and vehicle accessories',
    icon: Car,
    iconColor: 'text-rose-600',
    accentBg: 'bg-rose-600/15',
    chips: [
      { label: 'All Automotive' },
      { label: 'Car Parts', searchTerm: 'car parts engine exhaust brake suspension' },
      { label: 'Van Parts', searchTerm: 'van parts commercial vehicle' },
      { label: 'Tools & Garage', searchTerm: 'garage tool mechanics ramp lift' },
      { label: 'Car Care', searchTerm: 'car care polish wax valeting' },
      { label: 'Tyres & Wheels', searchTerm: 'tyres tires wheels alloy rim' },
      { label: 'Batteries', searchTerm: 'car battery starter jump' },
      { label: 'Accessories', searchTerm: 'car accessories interior exterior dash' },
      { label: 'Diagnostics', searchTerm: 'diagnostics obd scanner reader' },
      { label: 'Commercial Vehicle Supplies', searchTerm: 'commercial vehicle fleet hgv' },
    ],
    emptyState: {
      title: 'No automotive products found',
      description:
        'Try adjusting your search or filters, or browse another subcategory. New automotive parts and accessories are added regularly.',
    },
    productFilter: { categorySlug: 'vehicles' },
  },

  // ── Toys ──────────────────────────────────────────────────────────────────
  {
    slug: 'toys',
    label: 'Toys',
    title: 'Toys',
    subtitle: 'Baby toys, educational toys, games, puzzles and hobby collectibles',
    icon: Gamepad2,
    iconColor: 'text-purple-500',
    accentBg: 'bg-purple-500/15',
    chips: [
      { label: 'All Toys' },
      { label: 'Baby & Toddler Toys', searchTerm: 'baby toddler toy infant' },
      { label: 'Educational Toys', searchTerm: 'educational learning toy stem' },
      { label: 'Outdoor Toys', searchTerm: 'outdoor toy trampoline scooter bike' },
      { label: 'Action Figures', searchTerm: 'action figure superhero character toy' },
      { label: 'Dolls', searchTerm: 'doll barbie playset' },
      { label: 'Games & Puzzles', searchTerm: 'game puzzle board card jigsaw' },
      { label: 'Hobby & Collectibles', searchTerm: 'hobby collectible model train' },
    ],
    emptyState: {
      title: 'No toy products found',
      description:
        'Try adjusting your search or filters, or select another subcategory. New toys are listed regularly.',
    },
    productFilter: { categorySlug: 'toys' },
  },

  // ── Pets ──────────────────────────────────────────────────────────────────
  {
    slug: 'pets',
    label: 'Pets',
    title: 'Pets',
    subtitle: 'Dog supplies, cat supplies, pet food, aquarium and small animal essentials',
    icon: PawPrint,
    iconColor: 'text-teal-500',
    accentBg: 'bg-teal-500/15',
    chips: [
      { label: 'All Pets' },
      { label: 'Dog Supplies', searchTerm: 'dog puppy canine lead collar bed' },
      { label: 'Cat Supplies', searchTerm: 'cat kitten feline litter scratching' },
      { label: 'Pet Food', searchTerm: 'pet food feed treat kibble' },
      { label: 'Small Animal Supplies', searchTerm: 'small animal hamster rabbit guinea pig' },
      { label: 'Aquarium', searchTerm: 'aquarium fish tank filter' },
      { label: 'Bird Supplies', searchTerm: 'bird cage perch seed feeder' },
      { label: 'Pet Accessories', searchTerm: 'pet accessories toy grooming' },
    ],
    emptyState: {
      title: 'No pet products found',
      description:
        'Try adjusting your search or filters, or browse another subcategory. New pet supplies are added regularly.',
    },
    productFilter: { categorySlug: 'pets' },
  },

  // ── Handmade ──────────────────────────────────────────────────────────────
  {
    slug: 'handmade',
    label: 'Handmade',
    title: 'Handmade',
    subtitle: 'Unique handcrafted items — gifts, candles, art, jewellery and personalised pieces',
    icon: Sparkles,
    iconColor: 'text-fuchsia-500',
    accentBg: 'bg-fuchsia-500/15',
    chips: [
      { label: 'All Handmade' },
      { label: 'Home Decor', searchTerm: 'handmade home decor decoration' },
      { label: 'Gifts', searchTerm: 'handmade gift present' },
      { label: 'Candles', searchTerm: 'candle wax scented soy' },
      { label: 'Jewellery', searchTerm: 'handmade jewellery necklace ring' },
      { label: 'Art & Crafts', searchTerm: 'art craft painting print' },
      { label: 'Personalised Items', searchTerm: 'personalised custom bespoke engraved' },
      { label: 'Crochet / Knitted', searchTerm: 'crochet knitted knit wool' },
      { label: 'Seasonal', searchTerm: 'seasonal christmas halloween wedding' },
    ],
    emptyState: {
      title: 'No handmade products found',
      description:
        'Try adjusting your search or filters, or select another subcategory. New handmade items are listed regularly.',
    },
    productFilter: { categorySlug: 'handmade' },
  },

  // ── Sports & Outdoors ──────────────────────────────────────────────────────
  {
    slug: 'sports-outdoors',
    label: 'Sports & Outdoors',
    title: 'Sports & Outdoors',
    subtitle: 'Fitness equipment, outdoor gear, cycling, camping and team sports',
    icon: Trophy,
    iconColor: 'text-green-600',
    accentBg: 'bg-green-600/15',
    chips: [
      { label: 'All Sports & Outdoors' },
      { label: 'Gym & Fitness', searchTerm: 'gym fitness dumbbell weights treadmill' },
      { label: 'Cycling', searchTerm: 'bike bicycle cycling helmet pump' },
      { label: 'Football & Team Sports', searchTerm: 'football rugby cricket bat ball goal' },
      { label: 'Running', searchTerm: 'running trainers jogging shoes' },
      { label: 'Camping & Hiking', searchTerm: 'camping hiking tent sleeping bag rucksack' },
      { label: 'Outdoor Clothing', searchTerm: 'outdoor jacket waterproof fleece hiking' },
      { label: 'Water Sports', searchTerm: 'water sports kayak surf paddle board' },
      { label: 'Golf', searchTerm: 'golf club driver iron bag trolley' },
      { label: 'Racket Sports', searchTerm: 'tennis badminton squash racket' },
    ],
    emptyState: {
      title: 'No Sports & Outdoors products found',
      description:
        'Try adjusting your search or filters. New sports and outdoor equipment is listed regularly.',
    },
    productFilter: { categorySlug: 'sports-outdoors' },
  },

  // ── Health & Beauty ────────────────────────────────────────────────────────
  {
    slug: 'health-beauty',
    label: 'Health & Beauty',
    title: 'Health & Beauty',
    subtitle: 'Skincare, haircare, vitamins, fragrances, personal care and wellness',
    icon: Heart,
    iconColor: 'text-rose-500',
    accentBg: 'bg-rose-500/15',
    chips: [
      { label: 'All Health & Beauty' },
      { label: 'Skincare', searchTerm: 'skincare moisturiser serum face cream' },
      { label: 'Haircare', searchTerm: 'haircare shampoo conditioner hair mask' },
      { label: 'Fragrances', searchTerm: 'fragrance perfume aftershave cologne' },
      { label: 'Make-up & Cosmetics', searchTerm: 'makeup cosmetics foundation lipstick' },
      { label: 'Vitamins & Supplements', searchTerm: 'vitamins supplements health protein' },
      { label: 'Personal Care', searchTerm: 'personal care hygiene deodorant body' },
      { label: 'Hair Tools', searchTerm: 'hair dryer straightener curler tools' },
      { label: 'Oral Care', searchTerm: 'oral care toothbrush toothpaste whitening' },
      { label: 'Wellness', searchTerm: 'wellness massage relaxation aromatherapy' },
    ],
    emptyState: {
      title: 'No Health & Beauty products found',
      description:
        'Try adjusting your search or filters. New beauty and health products are added regularly.',
    },
    productFilter: { categorySlug: 'health-beauty' },
  },

  // ── Baby & Kids ────────────────────────────────────────────────────────────
  {
    slug: 'baby-kids',
    label: 'Baby & Kids',
    title: 'Baby & Kids',
    subtitle: 'Everything for babies and children — clothing, nursery, feeding, toys and more',
    icon: Baby,
    iconColor: 'text-sky-500',
    accentBg: 'bg-sky-500/15',
    chips: [
      { label: 'All Baby & Kids' },
      { label: 'Baby Clothing', searchTerm: 'baby clothing babygrow sleepsuit vest' },
      { label: 'Nursery', searchTerm: 'nursery cot moses basket bedding changing' },
      { label: 'Feeding', searchTerm: 'feeding bottle breast pump highchair weaning' },
      { label: 'Pushchairs & Prams', searchTerm: 'pushchair pram buggy stroller car seat' },
      { label: "Children's Clothing", searchTerm: 'kids boys girls clothing school uniform' },
      { label: 'Baby Toys', searchTerm: 'baby toy rattle teether playmat activity' },
      { label: 'Safety & Health', searchTerm: 'baby safety monitor gate stair barrier' },
      { label: 'Baby Bathing', searchTerm: 'baby bath tub wash towel care' },
    ],
    emptyState: {
      title: 'No Baby & Kids products found',
      description:
        'Try adjusting your search or filters. New baby and children items are added regularly.',
    },
    productFilter: { categorySlug: 'baby-kids' },
  },

  // ── Food & Drink ───────────────────────────────────────────────────────────
  {
    slug: 'food-drink',
    label: 'Food & Drink',
    title: 'Food & Drink',
    subtitle: 'Grocery essentials, beverages, snacks, wholesale food and catering supplies',
    icon: UtensilsCrossed,
    iconColor: 'text-lime-600',
    accentBg: 'bg-lime-600/15',
    chips: [
      { label: 'All Food & Drink' },
      { label: 'Snacks & Confectionery', searchTerm: 'snack chocolate sweets confectionery' },
      { label: 'Beverages', searchTerm: 'drink beverage coffee tea juice energy' },
      { label: 'Grocery', searchTerm: 'grocery food tinned pasta rice cereal' },
      { label: 'Health Foods', searchTerm: 'health food protein bar organic vegan' },
      { label: 'Alcohol', searchTerm: 'alcohol wine beer spirits whisky' },
      { label: 'Wholesale Food', searchTerm: 'wholesale food catering bulk supply' },
      { label: 'Bakery', searchTerm: 'bakery bread cake biscuit pastry' },
      { label: 'Condiments & Sauces', searchTerm: 'sauce condiment spice seasoning' },
    ],
    emptyState: {
      title: 'No Food & Drink products found',
      description:
        'Try adjusting your search or filters. New food and drink listings are added regularly.',
    },
    productFilter: { categorySlug: 'food-drink' },
  },
];

export default CATEGORY_CONFIG;

/** Look up a single category config by its URL slug. */
export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG.find((c) => c.slug === slug);
}
