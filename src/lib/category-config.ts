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
  Mail,
  Leaf,
  Wrench,
  Sparkles,
  Gift,
  Tag,
  Gamepad2,
  Bike,
  Heart,
  UtensilsCrossed,
  HeartPulse,
  Home,
  Zap,
  PawPrint,
  PenLine,
  CalendarDays,
  Shirt,
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
  'large-letter-items': {
    subtitle: 'Letterbox-friendly products: books, cards, jewellery, phone accessories and beauty samples',
    icon: Mail,
    iconColor: 'text-sky-400',
    accentBg: 'bg-sky-400/10',
    chips: [
      { label: 'All Large Letter Items' },
      { label: 'Books & Media',       searchTerm: 'books media dvd cd magazine' },
      { label: 'Greeting Cards',      searchTerm: 'greeting card birthday anniversary christmas' },
      { label: 'Jewellery',           searchTerm: 'jewellery necklace bracelet ring earring' },
      { label: 'Phone Accessories',   searchTerm: 'phone accessory case screen protector cable' },
      { label: 'Beauty Samples',      searchTerm: 'beauty sample miniature sachet tester' },
      { label: 'Art Prints',          searchTerm: 'art print poster illustration photograph' },
    ],
    emptyState: {
      title: 'No Large Letter items found',
      description: 'Try adjusting your search or filters. New letterbox-friendly products are listed regularly.',
    },
    productFilter: { categorySlug: 'large-letter-items' },
  },

  garden: {
    subtitle: 'Garden tools, outdoor lighting, planting, pest control, BBQ and more',
    icon: Leaf,
    iconColor: 'text-green-500',
    accentBg: 'bg-green-500/10',
    chips: [
      { label: 'All Garden' },
      { label: 'Garden Tools',              searchTerm: 'garden tools spade fork trowel rake hoe' },
      { label: 'Planting & Growing',        searchTerm: 'planting growing seeds compost pots planters' },
      { label: 'Decorative & Novelty',      searchTerm: 'garden decorative ornament novelty statue gnome' },
      { label: 'Outdoor Lighting',          searchTerm: 'outdoor lighting solar garden light pathway' },
      { label: 'Pest Killers & Deterrents', searchTerm: 'pest killer deterrent slug trap weed spray' },
      { label: 'Bird Feeders',              searchTerm: 'bird feeder seed table bath house' },
      { label: 'BBQ & Picnic',              searchTerm: 'bbq barbecue grill picnic outdoor cooking' },
      { label: 'Hoses & Watering',          searchTerm: 'hose watering can sprinkler irrigation' },
      { label: 'Pegs & Clotheslines',       searchTerm: 'peg clothesline washing line clothes airer' },
      { label: 'Garden Wear',               searchTerm: 'garden wear gloves kneeler apron boots wellies' },
      { label: 'Shed & Garage',             searchTerm: 'shed garage storage hooks organiser cabinet' },
      { label: 'Twine & Garden Ties',       searchTerm: 'twine garden tie wire mesh netting string' },
    ],
    emptyState: {
      title: 'No Garden products found',
      description: 'Try adjusting your search or filters. New garden products are listed regularly.',
    },
    productFilter: { categorySlug: 'garden' },
  },

  diy: {
    subtitle: 'Power tools, hand tools, hardware, fixings, plumbing and decorating supplies',
    icon: Wrench,
    iconColor: 'text-amber-500',
    accentBg: 'bg-amber-500/10',
    chips: [
      { label: 'All DIY' },
      { label: 'Power Tools',           searchTerm: 'power drill saw grinder sander jigsaw' },
      { label: 'Hand Tools',            searchTerm: 'hand tool spanner wrench screwdriver hammer pliers' },
      { label: 'Hardware & Fixings',    searchTerm: 'hardware screw bolt nut anchor fixing bracket' },
      { label: 'Plumbing',              searchTerm: 'plumbing pipe fitting tap valve bathroom' },
      { label: 'Electrical',            searchTerm: 'electrical wire cable socket switch fuse' },
      { label: 'Decorating & Painting', searchTerm: 'decorating painting brush roller filler sanding' },
      { label: 'Adhesives & Sealants',  searchTerm: 'adhesive sealant glue silicone caulk filler' },
      { label: 'Safety & PPE',          searchTerm: 'safety ppe gloves goggles helmet mask dust' },
    ],
    emptyState: {
      title: 'No DIY products found',
      description: 'Try adjusting your search or filters. New DIY and hardware items are listed regularly.',
    },
    productFilter: { categorySlug: 'diy' },
  },

  cleaning: {
    subtitle: 'Surface cleaners, floor care, laundry, kitchen, bathroom and cleaning equipment',
    icon: Sparkles,
    iconColor: 'text-cyan-400',
    accentBg: 'bg-cyan-400/10',
    chips: [
      { label: 'All Cleaning' },
      { label: 'Surface Cleaners',   searchTerm: 'surface cleaner spray antibacterial multi-purpose' },
      { label: 'Floor Care',         searchTerm: 'floor care mop bucket vacuum hoover cleaning' },
      { label: 'Laundry Products',   searchTerm: 'laundry washing powder liquid detergent fabric conditioner' },
      { label: 'Kitchen Cleaning',   searchTerm: 'kitchen cleaning degreaser washing up liquid sponge' },
      { label: 'Bathroom Cleaning',  searchTerm: 'bathroom cleaning limescale toilet bleach descaler' },
      { label: 'Cleaning Equipment', searchTerm: 'cleaning equipment brush cloth mop wringer caddy' },
      { label: 'Disposable Gloves',  searchTerm: 'disposable gloves latex nitrile vinyl rubber' },
      { label: 'Air Fresheners',     searchTerm: 'air freshener spray plug-in diffuser reed deodoriser' },
    ],
    emptyState: {
      title: 'No Cleaning products found',
      description: 'Try adjusting your search or filters. New cleaning products are listed regularly.',
    },
    productFilter: { categorySlug: 'cleaning' },
  },

  'party-gift': {
    subtitle: 'Decorations, balloons, tableware, fancy dress, gift wrap and seasonal party supplies',
    icon: Gift,
    iconColor: 'text-pink-400',
    accentBg: 'bg-pink-400/10',
    chips: [
      { label: 'All Party & Gift' },
      { label: 'Party Decorations',    searchTerm: 'party decoration banner garland bunting confetti' },
      { label: 'Balloons',             searchTerm: 'balloon helium latex foil inflatable party' },
      { label: 'Gift Wrap & Bags',     searchTerm: 'gift wrap bag tissue paper ribbon bow tag' },
      { label: 'Tableware',            searchTerm: 'tableware plate cup napkin tablecloth cutlery' },
      { label: 'Banners & Bunting',    searchTerm: 'banner bunting flag pennant garland sign' },
      { label: 'Candles & Holders',    searchTerm: 'candle holder birthday celebration tealight pillar' },
      { label: 'Fancy Dress',          searchTerm: 'fancy dress costume hat wig accessory halloween' },
      { label: 'Seasonal Decorations', searchTerm: 'seasonal decoration christmas easter halloween summer' },
    ],
    emptyState: {
      title: 'No Party & Gift products found',
      description: 'Try adjusting your search or filters. New party supplies are listed regularly.',
    },
    productFilter: { categorySlug: 'party-gift' },
  },

  'wholesale-pound-lines': {
    subtitle: 'High-volume pound lines: household, stationery, snacks, toiletries, toys and seasonal',
    icon: Tag,
    iconColor: 'text-yellow-400',
    accentBg: 'bg-yellow-400/10',
    chips: [
      { label: 'All Pound Lines' },
      { label: 'Household',              searchTerm: 'household cleaning kitchen storage utility' },
      { label: 'Stationery',             searchTerm: 'stationery pen notebook pencil ruler folder' },
      { label: 'Confectionery & Snacks', searchTerm: 'confectionery sweets snacks crisps chocolate' },
      { label: 'Toiletries & Beauty',    searchTerm: 'toiletries beauty hygiene shampoo soap lotion' },
      { label: 'Toys & Games',           searchTerm: 'toys games puzzles activity colouring crafts' },
      { label: 'Seasonal Lines',         searchTerm: 'seasonal lines christmas easter summer halloween' },
    ],
    emptyState: {
      title: 'No Pound Lines found',
      description: 'Try adjusting your search or filters. New pound line products are listed regularly.',
    },
    productFilter: { categorySlug: 'wholesale-pound-lines' },
  },

  toys: {
    subtitle: 'Action figures, educational toys, outdoor play, arts & crafts and building toys',
    icon: Gamepad2,
    iconColor: 'text-violet-400',
    accentBg: 'bg-violet-400/10',
    chips: [
      { label: 'All Toys' },
      { label: 'Action Figures',      searchTerm: 'action figure superhero doll collectible character' },
      { label: 'Educational Toys',    searchTerm: 'educational toy learning stem science puzzle' },
      { label: 'Outdoor Play',        searchTerm: 'outdoor play trampoline scooter bike ride-on sports' },
      { label: 'Arts & Crafts',       searchTerm: 'arts crafts paint drawing colouring activity set' },
      { label: 'Puzzles & Games',     searchTerm: 'puzzle board game card game chess checkers' },
      { label: 'Dolls & Accessories', searchTerm: 'doll accessories fashion playsets miniature house' },
      { label: 'Building Toys',       searchTerm: 'building toy blocks lego construction bricks' },
      { label: 'Baby Toys',           searchTerm: 'baby toy rattle teether activity mat sensory' },
    ],
    emptyState: {
      title: 'No Toys found',
      description: 'Try adjusting your search or filters. New toys are listed regularly.',
    },
    productFilter: { categorySlug: 'toys' },
  },

  'leisure-hobbies': {
    subtitle: 'Sports, fitness, camping, cycling, arts, music, photography and travel accessories',
    icon: Bike,
    iconColor: 'text-teal-400',
    accentBg: 'bg-teal-400/10',
    chips: [
      { label: 'All Leisure & Hobbies' },
      { label: 'Sports & Fitness',    searchTerm: 'sports fitness gym dumbbell yoga mat resistance band' },
      { label: 'Camping & Hiking',    searchTerm: 'camping hiking tent sleeping bag rucksack outdoor' },
      { label: 'Cycling',             searchTerm: 'cycling bike accessory helmet lock pump light' },
      { label: 'Water Sports',        searchTerm: 'water sports swimming snorkel surfing kayak paddle' },
      { label: 'Arts & Crafts',       searchTerm: 'arts crafts paint canvas brush drawing sketchbook' },
      { label: 'Musical Instruments', searchTerm: 'musical instrument guitar ukulele keyboard drum' },
      { label: 'Photography',         searchTerm: 'photography camera accessory tripod bag strap lens' },
      { label: 'Travel Accessories',  searchTerm: 'travel accessory luggage bag passport holder adapter' },
    ],
    emptyState: {
      title: 'No Leisure & Hobbies products found',
      description: 'Try adjusting your search or filters. New leisure products are listed regularly.',
    },
    productFilter: { categorySlug: 'leisure-hobbies' },
  },

  'baby-supplies': {
    subtitle: 'Feeding, nursery, clothing, bath & changing, travel and baby development essentials',
    icon: Heart,
    iconColor: 'text-rose-400',
    accentBg: 'bg-rose-400/10',
    chips: [
      { label: 'All Baby Supplies' },
      { label: 'Feeding',                searchTerm: 'baby feeding bottle steriliser weaning spoon cup' },
      { label: 'Nursery',                searchTerm: 'nursery cot bedding monitor light mobile decor' },
      { label: 'Clothing & Accessories', searchTerm: 'baby clothing vest babygrow hat bib sock bootie' },
      { label: 'Bath & Changing',        searchTerm: 'bath changing mat nappy wipes lotion baby wash' },
      { label: 'Travel & Safety',        searchTerm: 'travel safety pram buggy car seat reins monitor' },
      { label: 'Toys & Development',     searchTerm: 'baby toy development sensory activity rattle teether' },
      { label: 'Health & Care',          searchTerm: 'baby health care thermometer medicine nail brush' },
    ],
    emptyState: {
      title: 'No Baby Supplies found',
      description: 'Try adjusting your search or filters. New baby products are listed regularly.',
    },
    productFilter: { categorySlug: 'baby-supplies' },
  },

  kitchenware: {
    subtitle: 'Cookware, bakeware, kitchen tools, tableware, appliances and drinkware',
    icon: UtensilsCrossed,
    iconColor: 'text-orange-400',
    accentBg: 'bg-orange-400/10',
    chips: [
      { label: 'All Kitchenware' },
      { label: 'Cookware',                  searchTerm: 'cookware pan pot wok casserole frying non-stick' },
      { label: 'Bakeware',                  searchTerm: 'bakeware tin tray loaf mould baking sheet' },
      { label: 'Kitchen Tools & Gadgets',   searchTerm: 'kitchen tool gadget peeler grater whisk spatula' },
      { label: 'Tableware',                 searchTerm: 'tableware plate bowl mug cup dinner set' },
      { label: 'Storage & Organisation',    searchTerm: 'kitchen storage container jar canister organiser' },
      { label: 'Kitchen Appliances',        searchTerm: 'kitchen appliance toaster kettle blender food processor' },
      { label: 'Cutlery',                   searchTerm: 'cutlery knife fork spoon set stainless steel' },
      { label: 'Drinkware',                 searchTerm: 'drinkware mug glass cup travel flask tumbler' },
    ],
    emptyState: {
      title: 'No Kitchenware found',
      description: 'Try adjusting your search or filters. New kitchenware is listed regularly.',
    },
    productFilter: { categorySlug: 'kitchenware' },
  },

  'health-beauty': {
    subtitle: 'Skincare, haircare, makeup, fragrance, personal care, supplements and dental care',
    icon: HeartPulse,
    iconColor: 'text-red-400',
    accentBg: 'bg-red-400/10',
    chips: [
      { label: 'All Health & Beauty' },
      { label: 'Skincare',           searchTerm: 'skincare moisturiser serum cleanser toner spf cream' },
      { label: 'Haircare',           searchTerm: 'haircare shampoo conditioner hair dryer styling mask' },
      { label: 'Makeup & Cosmetics', searchTerm: 'makeup foundation lipstick mascara eyeshadow blush' },
      { label: 'Fragrance',          searchTerm: 'fragrance perfume cologne eau de toilette body mist' },
      { label: 'Personal Care',      searchTerm: 'personal care deodorant shower gel body lotion razor' },
      { label: 'Health Supplements', searchTerm: 'supplement vitamin mineral protein omega health nutrition' },
      { label: 'Dental Care',        searchTerm: 'dental toothbrush toothpaste mouthwash floss whitening' },
      { label: 'Eye Care',           searchTerm: 'eye care drops contact lens solution glasses' },
    ],
    emptyState: {
      title: 'No Health & Beauty products found',
      description: 'Try adjusting your search or filters. New health and beauty products are listed regularly.',
    },
    productFilter: { categorySlug: 'health-beauty' },
  },

  homeware: {
    subtitle: 'Bedding, curtains, rugs, cushions, towels, home fragrance and decorative accessories',
    icon: Home,
    iconColor: 'text-emerald-400',
    accentBg: 'bg-emerald-400/10',
    chips: [
      { label: 'All Homeware' },
      { label: 'Bedding',            searchTerm: 'bedding duvet pillow sheet quilt fitted cover set' },
      { label: 'Curtains & Blinds',  searchTerm: 'curtain blind roman roller voile blackout eyelet' },
      { label: 'Rugs & Mats',        searchTerm: 'rug mat doormat runner bathroom bedroom living' },
      { label: 'Cushions & Throws',  searchTerm: 'cushion throw blanket fleece knit sofa scatter' },
      { label: 'Towels & Bath Linen',searchTerm: 'towel bath sheet hand face flannel bath mat' },
      { label: 'Home Fragrance',     searchTerm: 'home fragrance candle diffuser wax melt oil burner' },
      { label: 'Picture Frames',     searchTerm: 'picture frame photo wall hanging canvas mount' },
      { label: 'Clocks',             searchTerm: 'clock wall mantel alarm bedside digital analogue' },
    ],
    emptyState: {
      title: 'No Homeware found',
      description: 'Try adjusting your search or filters. New homeware is listed regularly.',
    },
    productFilter: { categorySlug: 'homeware' },
  },

  electrical: {
    subtitle: 'Small appliances, lighting, TV & audio, computing, smart home and cables',
    icon: Zap,
    iconColor: 'text-yellow-300',
    accentBg: 'bg-yellow-300/10',
    chips: [
      { label: 'All Electrical' },
      { label: 'Small Appliances',  searchTerm: 'small appliance kettle toaster microwave iron heater' },
      { label: 'Lighting',          searchTerm: 'lighting bulb led strip lamp light fixture spotlight' },
      { label: 'TV & Audio',        searchTerm: 'tv audio speaker soundbar headphones earbuds bluetooth' },
      { label: 'Computing',         searchTerm: 'computing laptop tablet keyboard mouse monitor printer' },
      { label: 'Smart Home',        searchTerm: 'smart home alexa google echo nest wifi plug camera' },
      { label: 'Phone Accessories', searchTerm: 'phone accessory charger cable case screen protector' },
      { label: 'Batteries & Power', searchTerm: 'battery power bank rechargeable aa aaa charger' },
      { label: 'Cables & Adapters', searchTerm: 'cable adapter hdmi usb extension lead splitter' },
    ],
    emptyState: {
      title: 'No Electrical products found',
      description: 'Try adjusting your search or filters. New electrical products are listed regularly.',
    },
    productFilter: { categorySlug: 'electrical' },
  },

  'pet-supplies': {
    subtitle: 'Dog, cat, bird and small pet supplies, food, treats, grooming and health care',
    icon: PawPrint,
    iconColor: 'text-amber-400',
    accentBg: 'bg-amber-400/10',
    chips: [
      { label: 'All Pet Supplies' },
      { label: 'Dog Supplies',      searchTerm: 'dog lead collar harness bed toy bowl accessory' },
      { label: 'Cat Supplies',      searchTerm: 'cat bed litter tray toy collar feeder accessory' },
      { label: 'Bird Supplies',     searchTerm: 'bird cage perch feeder toy accessory aviary' },
      { label: 'Fish & Aquatic',    searchTerm: 'fish tank aquarium filter pump gravel ornament' },
      { label: 'Small Pets',        searchTerm: 'small pet hamster rabbit guinea pig ferret cage' },
      { label: 'Pet Food & Treats', searchTerm: 'pet food treat biscuit chew snack dry wet' },
      { label: 'Pet Grooming',      searchTerm: 'pet grooming brush comb shampoo nail clipper' },
      { label: 'Pet Health',        searchTerm: 'pet health flea tick wormer supplement vitamin' },
    ],
    emptyState: {
      title: 'No Pet Supplies found',
      description: 'Try adjusting your search or filters. New pet products are listed regularly.',
    },
    productFilter: { categorySlug: 'pet-supplies' },
  },

  stationery: {
    subtitle: 'Pens, notebooks, art supplies, filing, office essentials and craft materials',
    icon: PenLine,
    iconColor: 'text-indigo-400',
    accentBg: 'bg-indigo-400/10',
    chips: [
      { label: 'All Stationery' },
      { label: 'Pens & Pencils',   searchTerm: 'pen pencil marker highlighter felt tip biro fountain' },
      { label: 'Notebooks & Pads', searchTerm: 'notebook pad journal planner diary spiral bound' },
      { label: 'Filing & Storage', searchTerm: 'filing storage folder binder box file organiser' },
      { label: 'Art Supplies',     searchTerm: 'art supply paint brush canvas watercolour acrylic sketch' },
      { label: 'Office Supplies',  searchTerm: 'office supply stapler tape scissors ruler calculator' },
      { label: 'Craft Supplies',   searchTerm: 'craft supply card glitter sticker foam felt ribbon' },
      { label: 'Cards & Envelopes',searchTerm: 'card envelope invitation birthday greetings notecard' },
      { label: 'Educational',      searchTerm: 'educational school resource flashcard poster learning' },
    ],
    emptyState: {
      title: 'No Stationery found',
      description: 'Try adjusting your search or filters. New stationery is listed regularly.',
    },
    productFilter: { categorySlug: 'stationery' },
  },

  seasonal: {
    subtitle: 'Christmas, Easter, Halloween, summer, back to school and all seasonal occasions',
    icon: CalendarDays,
    iconColor: 'text-purple-400',
    accentBg: 'bg-purple-400/10',
    chips: [
      { label: 'All Seasonal' },
      { label: 'Christmas',      searchTerm: 'christmas decoration tree bauble tinsel light advent' },
      { label: 'Easter',         searchTerm: 'easter egg hunt decoration basket bunny chick' },
      { label: 'Halloween',      searchTerm: 'halloween pumpkin skeleton witch ghost costume' },
      { label: 'Summer',         searchTerm: 'summer outdoor beach bbq paddling pool garden party' },
      { label: 'Back to School', searchTerm: 'back to school bag pencil case lunchbox stationery' },
      { label: "Valentine's Day",searchTerm: 'valentines heart gift rose decoration romantic' },
      { label: "Mother's Day",   searchTerm: 'mothers day gift flowers candle pamper set card' },
      { label: "Father's Day",   searchTerm: 'fathers day gift gadget bbq beer mug personalised' },
    ],
    emptyState: {
      title: 'No Seasonal products found',
      description: 'Try adjusting your search or filters. New seasonal products are listed regularly.',
    },
    productFilter: { categorySlug: 'seasonal' },
  },

  'wholesale-clothing': {
    subtitle: "Bulk men's, women's and children's clothing, footwear, accessories and sportswear",
    icon: Shirt,
    iconColor: 'text-fuchsia-400',
    accentBg: 'bg-fuchsia-400/10',
    chips: [
      { label: 'All Wholesale Clothing' },
      { label: "Men's",           searchTerm: "mens clothing shirt trousers jacket hoodie t-shirt" },
      { label: "Women's",         searchTerm: "womens clothing dress top blouse skirt leggings" },
      { label: "Children's",      searchTerm: "children kids clothing set dungarees school uniform" },
      { label: 'Footwear',        searchTerm: 'footwear shoes trainers boots sandals slippers' },
      { label: 'Accessories',     searchTerm: 'clothing accessory scarf hat belt gloves bag' },
      { label: 'Sportswear',      searchTerm: 'sportswear gym leggings tracksuit joggers activewear' },
      { label: 'Underwear & Socks',searchTerm: 'underwear socks briefs boxers vest thermal base layer' },
      { label: 'Bags & Luggage',  searchTerm: 'bag luggage suitcase backpack holdall tote handbag' },
    ],
    emptyState: {
      title: 'No Wholesale Clothing found',
      description: 'Try adjusting your search or filters. New clothing lines are listed regularly.',
    },
    productFilter: { categorySlug: 'wholesale-clothing' },
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
