/**
 * category-config.ts
 *
 * UI-specific configuration for the 17 wholesale marketplace categories:
 * • Lucide icon component
 * • Tailwind accent colours
 * • Subcategory filter chips (with sub-page slugs)
 * • Empty-state copy
 * • Supabase product filter strategy
 *
 * All data is self-contained here.  Categories are seeded into the DB via
 * supabase/420_seed_wholesale_categories.sql.  DB is the runtime source of
 * truth; this file provides rich UX config for known slugs.
 */

import {
  Mail,
  Leaf,
  Wrench,
  Sparkles,
  Gift,
  Tag,
  Gamepad2,
  Palette,
  Heart,
  ChefHat,
  Activity,
  Home,
  Zap,
  PawPrint,
  BookOpen,
  Calendar,
  Shirt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CategoryChip {
  label: string;
  /** URL-safe slug used for /category/:parentSlug?sub=:subSlug navigation */
  subSlug?: string;
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

// ── Per-slug full configs ─────────────────────────────────────────────────────

const CATEGORY_CONFIG: readonly CategoryConfig[] = [
  {
    slug: 'large-letter-items',
    label: 'Large Letter Items',
    title: 'Large Letter Items',
    image: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Stationery & Cards', 'Jewellery & Accessories', 'Phone Accessories', 'Hair Accessories', 'Small Gifts & Novelties', 'Keyrings & Badges', 'Beauty Accessories', 'Craft Supplies'],
    subtitle: 'Small, lightweight items ideal for postal and large-letter format — keyrings, accessories, stationery & more',
    icon: Mail,
    iconColor: 'text-blue-400',
    accentBg: 'bg-blue-400/10',
    chips: [
      { label: 'All Large Letter Items' },
      { label: 'Stationery & Cards',      subSlug: 'stationery-cards',     searchTerm: 'stationery card greeting notepad pen' },
      { label: 'Jewellery & Accessories', subSlug: 'jewellery-accessories', searchTerm: 'jewellery necklace bracelet ring earring accessory' },
      { label: 'Phone Accessories',        subSlug: 'phone-accessories',     searchTerm: 'phone case screen protector cable charger holder' },
      { label: 'Hair Accessories',         subSlug: 'hair-accessories',      searchTerm: 'hair clip band scrunchie comb bobby pin' },
      { label: 'Small Gifts & Novelties',  subSlug: 'small-gifts',           searchTerm: 'small gift novelty magnet badge charm' },
      { label: 'Keyrings & Badges',        subSlug: 'keyrings-badges',       searchTerm: 'keyring keychain badge fridge magnet' },
      { label: 'Beauty Accessories',       subSlug: 'beauty-accessories',    searchTerm: 'makeup brush sponge mirror compact applicator' },
      { label: 'Craft Supplies',           subSlug: 'craft-supplies',        searchTerm: 'craft supply glitter foam sticker ribbon twine felt' },
    ],
    emptyState: {
      title: 'No Large Letter Items found',
      description: 'Try adjusting your search or filters. New products are listed every day.',
    },
    productFilter: { categorySlug: 'large-letter-items' },
  },

  {
    slug: 'garden',
    label: 'Garden',
    title: 'Garden',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Garden Tools', 'Plant Pots & Planters', 'Garden Furniture', 'Outdoor Lighting', 'BBQ & Outdoor Cooking', 'Watering Equipment', 'Garden Décor', 'Seeds & Bulbs'],
    subtitle: 'Garden tools, outdoor furniture, planters, BBQ equipment and garden décor for retail and trade',
    icon: Leaf,
    iconColor: 'text-green-500',
    accentBg: 'bg-green-500/10',
    chips: [
      { label: 'All Garden' },
      { label: 'Garden Tools',          subSlug: 'garden-tools',         searchTerm: 'garden spade fork hoe trowel rake pruner' },
      { label: 'Plant Pots & Planters', subSlug: 'plant-pots-planters',  searchTerm: 'plant pot planter hanging basket window box' },
      { label: 'Garden Furniture',      subSlug: 'garden-furniture',     searchTerm: 'garden chair table bench set swing hammock' },
      { label: 'Outdoor Lighting',      subSlug: 'outdoor-lighting',     searchTerm: 'solar light stake lantern string fairy outdoor' },
      { label: 'BBQ & Outdoor Cooking', subSlug: 'bbq-outdoor-cooking',  searchTerm: 'bbq grill charcoal smoker outdoor cooking set' },
      { label: 'Watering Equipment',    subSlug: 'watering-equipment',   searchTerm: 'watering can hose reel spray nozzle dripper' },
      { label: 'Garden Décor',          subSlug: 'garden-decor',         searchTerm: 'garden ornament windmill gnome bird feeder stone' },
      { label: 'Seeds & Bulbs',         subSlug: 'seeds-bulbs',          searchTerm: 'seed bulb plug plant grow propagate sow' },
    ],
    emptyState: {
      title: 'No Garden products found',
      description: 'Try adjusting your search or filters. New garden items are listed regularly.',
    },
    productFilter: { categorySlug: 'garden' },
  },

  {
    slug: 'diy',
    label: 'DIY',
    title: 'DIY',
    image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Power Tools', 'Hand Tools', 'Fixings & Fastenings', 'Safety Equipment', 'Paint & Decorating', 'Plumbing', 'Electrical Supplies', 'Storage Solutions'],
    subtitle: 'Power tools, hand tools, fixings, paint, plumbing and home improvement supplies',
    icon: Wrench,
    iconColor: 'text-amber-600',
    accentBg: 'bg-amber-600/10',
    chips: [
      { label: 'All DIY' },
      { label: 'Power Tools',         subSlug: 'power-tools',         searchTerm: 'power drill saw grinder sander jigsaw router' },
      { label: 'Hand Tools',          subSlug: 'hand-tools',          searchTerm: 'hand tool spanner wrench screwdriver hammer pliers' },
      { label: 'Fixings & Fastenings',subSlug: 'fixings-fastenings',  searchTerm: 'screw bolt nut anchor rawl plug wall fixing' },
      { label: 'Safety Equipment',    subSlug: 'safety-equipment',    searchTerm: 'safety gloves goggles helmet mask ppe hi-vis' },
      { label: 'Paint & Decorating',  subSlug: 'paint-decorating',    searchTerm: 'paint roller brush masking tape primer filler' },
      { label: 'Plumbing',            subSlug: 'plumbing',            searchTerm: 'plumbing pipe tap fitting valve sealant ptfe' },
      { label: 'Electrical Supplies', subSlug: 'electrical-supplies', searchTerm: 'wire cable socket switch fuse conduit connector' },
      { label: 'Storage Solutions',   subSlug: 'storage-solutions',   searchTerm: 'storage shelving unit box rail organiser rack cabinet' },
    ],
    emptyState: {
      title: 'No DIY products found',
      description: 'Try adjusting your search. New tools and hardware are listed regularly.',
    },
    productFilter: { categorySlug: 'diy' },
  },

  {
    slug: 'cleaning',
    label: 'Cleaning',
    title: 'Cleaning',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Cleaning Wipes & Sprays', 'Sponges, Scourers & Cloths', 'Brooms, Mops & Brushes', 'Laundry Supplies', 'Dehumidifiers', 'Cleaning Gloves', 'Sinks & Drains', 'Bins', 'Bowls & Storage'],
    subtitle: 'Cleaning products, mops, cloths, bin liners, air fresheners, disinfectants and laundry',
    icon: Sparkles,
    iconColor: 'text-cyan-400',
    accentBg: 'bg-cyan-400/10',
    chips: [
      { label: 'Cleaning Wipes & Sprays',    subSlug: 'cleaning-wipes-sprays',   searchTerm: 'cleaning wipes antibacterial spray surface kitchen bathroom' },
      { label: 'Sponges, Scourers & Cloths', subSlug: 'sponges-scourers-cloths', searchTerm: 'sponge scourer cloth microfibre wipe pad scour' },
      { label: 'Brooms, Mops & Brushes',     subSlug: 'brooms-mops-brushes',     searchTerm: 'broom mop brush dustpan floor sweeper squeegee' },
      { label: 'Laundry Supplies',           subSlug: 'laundry-supplies',        searchTerm: 'laundry detergent powder capsule fabric conditioner softener' },
      { label: 'Dehumidifiers',              subSlug: 'dehumidifiers',           searchTerm: 'dehumidifier moisture absorber damp trap condensation' },
      { label: 'Cleaning Gloves',            subSlug: 'cleaning-gloves',         searchTerm: 'cleaning gloves rubber latex household protective' },
      { label: 'Sinks & Drains',             subSlug: 'sinks-drains',            searchTerm: 'drain cleaner sink unblocker plug strainer waste' },
      { label: 'Bins',                       subSlug: 'bins',                    searchTerm: 'bin pedal swing kitchen recycling waste bin liner' },
      { label: 'Bowls & Storage',            subSlug: 'bowls-storage',           searchTerm: 'bowl storage basket bucket container washing up' },
    ],
    emptyState: {
      title: 'No Cleaning products found',
      description: 'Try adjusting your search. New cleaning products are listed regularly.',
    },
    productFilter: { categorySlug: 'cleaning' },
  },

  {
    slug: 'party-gift',
    label: 'Party & Gift',
    title: 'Party & Gift',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Party Supplies', 'Balloons & Decorations', 'Gifting & Wrapping', 'Candles & Holders', 'Novelty Gifts', 'Seasonal Gifts', 'Tableware', 'Cards & Stationery'],
    subtitle: 'Party supplies, balloons, decorations, gifting, tableware and seasonal gifts',
    icon: Gift,
    iconColor: 'text-pink-500',
    accentBg: 'bg-pink-500/10',
    chips: [
      { label: 'All Party & Gift' },
      { label: 'Party Supplies',         subSlug: 'party-supplies',         searchTerm: 'party banner bunting hat whistle popper streamer' },
      { label: 'Balloons & Decorations', subSlug: 'balloons-decorations',   searchTerm: 'balloon foil latex helium decoration garland' },
      { label: 'Gifting & Wrapping',     subSlug: 'gifting-wrapping',       searchTerm: 'gift wrap tissue paper ribbon bow bag box' },
      { label: 'Candles & Holders',      subSlug: 'candles-holders',        searchTerm: 'candle tealight birthday holder lantern wax' },
      { label: 'Novelty Gifts',          subSlug: 'novelty-gifts',          searchTerm: 'novelty gift fun gadget funny personalised' },
      { label: 'Seasonal Gifts',         subSlug: 'seasonal-gifts',         searchTerm: 'seasonal gift christmas easter birthday hamper occasion' },
      { label: 'Tableware',              subSlug: 'tableware',              searchTerm: 'plate cup napkin tablecloth disposable party' },
      { label: 'Cards & Stationery',     subSlug: 'cards-stationery',       searchTerm: 'greeting card birthday christmas thank you note' },
    ],
    emptyState: {
      title: 'No Party & Gift items found',
      description: 'Try adjusting your search. New party and gift items are added regularly.',
    },
    productFilter: { categorySlug: 'party-gift' },
  },

  {
    slug: 'wholesale-pound-lines',
    label: 'Wholesale Pound Lines',
    title: 'Wholesale Pound Lines',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Toy Pound Lines', 'Stationery Pound Lines', 'DIY Pound Lines', 'Homeware Pound Lines', 'Garden Pound Lines', 'Pet Pound Lines', 'Baby Pound Lines', 'Clothing Pound Lines', 'Health & Beauty Pound Lines', 'Kitchenware Pound Lines', 'Party & Gift Pound Lines', 'Electrical Pound Lines', 'Seasonal Pound Lines', 'Leisure & Hobbies Pound Lines', 'Cleaning Pound Lines'],
    subtitle: 'High-volume wholesale pound-line products for retailers across all key categories',
    icon: Tag,
    iconColor: 'text-yellow-500',
    accentBg: 'bg-yellow-500/10',
    chips: [
      { label: 'Toy Pound Lines',               subSlug: 'toy-pound-lines',               searchTerm: 'toy pound line budget wholesale' },
      { label: 'Stationery Pound Lines',         subSlug: 'stationery-pound-lines',        searchTerm: 'stationery pen notepad pound line' },
      { label: 'DIY Pound Lines',               subSlug: 'diy-pound-lines',               searchTerm: 'diy tool fixings pound line wholesale' },
      { label: 'Homeware Pound Lines',          subSlug: 'homeware-pound-lines',          searchTerm: 'homeware household pound line budget' },
      { label: 'Garden Pound Lines',            subSlug: 'garden-pound-lines',            searchTerm: 'garden outdoor pound line wholesale' },
      { label: 'Pet Pound Lines',               subSlug: 'pet-pound-lines',               searchTerm: 'pet supplies pound line wholesale' },
      { label: 'Baby Pound Lines',              subSlug: 'baby-pound-lines',              searchTerm: 'baby supplies pound line wholesale' },
      { label: 'Clothing Pound Lines',          subSlug: 'clothing-pound-lines',          searchTerm: 'clothing wholesale pound line fashion' },
      { label: 'Health & Beauty Pound Lines',   subSlug: 'health-beauty-pound-lines',     searchTerm: 'health beauty pound line shampoo cream' },
      { label: 'Kitchenware Pound Lines',       subSlug: 'kitchenware-pound-lines',       searchTerm: 'kitchenware cookware pound line wholesale' },
      { label: 'Party & Gift Pound Lines',      subSlug: 'party-gift-pound-lines',        searchTerm: 'party gift pound line wholesale' },
      { label: 'Electrical Pound Lines',        subSlug: 'electrical-pound-lines',        searchTerm: 'electrical pound line wholesale budget' },
      { label: 'Seasonal Pound Lines',          subSlug: 'seasonal-pound-lines',          searchTerm: 'seasonal christmas easter halloween pound' },
      { label: 'Leisure & Hobbies Pound Lines', subSlug: 'leisure-hobbies-pound-lines',   searchTerm: 'leisure hobby pound line wholesale' },
      { label: 'Cleaning Pound Lines',          subSlug: 'cleaning-pound-lines',          searchTerm: 'cleaning pound line wholesale budget' },
    ],
    emptyState: {
      title: 'No Wholesale Pound Lines found',
      description: 'Try adjusting your search. New pound-line products are added regularly.',
    },
    productFilter: { categorySlug: 'wholesale-pound-lines' },
  },

  {
    slug: 'toys',
    label: 'Toys',
    title: 'Toys',
    image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Action Figures', 'Educational Toys', 'Outdoor Toys', 'Board Games', 'Dolls & Accessories', 'Baby Toys', 'Arts & Crafts', 'Remote Control Toys'],
    subtitle: 'Action figures, educational toys, outdoor toys, board games, arts & crafts and remote control',
    icon: Gamepad2,
    iconColor: 'text-violet-500',
    accentBg: 'bg-violet-500/10',
    chips: [
      { label: 'All Toys' },
      { label: 'Action Figures',      subSlug: 'action-figures',      searchTerm: 'action figure superhero doll collectible character' },
      { label: 'Educational Toys',    subSlug: 'educational-toys',    searchTerm: 'educational toy learning puzzle stem science' },
      { label: 'Outdoor Toys',        subSlug: 'outdoor-toys',        searchTerm: 'outdoor toy trampoline scooter bike ride on ball' },
      { label: 'Board Games',         subSlug: 'board-games',         searchTerm: 'board game card game chess checkers puzzle family' },
      { label: 'Dolls & Accessories', subSlug: 'dolls-accessories',   searchTerm: 'doll barbie fashion toy accessories clothes' },
      { label: 'Baby Toys',           subSlug: 'baby-toys',           searchTerm: 'baby toy rattle teether activity mat sensory soft' },
      { label: 'Arts & Crafts',       subSlug: 'arts-crafts',         searchTerm: 'arts crafts paint glitter clay stickers felt set' },
      { label: 'Remote Control Toys', subSlug: 'remote-control-toys', searchTerm: 'remote control rc car truck drone boat helicopter' },
    ],
    emptyState: {
      title: 'No Toys found',
      description: 'Try adjusting your search. New toys are added regularly.',
    },
    productFilter: { categorySlug: 'toys' },
  },

  {
    slug: 'leisure-hobbies',
    label: 'Leisure & Hobbies',
    title: 'Leisure & Hobbies',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Arts & Crafts', 'Puzzles & Games', 'Sports & Fitness', 'Camping & Outdoor', 'Photography', 'Collecting', 'Musical Instruments', 'Reading & Books'],
    subtitle: 'Arts & crafts, sports, camping, puzzles, photography, collecting and musical instruments',
    icon: Palette,
    iconColor: 'text-orange-400',
    accentBg: 'bg-orange-400/10',
    chips: [
      { label: 'All Leisure & Hobbies' },
      { label: 'Arts & Crafts',       subSlug: 'arts-crafts',        searchTerm: 'art craft paint canvas brush watercolour acrylic' },
      { label: 'Puzzles & Games',     subSlug: 'puzzles-games',      searchTerm: 'puzzle jigsaw game strategy brain teaser' },
      { label: 'Sports & Fitness',    subSlug: 'sports-fitness',     searchTerm: 'sport fitness yoga mat weight resistance exercise' },
      { label: 'Camping & Outdoor',   subSlug: 'camping-outdoor',    searchTerm: 'camping tent sleeping bag torch hiking outdoor' },
      { label: 'Photography',         subSlug: 'photography',        searchTerm: 'camera tripod lens photography accessory case' },
      { label: 'Collecting',          subSlug: 'collecting',         searchTerm: 'collecting album sleeve display case coins stamps' },
      { label: 'Musical Instruments', subSlug: 'musical-instruments',searchTerm: 'guitar ukulele drum keyboard harmonica instrument' },
      { label: 'Reading & Books',     subSlug: 'reading-books',      searchTerm: 'book reading novel fiction non-fiction guide magazine' },
    ],
    emptyState: {
      title: 'No Leisure & Hobbies products found',
      description: 'Try adjusting your search. New leisure and hobby products are added regularly.',
    },
    productFilter: { categorySlug: 'leisure-hobbies' },
  },

  {
    slug: 'baby-supplies',
    label: 'Baby Supplies',
    title: 'Baby Supplies',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Baby Clothing', 'Feeding & Nursing', 'Nappies & Changing', 'Baby Toys', 'Baby Monitors', 'Travel & Pushchairs', 'Nursery', 'Safety & Babyproofing'],
    subtitle: 'Baby clothing, feeding, nappies, nursery essentials, baby monitors and pushchairs',
    icon: Heart,
    iconColor: 'text-rose-400',
    accentBg: 'bg-rose-400/10',
    chips: [
      { label: 'All Baby Supplies' },
      { label: 'Baby Clothing',         subSlug: 'baby-clothing',       searchTerm: 'baby bodysuit romper sleepsuit vest grow outfit' },
      { label: 'Feeding & Nursing',     subSlug: 'feeding-nursing',     searchTerm: 'bottle teat breast pump bib weaning spoon bowl' },
      { label: 'Nappies & Changing',    subSlug: 'nappies-changing',    searchTerm: 'nappy nappies wipes changing mat cream powder' },
      { label: 'Baby Toys',             subSlug: 'baby-toys',           searchTerm: 'baby toy rattle teether activity gym mobile' },
      { label: 'Baby Monitors',         subSlug: 'baby-monitors',       searchTerm: 'baby monitor camera sensor audio video' },
      { label: 'Travel & Pushchairs',   subSlug: 'travel-pushchairs',   searchTerm: 'pushchair pram buggy car seat travel cot' },
      { label: 'Nursery',               subSlug: 'nursery',             searchTerm: 'cot bed moses basket night light projector mobile' },
      { label: 'Safety & Babyproofing', subSlug: 'safety-babyproofing', searchTerm: 'safety gate lock socket cover corner pad babyproof' },
    ],
    emptyState: {
      title: 'No Baby Supplies found',
      description: 'Try adjusting your search. New baby products are added regularly.',
    },
    productFilter: { categorySlug: 'baby-supplies' },
  },

  {
    slug: 'kitchenware',
    label: 'Kitchenware',
    title: 'Kitchenware',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Cookware', 'Bakeware', 'Kitchen Tools', 'Storage Containers', 'Cutlery & Flatware', 'Drinkware', 'Small Appliances', 'Kitchen Gadgets'],
    subtitle: 'Cookware, bakeware, kitchen tools, storage containers, cutlery and small appliances',
    icon: ChefHat,
    iconColor: 'text-emerald-500',
    accentBg: 'bg-emerald-500/10',
    chips: [
      { label: 'All Kitchenware' },
      { label: 'Cookware',            subSlug: 'cookware',           searchTerm: 'cookware pan pot frying saucepan wok non-stick' },
      { label: 'Bakeware',            subSlug: 'bakeware',           searchTerm: 'bakeware tin tray mould loaf silicone cake baking' },
      { label: 'Kitchen Tools',       subSlug: 'kitchen-tools',      searchTerm: 'kitchen tool spatula ladle peeler grater whisk' },
      { label: 'Storage Containers',  subSlug: 'storage-containers', searchTerm: 'storage container lunch box jar canister tupperware' },
      { label: 'Cutlery & Flatware',  subSlug: 'cutlery-flatware',   searchTerm: 'cutlery flatware knife fork spoon set stainless' },
      { label: 'Drinkware',           subSlug: 'drinkware',          searchTerm: 'mug cup glass bottle travel flask tumbler' },
      { label: 'Small Appliances',    subSlug: 'small-appliances',   searchTerm: 'kettle toaster blender juicer air fryer slow cooker' },
      { label: 'Kitchen Gadgets',     subSlug: 'kitchen-gadgets',    searchTerm: 'kitchen gadget garlic press tin opener mandoline grater slicer' },
    ],
    emptyState: {
      title: 'No Kitchenware found',
      description: 'Try adjusting your search. New kitchen products are listed regularly.',
    },
    productFilter: { categorySlug: 'kitchenware' },
  },

  {
    slug: 'health-beauty',
    label: 'Health & Beauty',
    title: 'Health & Beauty',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Skincare', 'Haircare', 'Makeup & Cosmetics', 'Personal Care', 'Vitamins & Supplements', 'Fragrances', 'Medical Supplies', 'Oral Care'],
    subtitle: 'Skincare, haircare, makeup, personal care, vitamins, fragrances and oral care',
    icon: Activity,
    iconColor: 'text-rose-500',
    accentBg: 'bg-rose-500/10',
    chips: [
      { label: 'All Health & Beauty' },
      { label: 'Skincare',               subSlug: 'skincare',          searchTerm: 'skincare moisturiser serum cleanser toner face' },
      { label: 'Haircare',               subSlug: 'haircare',          searchTerm: 'shampoo conditioner hair mask oil serum treatment' },
      { label: 'Makeup & Cosmetics',     subSlug: 'makeup-cosmetics',  searchTerm: 'makeup foundation lipstick mascara eyeshadow blush' },
      { label: 'Personal Care',          subSlug: 'personal-care',     searchTerm: 'razor shaver trimmer deodorant body wash shower' },
      { label: 'Vitamins & Supplements', subSlug: 'vitamins-supplements', searchTerm: 'vitamin supplement capsule tablet mineral protein' },
      { label: 'Fragrances',             subSlug: 'fragrances',        searchTerm: 'perfume aftershave cologne fragrance eau de toilette' },
      { label: 'Medical Supplies',       subSlug: 'medical-supplies',  searchTerm: 'bandage plaster first aid thermometer test strip medical' },
      { label: 'Oral Care',              subSlug: 'oral-care',         searchTerm: 'toothbrush toothpaste mouthwash floss dental care' },
    ],
    emptyState: {
      title: 'No Health & Beauty products found',
      description: 'Try adjusting your search. New health and beauty products are added regularly.',
    },
    productFilter: { categorySlug: 'health-beauty' },
  },

  {
    slug: 'homeware',
    label: 'Homeware',
    title: 'Homeware',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Bedding & Pillows', 'Curtains & Blinds', 'Rugs & Flooring', 'Cushions & Throws', 'Bathroom Accessories', 'Picture Frames & Clocks', 'Candles & Home Fragrance', 'Home Décor'],
    subtitle: 'Bedding, curtains, rugs, bathroom accessories, candles and home décor',
    icon: Home,
    iconColor: 'text-indigo-400',
    accentBg: 'bg-indigo-400/10',
    chips: [
      { label: 'All Homeware' },
      { label: 'Bedding & Pillows',         subSlug: 'bedding-pillows',        searchTerm: 'duvet pillow bed set sheet quilt cover blanket' },
      { label: 'Curtains & Blinds',         subSlug: 'curtains-blinds',        searchTerm: 'curtain blind voile roller roman eyelet ring top' },
      { label: 'Rugs & Flooring',           subSlug: 'rugs-flooring',          searchTerm: 'rug mat runner carpet non-slip bath' },
      { label: 'Cushions & Throws',         subSlug: 'cushions-throws',        searchTerm: 'cushion throw pillow sofa decorative knitted' },
      { label: 'Bathroom Accessories',      subSlug: 'bathroom-accessories',   searchTerm: 'bathroom accessory towel rail hook mirror cabinet' },
      { label: 'Picture Frames & Clocks',   subSlug: 'picture-frames-clocks',  searchTerm: 'picture frame clock wall art canvas photo' },
      { label: 'Candles & Home Fragrance',  subSlug: 'candles-home-fragrance', searchTerm: 'candle diffuser reed wax melt tealight holder' },
      { label: 'Home Décor',               subSlug: 'home-decor',             searchTerm: 'home decor ornament vase frame mirror wall art decoration' },
    ],
    emptyState: {
      title: 'No Homeware found',
      description: 'Try adjusting your search. New homeware is added regularly.',
    },
    productFilter: { categorySlug: 'homeware' },
  },

  {
    slug: 'electrical',
    label: 'Electrical',
    title: 'Electrical',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['LED Lighting', 'Phone Accessories', 'Cables & Adapters', 'Smart Home', 'Batteries', 'Audio', 'Small Appliances', 'Computer Accessories'],
    subtitle: 'LED lighting, phone accessories, cables, smart home, audio and computer accessories',
    icon: Zap,
    iconColor: 'text-yellow-400',
    accentBg: 'bg-yellow-400/10',
    chips: [
      { label: 'All Electrical' },
      { label: 'LED Lighting',         subSlug: 'led-lighting',         searchTerm: 'led bulb strip light fitting downlight desk lamp' },
      { label: 'Phone Accessories',    subSlug: 'phone-accessories',    searchTerm: 'phone case charger cable screen protector holder stand' },
      { label: 'Cables & Adapters',    subSlug: 'cables-adapters',      searchTerm: 'cable usb hdmi adapter lead extension connector' },
      { label: 'Smart Home',           subSlug: 'smart-home',           searchTerm: 'smart plug socket switch alexa google wifi controller' },
      { label: 'Batteries',            subSlug: 'batteries',            searchTerm: 'battery aa aaa rechargeable alkaline lithium pack' },
      { label: 'Audio',                subSlug: 'audio',                searchTerm: 'headphone earphone speaker bluetooth wireless audio' },
      { label: 'Computer Accessories', subSlug: 'computer-accessories', searchTerm: 'mouse keyboard webcam usb hub monitor stand laptop' },
      { label: 'Small Appliances',     subSlug: 'small-appliances',     searchTerm: 'fan heater vacuum cleaner iron hair dryer small appliance' },
    ],
    emptyState: {
      title: 'No Electrical products found',
      description: 'Try adjusting your search. New electrical items are listed regularly.',
    },
    productFilter: { categorySlug: 'electrical' },
  },

  {
    slug: 'pet-supplies',
    label: 'Pet Supplies',
    title: 'Pet Supplies',
    image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Dog Supplies', 'Cat Supplies', 'Small Animal Supplies', 'Bird Supplies', 'Fish & Aquatics', 'Pet Food', 'Pet Toys', 'Grooming'],
    subtitle: 'Dog, cat, small animal, bird and fish supplies, food, toys and grooming products',
    icon: PawPrint,
    iconColor: 'text-amber-500',
    accentBg: 'bg-amber-500/10',
    chips: [
      { label: 'All Pet Supplies' },
      { label: 'Dog Supplies',          subSlug: 'dog-supplies',          searchTerm: 'dog lead collar harness bed bowl toy treat' },
      { label: 'Cat Supplies',          subSlug: 'cat-supplies',          searchTerm: 'cat collar litter tray scratching post bed toy' },
      { label: 'Small Animal Supplies', subSlug: 'small-animal-supplies', searchTerm: 'rabbit guinea pig hamster cage bedding food toy' },
      { label: 'Bird Supplies',         subSlug: 'bird-supplies',         searchTerm: 'bird cage perch seed feeder bath bell toy' },
      { label: 'Fish & Aquatics',       subSlug: 'fish-aquatics',         searchTerm: 'fish tank aquarium filter pump gravel ornament' },
      { label: 'Pet Food',              subSlug: 'pet-food',              searchTerm: 'pet food dry wet kibble treat chew biscuit' },
      { label: 'Pet Toys',             subSlug: 'pet-toys',              searchTerm: 'pet toy ball rope tug fetch squeak chew puzzle treat' },
      { label: 'Grooming',              subSlug: 'grooming',              searchTerm: 'pet grooming brush comb shampoo nail clipper dryer' },
    ],
    emptyState: {
      title: 'No Pet Supplies found',
      description: 'Try adjusting your search. New pet products are listed regularly.',
    },
    productFilter: { categorySlug: 'pet-supplies' },
  },

  {
    slug: 'stationery',
    label: 'Stationery',
    title: 'Stationery',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Pens & Pencils', 'Notebooks & Journals', 'Office Supplies', 'Art Supplies', 'Greeting Cards', 'Gift Wrap', 'Labels & Tags', 'Filing & Storage'],
    subtitle: 'Pens, notebooks, office supplies, art materials, greeting cards and gift wrap',
    icon: BookOpen,
    iconColor: 'text-teal-400',
    accentBg: 'bg-teal-400/10',
    chips: [
      { label: 'All Stationery' },
      { label: 'Pens & Pencils',       subSlug: 'pens-pencils',      searchTerm: 'pen pencil biro marker highlighter rollerball' },
      { label: 'Notebooks & Journals', subSlug: 'notebooks-journals', searchTerm: 'notebook journal diary planner sketchbook ruled' },
      { label: 'Office Supplies',      subSlug: 'office-supplies',    searchTerm: 'stapler hole punch scissors tape folder binder' },
      { label: 'Art Supplies',         subSlug: 'art-supplies',       searchTerm: 'art paint brush canvas watercolour pastel sketch' },
      { label: 'Greeting Cards',       subSlug: 'greeting-cards',     searchTerm: 'greeting card birthday christmas thank you occasion' },
      { label: 'Gift Wrap',            subSlug: 'gift-wrap',          searchTerm: 'wrapping paper ribbon bow tag tissue kraft' },
      { label: 'Labels & Tags',        subSlug: 'labels-tags',        searchTerm: 'label tag sticker address self-adhesive print sheet roll' },
      { label: 'Filing & Storage',     subSlug: 'filing-storage',     searchTerm: 'file folder binder box archive lever arch' },
    ],
    emptyState: {
      title: 'No Stationery found',
      description: 'Try adjusting your search. New stationery products are added regularly.',
    },
    productFilter: { categorySlug: 'stationery' },
  },

  {
    slug: 'seasonal',
    label: 'Seasonal',
    title: 'Seasonal',
    image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Christmas', 'Easter', 'Halloween', 'Valentine\'s Day', 'Summer', 'Back to School', 'Spring', 'Diwali & Eid'],
    subtitle: 'Christmas, Easter, Halloween, Valentine\'s, summer ranges and all seasonal stock',
    icon: Calendar,
    iconColor: 'text-red-400',
    accentBg: 'bg-red-400/10',
    chips: [
      { label: 'All Seasonal' },
      { label: 'Christmas',      subSlug: 'christmas',      searchTerm: 'christmas tree decoration bauble tinsel lights advent' },
      { label: 'Easter',         subSlug: 'easter',         searchTerm: 'easter egg hunt bunny decoration basket spring' },
      { label: 'Halloween',      subSlug: 'halloween',      searchTerm: 'halloween costume pumpkin decoration skull bat spider' },
      { label: "Valentine's Day",subSlug: 'valentines-day', searchTerm: "valentines heart rose gift chocolate love card" },
      { label: 'Summer',         subSlug: 'summer',         searchTerm: 'summer beach pool inflatable sun outdoor fun' },
      { label: 'Back to School', subSlug: 'back-to-school', searchTerm: 'back school bag pencil case lunch box stationery' },
      { label: 'Spring',         subSlug: 'spring',         searchTerm: 'spring flower planter bulb garden decoration fresh' },
      { label: 'Diwali & Eid',   subSlug: 'diwali-eid',    searchTerm: 'diwali eid decoration gift candle light celebration' },
    ],
    emptyState: {
      title: 'No Seasonal products found',
      description: 'Try adjusting your search. New seasonal stock is added regularly.',
    },
    productFilter: { categorySlug: 'seasonal' },
  },

  {
    slug: 'wholesale-clothing',
    label: 'Wholesale Clothing',
    title: 'Wholesale Clothing',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=75&fm=webp',
    subcategories: ['Women\'s Clothing', 'Men\'s Clothing', 'Children\'s Clothing', 'Baby Clothing', 'Sportswear', 'Underwear & Socks', 'Accessories', 'Swimwear'],
    subtitle: 'Women\'s, men\'s and children\'s clothing, sportswear, underwear and accessories wholesale',
    icon: Shirt,
    iconColor: 'text-purple-400',
    accentBg: 'bg-purple-400/10',
    chips: [
      { label: 'All Wholesale Clothing' },
      { label: "Women's Clothing",   subSlug: 'womens-clothing',   searchTerm: "women clothing dress top blouse skirt jumper ladies" },
      { label: "Men's Clothing",     subSlug: 'mens-clothing',     searchTerm: "men clothing shirt trousers jacket hoodie polo gents" },
      { label: "Children's Clothing",subSlug: 'childrens-clothing',searchTerm: "children kids clothing school t-shirt leggings jogger" },
      { label: 'Baby Clothing',      subSlug: 'baby-clothing',     searchTerm: 'baby bodysuit vest sleepsuit romper babygrow outfit' },
      { label: 'Sportswear',         subSlug: 'sportswear',        searchTerm: 'sportswear gym legging jogger hoodie vest athletic' },
      { label: 'Underwear & Socks',  subSlug: 'underwear-socks',   searchTerm: 'underwear briefs boxers socks tights underwear pack' },
      { label: 'Accessories',        subSlug: 'accessories',       searchTerm: 'hat cap scarf gloves belt bag fashion accessory' },
      { label: 'Swimwear',           subSlug: 'swimwear',          searchTerm: 'swimwear swimsuit bikini trunks shorts beach swim costume' },
    ],
    emptyState: {
      title: 'No Wholesale Clothing found',
      description: 'Try adjusting your search. New clothing is added regularly.',
    },
    productFilter: { categorySlug: 'wholesale-clothing' },
  },
];

export default CATEGORY_CONFIG;

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG.find((c) => c.slug === slug);
}
