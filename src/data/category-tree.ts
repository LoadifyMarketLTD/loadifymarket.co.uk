/**
 * src/data/category-tree.ts
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SINGLE SOURCE OF TRUTH — wholesale/liquidation category navigation     │
 * │                                                                         │
 * │  Used by:                                                               │
 * │  • Mobile drawer  (src/components/MobileDrawer.tsx)                    │
 * │  • Category pages, filters, seller upload (future)                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DrawerSubcategory {
  label: string;
  /** Appended to /catalog?q= when the user taps the subcategory row */
  searchTerm: string;
}

export interface DrawerCategory {
  /** URL-safe slug used for /category/:slug routes */
  slug: string;
  /** Human-readable display name */
  label: string;
  subcategories: DrawerSubcategory[];
}

// ── Quick-action shortcuts (top block in drawer) ───────────────────────────────

export interface QuickAction {
  label: string;
  /** Full relative URL to navigate to */
  href: string;
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "Price Crunch",      href: "/catalog?tag=price-crunch"    },
  { label: "Back in Stock",     href: "/catalog?tag=back-in-stock"   },
  { label: "Best Sellers",      href: "/catalog?sort=bestselling"    },
  { label: "Latest Products",   href: "/catalog?sort=newest"         },
  { label: "Pallet Deals",      href: "/catalog?tag=pallet-deals"    },
  { label: "Delisted",          href: "/catalog?tag=delisted"        },
  { label: "Multi Buy",         href: "/catalog?tag=multi-buy"       },
  { label: "Shop by Brand",     href: "/catalog?view=brands"         },
] as const;

// ── Full category tree (17 wholesale categories) ───────────────────────────────

export const CATEGORY_TREE: readonly DrawerCategory[] = [
  {
    slug: "large-letter-items",
    label: "Large Letter Items",
    subcategories: [
      { label: "Greetings Cards",        searchTerm: "greetings card" },
      { label: "Bookmarks & Stickers",   searchTerm: "bookmark sticker" },
      { label: "Flat Jewellery",         searchTerm: "flat jewellery necklace pendant" },
      { label: "Patches & Badges",       searchTerm: "patch badge embroidered" },
      { label: "Small Accessories",      searchTerm: "small accessory keyring clip" },
      { label: "Coins & Collectibles",   searchTerm: "coin collectible small" },
    ],
  },
  {
    slug: "garden",
    label: "Garden",
    subcategories: [
      { label: "Garden Tools",              searchTerm: "garden tools spade fork trowel" },
      { label: "Planting & Growing",        searchTerm: "planting growing seeds pots compost" },
      { label: "Decorative & Novelty",      searchTerm: "garden decorative novelty ornament" },
      { label: "Outdoor Lighting",          searchTerm: "outdoor garden lighting solar led" },
      { label: "Pest Killers & Deterrents", searchTerm: "pest killer deterrent slug trap" },
      { label: "Bird Feeders",              searchTerm: "bird feeder seed table nest" },
      { label: "BBQ & Picnic",              searchTerm: "bbq picnic grill barbecue" },
      { label: "Hoses & Watering",          searchTerm: "hose watering can sprinkler irrigation" },
      { label: "Pegs & Clotheslines",       searchTerm: "pegs clothesline washing line" },
      { label: "Garden Wear",               searchTerm: "garden wear gloves apron kneeler" },
      { label: "Shed & Garage Accessories", searchTerm: "shed garage accessories storage hook" },
      { label: "Twine & Garden Ties",       searchTerm: "twine garden ties string tie" },
    ],
  },
  {
    slug: "diy",
    label: "DIY",
    subcategories: [
      { label: "Power Tools",        searchTerm: "power tools drill saw grinder" },
      { label: "Hand Tools",         searchTerm: "hand tools hammer screwdriver spanner" },
      { label: "Fixings & Adhesives", searchTerm: "fixings screws bolts adhesive glue" },
      { label: "Decorating",         searchTerm: "decorating paintbrush roller tray filler" },
      { label: "Plumbing",           searchTerm: "plumbing pipe fittings sealant tape" },
      { label: "Flooring",           searchTerm: "flooring underlay laminate vinyl tile" },
      { label: "Electrical Fittings", searchTerm: "electrical fittings socket switch cable" },
      { label: "Safety Equipment",   searchTerm: "safety helmet gloves goggles mask ppe" },
    ],
  },
  {
    slug: "cleaning",
    label: "Cleaning",
    subcategories: [
      { label: "Surface Cleaners",   searchTerm: "surface cleaner spray kitchen bathroom" },
      { label: "Mops & Buckets",     searchTerm: "mop bucket floor cleaning" },
      { label: "Cloths & Sponges",   searchTerm: "cloth sponge microfibre scrubber" },
      { label: "Laundry",            searchTerm: "laundry detergent washing powder softener" },
      { label: "Vacuum Accessories", searchTerm: "vacuum bags filters accessories" },
      { label: "Bin Liners & Bags",  searchTerm: "bin liner bag rubbish refuse sack" },
      { label: "Air Fresheners",     searchTerm: "air freshener odour spray plug-in" },
      { label: "Disinfectants",      searchTerm: "disinfectant antibacterial sanitiser wipes" },
    ],
  },
  {
    slug: "party-gift",
    label: "Party & Gift",
    subcategories: [
      { label: "Balloons",           searchTerm: "balloons latex foil helium party" },
      { label: "Party Tableware",    searchTerm: "party plates cups napkins tablecloth" },
      { label: "Decorations",        searchTerm: "party decorations bunting banners streamers" },
      { label: "Gift Wrap & Bags",   searchTerm: "gift wrap paper bag ribbon bow" },
      { label: "Candles & Holders",  searchTerm: "candle holder birthday cake celebration" },
      { label: "Costumes & Masks",   searchTerm: "costume mask fancy dress party" },
      { label: "Novelty Gifts",      searchTerm: "novelty gift fun gadget joke" },
      { label: "Wedding Supplies",   searchTerm: "wedding supplies confetti favour table" },
    ],
  },
  {
    slug: "wholesale-pound-lines",
    label: "Wholesale Pound Lines",
    subcategories: [
      { label: "Household Essentials", searchTerm: "household essential pound line value" },
      { label: "Stationery & Craft",   searchTerm: "stationery craft pound line pens notebooks" },
      { label: "Snacks & Confectionery", searchTerm: "snack sweet confectionery pound line" },
      { label: "Health & Beauty",      searchTerm: "health beauty pound line value" },
      { label: "Toys & Games",         searchTerm: "toy game pound line value" },
      { label: "Seasonal",             searchTerm: "seasonal pound line value occasion" },
    ],
  },
  {
    slug: "toys",
    label: "Toys",
    subcategories: [
      { label: "Action Figures",    searchTerm: "action figure superhero collectable toy" },
      { label: "Dolls & Accessories", searchTerm: "doll accessories fashion play set" },
      { label: "Building Blocks",   searchTerm: "building blocks lego construction toy" },
      { label: "Educational Toys",  searchTerm: "educational toy puzzle learning stem" },
      { label: "Outdoor Play",      searchTerm: "outdoor play toy scooter bike sandbox" },
      { label: "Arts & Crafts",     searchTerm: "arts crafts painting drawing modelling" },
      { label: "Board Games",       searchTerm: "board game card game family fun" },
      { label: "Baby Toys",         searchTerm: "baby toy rattle soft sensory activity" },
    ],
  },
  {
    slug: "leisure-hobbies",
    label: "Leisure & Hobbies",
    subcategories: [
      { label: "Fishing",           searchTerm: "fishing rod reel tackle bait" },
      { label: "Cycling",           searchTerm: "cycling bike accessories pump lock" },
      { label: "Camping & Hiking",  searchTerm: "camping hiking tent sleeping bag" },
      { label: "Arts & Crafts",     searchTerm: "arts crafts hobby paint canvas clay" },
      { label: "Music",             searchTerm: "music instrument guitar ukulele drum" },
      { label: "Photography",       searchTerm: "photography camera accessories tripod bag" },
      { label: "Puzzles & Models",  searchTerm: "puzzle model jigsaw miniature" },
      { label: "Sports Equipment",  searchTerm: "sports equipment fitness gym outdoor" },
    ],
  },
  {
    slug: "baby-supplies",
    label: "Baby Supplies",
    subcategories: [
      { label: "Feeding",           searchTerm: "baby feeding bottle spoon weaning bowl" },
      { label: "Nappies & Wipes",   searchTerm: "nappies wipes changing mat baby" },
      { label: "Bathing",           searchTerm: "baby bathing bath soap wash towel" },
      { label: "Nursery",           searchTerm: "nursery cot blanket monitor night light" },
      { label: "Clothing & Bibs",   searchTerm: "baby clothing bib sleepsuit vest" },
      { label: "Safety & Health",   searchTerm: "baby safety health thermometer monitor" },
      { label: "Travel",            searchTerm: "baby travel pram pushchair car seat" },
      { label: "Toys & Rattles",    searchTerm: "baby toy rattle teether activity" },
    ],
  },
  {
    slug: "kitchenware",
    label: "Kitchenware",
    subcategories: [
      { label: "Pots & Pans",       searchTerm: "pots pans cookware casserole frying wok" },
      { label: "Baking",            searchTerm: "baking tray tin mould rolling pin" },
      { label: "Kitchen Utensils",  searchTerm: "kitchen utensils spatula ladle whisk spoon" },
      { label: "Knives & Boards",   searchTerm: "knife chopping board carving set" },
      { label: "Storage & Containers", searchTerm: "kitchen storage container food box jar" },
      { label: "Mugs & Glasses",    searchTerm: "mug glass cup mug set drinking" },
      { label: "Small Appliances",  searchTerm: "kettle toaster blender juicer air fryer" },
      { label: "Cleaning & Care",   searchTerm: "washing up brush drainer dishcloth" },
    ],
  },
  {
    slug: "health-beauty",
    label: "Health & Beauty",
    subcategories: [
      { label: "Skincare",          searchTerm: "skincare moisturiser serum cleanser face" },
      { label: "Haircare",          searchTerm: "haircare shampoo conditioner styling hair" },
      { label: "Makeup",            searchTerm: "makeup foundation lipstick mascara eyeshadow" },
      { label: "Fragrances",        searchTerm: "fragrance perfume cologne body spray" },
      { label: "Oral Care",         searchTerm: "oral care toothbrush toothpaste mouthwash" },
      { label: "Men's Grooming",    searchTerm: "mens grooming shaving razor beard aftershave" },
      { label: "Vitamins & Supplements", searchTerm: "vitamins supplements health nutrition" },
      { label: "First Aid",         searchTerm: "first aid plasters bandage antiseptic" },
    ],
  },
  {
    slug: "homeware",
    label: "Homeware",
    subcategories: [
      { label: "Bedding",           searchTerm: "bedding duvet pillow sheets blanket" },
      { label: "Towels & Bath",     searchTerm: "towels bath mat shower curtain" },
      { label: "Curtains & Blinds", searchTerm: "curtains blinds voile window dressing" },
      { label: "Rugs & Mats",       searchTerm: "rug mat doormat runner flooring" },
      { label: "Picture Frames",    searchTerm: "picture frame photo wall art" },
      { label: "Candles & Diffusers", searchTerm: "candle diffuser reed wax melt home scent" },
      { label: "Cushions & Throws", searchTerm: "cushion throw pillow sofa cover" },
      { label: "Storage & Organisation", searchTerm: "storage organisation box basket drawer" },
    ],
  },
  {
    slug: "electrical",
    label: "Electrical",
    subcategories: [
      { label: "Lighting",          searchTerm: "lighting bulb led strip lamp spotlight" },
      { label: "Cables & Chargers", searchTerm: "cable charger usb power bank lead" },
      { label: "Extension Leads",   searchTerm: "extension lead socket multi plug surge" },
      { label: "Batteries",         searchTerm: "batteries aa aaa rechargeable cell" },
      { label: "Smart Home",        searchTerm: "smart home alexa wifi plug camera" },
      { label: "Torches & Lanterns", searchTerm: "torch lantern head light emergency" },
      { label: "Audio & Visual",    searchTerm: "audio visual speakers tv hdmi earphones" },
      { label: "Security",          searchTerm: "security camera cctv alarm doorbell" },
    ],
  },
  {
    slug: "pet-supplies",
    label: "Pet Supplies",
    subcategories: [
      { label: "Dog Accessories",   searchTerm: "dog lead collar harness bowl bed" },
      { label: "Cat Accessories",   searchTerm: "cat bed litter tray collar toy" },
      { label: "Pet Food & Treats", searchTerm: "pet food treats dog cat bird" },
      { label: "Small Animals",     searchTerm: "small animal rabbit hamster guinea pig" },
      { label: "Fish & Aquatics",   searchTerm: "fish tank aquarium accessories filter" },
      { label: "Grooming",          searchTerm: "pet grooming brush shampoo nail clippers" },
      { label: "Toys & Play",       searchTerm: "pet toys play rope chew fetch" },
      { label: "Health & Flea",     searchTerm: "pet health flea treatment worming" },
    ],
  },
  {
    slug: "stationery",
    label: "Stationery",
    subcategories: [
      { label: "Pens & Pencils",    searchTerm: "pens pencils ballpoint felt tip marker" },
      { label: "Notebooks & Pads",  searchTerm: "notebook pad jotter diary planner" },
      { label: "Folders & Filing",  searchTerm: "folder filing binder lever arch" },
      { label: "Desk Accessories",  searchTerm: "desk accessories stapler hole punch tape" },
      { label: "Arts & Craft",      searchTerm: "craft paper card scissors glue paint" },
      { label: "Envelopes & Labels", searchTerm: "envelopes labels address stamp postage" },
      { label: "Office Supplies",   searchTerm: "office supplies staples clips rubber bands" },
    ],
  },
  {
    slug: "seasonal",
    label: "Seasonal",
    subcategories: [
      { label: "Christmas",         searchTerm: "christmas decorations baubles lights tinsel" },
      { label: "Easter",            searchTerm: "easter egg hunt decorations spring" },
      { label: "Halloween",         searchTerm: "halloween costume decoration pumpkin horror" },
      { label: "Valentine's Day",   searchTerm: "valentines day gift heart roses romantic" },
      { label: "Summer",            searchTerm: "summer garden outdoor beach pool paddling" },
      { label: "Back to School",    searchTerm: "back to school stationery bag lunch box" },
      { label: "New Year",          searchTerm: "new year party supplies celebration" },
    ],
  },
  {
    slug: "wholesale-clothing",
    label: "Wholesale Clothing",
    subcategories: [
      { label: "Women's Clothing",  searchTerm: "womens clothing wholesale dress top blouse" },
      { label: "Men's Clothing",    searchTerm: "mens clothing wholesale shirt trousers jacket" },
      { label: "Children's Clothing", searchTerm: "childrens clothing kids wholesale school" },
      { label: "Underwear & Socks", searchTerm: "underwear socks briefs vest wholesale" },
      { label: "Sportswear",        searchTerm: "sportswear activewear gym wholesale leggings" },
      { label: "Nightwear",         searchTerm: "nightwear pyjamas dressing gown wholesale" },
      { label: "Accessories",       searchTerm: "clothing accessories scarves hats gloves wholesale" },
    ],
  },
] as const;

/** Look up a category by slug */
export function getDrawerCategory(slug: string): DrawerCategory | undefined {
  return CATEGORY_TREE.find((c) => c.slug === slug);
}

export default CATEGORY_TREE;
