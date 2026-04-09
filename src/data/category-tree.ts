/**
 * category-tree.ts
 *
 * eBay-inspired 3-level marketplace category taxonomy.
 * Used by MobileDrawer for the 3-level navigation experience:
 *   Level 1 (L1) → Level 2 (L2) → Level 3 (L3 terminal items)
 *
 * Structure is intentionally broad so that ANY seller can find a category
 * and NO product is left without a home.
 */

import {
  Car,
  Home,
  Shirt,
  Zap,
  Palette,
  Dumbbell,
  Gem,
  BookOpen,
  HeartPulse,
  Briefcase,
  Building2,
  LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface L3Item {
  label: string;
  slug: string;
}

export interface L2Category {
  label: string;
  slug: string;
  items: L3Item[];
}

export interface L1Category {
  label: string;
  slug: string;
  icon: LucideIcon;
  iconColor: string;
  subcategories: L2Category[];
}

// ── Category tree ─────────────────────────────────────────────────────────────

export const CATEGORY_TREE: L1Category[] = [
  // ── 1. Motors ──────────────────────────────────────────────────────────────
  {
    label: 'Motors',
    slug: 'motors',
    icon: Car,
    iconColor: 'text-blue-400',
    subcategories: [
      {
        label: 'Cars & Trucks',
        slug: 'cars-trucks',
        items: [
          { label: 'Hatchbacks', slug: 'hatchbacks' },
          { label: 'Saloons', slug: 'saloons' },
          { label: 'SUVs & 4x4s', slug: 'suvs-4x4s' },
          { label: 'Estate Cars', slug: 'estate-cars' },
          { label: 'Convertibles', slug: 'convertibles' },
          { label: 'Parts & Accessories', slug: 'car-parts-accessories' },
        ],
      },
      {
        label: 'Motorcycles & Scooters',
        slug: 'motorcycles-scooters',
        items: [
          { label: 'Motorbikes', slug: 'motorbikes' },
          { label: 'Scooters', slug: 'scooters' },
          { label: 'Quad Bikes', slug: 'quad-bikes' },
          { label: 'Helmets & Protective Gear', slug: 'helmets-protective-gear' },
          { label: 'Parts & Accessories', slug: 'motorcycle-parts-accessories' },
        ],
      },
      {
        label: 'Vans',
        slug: 'vans',
        items: [
          { label: 'Panel Vans', slug: 'panel-vans' },
          { label: 'Minibuses', slug: 'minibuses' },
          { label: 'Pickup Trucks', slug: 'pickup-trucks' },
          { label: 'Luton Vans', slug: 'luton-vans' },
          { label: 'Van Parts', slug: 'van-parts' },
        ],
      },
      {
        label: 'Caravans & Campervans',
        slug: 'caravans-campervans',
        items: [
          { label: 'Touring Caravans', slug: 'touring-caravans' },
          { label: 'Static Caravans', slug: 'static-caravans' },
          { label: 'Campervans & Motorhomes', slug: 'campervans-motorhomes' },
          { label: 'Accessories & Parts', slug: 'caravan-accessories-parts' },
        ],
      },
      {
        label: 'Boats & Watercraft',
        slug: 'boats-watercraft',
        items: [
          { label: 'Motor Boats', slug: 'motor-boats' },
          { label: 'Sailing Boats', slug: 'sailing-boats' },
          { label: 'Jet Skis & PWC', slug: 'jet-skis-pwc' },
          { label: 'Canoes & Kayaks', slug: 'canoes-kayaks' },
          { label: 'Boat Parts & Accessories', slug: 'boat-parts-accessories' },
        ],
      },
      {
        label: 'Vehicle Parts & Accessories',
        slug: 'vehicle-parts-accessories',
        items: [
          { label: 'Car Parts', slug: 'car-parts' },
          { label: 'Tyres & Wheels', slug: 'tyres-wheels' },
          { label: 'Tools & Garage Equipment', slug: 'tools-garage-equipment' },
          { label: 'Car Audio & Electronics', slug: 'car-audio-electronics' },
          { label: 'Car Care & Detailing', slug: 'car-care-detailing' },
        ],
      },
    ],
  },

  // ── 2. Home & Garden ───────────────────────────────────────────────────────
  {
    label: 'Home & Garden',
    slug: 'home-garden',
    icon: Home,
    iconColor: 'text-green-400',
    subcategories: [
      {
        label: 'Furniture',
        slug: 'furniture',
        items: [
          { label: 'Sofas & Armchairs', slug: 'sofas-armchairs' },
          { label: 'Beds & Mattresses', slug: 'beds-mattresses' },
          { label: 'Dining Tables & Chairs', slug: 'dining-tables-chairs' },
          { label: 'Storage & Shelving', slug: 'storage-shelving' },
          { label: 'Office Furniture', slug: 'office-furniture' },
        ],
      },
      {
        label: 'Kitchen',
        slug: 'kitchen',
        items: [
          { label: 'Cookware', slug: 'cookware' },
          { label: 'Small Kitchen Appliances', slug: 'small-kitchen-appliances' },
          { label: 'Tableware & Crockery', slug: 'tableware-crockery' },
          { label: 'Food Storage', slug: 'food-storage' },
          { label: 'Kitchen Tools & Gadgets', slug: 'kitchen-tools-gadgets' },
        ],
      },
      {
        label: 'Lighting',
        slug: 'lighting',
        items: [
          { label: 'Ceiling Lights', slug: 'ceiling-lights' },
          { label: 'Table & Floor Lamps', slug: 'table-floor-lamps' },
          { label: 'Wall Lights', slug: 'wall-lights' },
          { label: 'Outdoor Lighting', slug: 'outdoor-lighting' },
          { label: 'Smart Lighting', slug: 'smart-lighting-home' },
        ],
      },
      {
        label: 'Bedding & Towels',
        slug: 'bedding-towels',
        items: [
          { label: 'Duvets & Quilts', slug: 'duvets-quilts' },
          { label: 'Pillows', slug: 'pillows' },
          { label: 'Bed Sheets & Sets', slug: 'bed-sheets-sets' },
          { label: 'Towels & Bathrobes', slug: 'towels-bathrobes' },
          { label: 'Mattress Toppers', slug: 'mattress-toppers' },
        ],
      },
      {
        label: 'Garden',
        slug: 'garden',
        items: [
          { label: 'Garden Furniture', slug: 'garden-furniture' },
          { label: 'Plants & Seeds', slug: 'plants-seeds' },
          { label: 'Garden Tools', slug: 'garden-tools' },
          { label: 'Outdoor Heating & BBQ', slug: 'outdoor-heating-bbq' },
          { label: 'Fencing & Decking', slug: 'fencing-decking' },
        ],
      },
      {
        label: 'DIY & Home Improvement',
        slug: 'diy-home-improvement',
        items: [
          { label: 'Power Tools', slug: 'power-tools-home' },
          { label: 'Hand Tools', slug: 'hand-tools-home' },
          { label: 'Paint & Decorating', slug: 'paint-decorating' },
          { label: 'Plumbing & Bathrooms', slug: 'plumbing-bathrooms' },
          { label: 'Electrical & Lighting Supplies', slug: 'electrical-lighting-supplies' },
        ],
      },
    ],
  },

  // ── 3. Fashion ─────────────────────────────────────────────────────────────
  {
    label: 'Fashion',
    slug: 'fashion',
    icon: Shirt,
    iconColor: 'text-pink-400',
    subcategories: [
      {
        label: "Men's Clothing",
        slug: 'mens-clothing',
        items: [
          { label: 'Tops & T-Shirts', slug: 'mens-tops-tshirts' },
          { label: 'Jeans & Trousers', slug: 'mens-jeans-trousers' },
          { label: 'Jackets & Coats', slug: 'mens-jackets-coats' },
          { label: 'Suits & Blazers', slug: 'suits-blazers' },
          { label: 'Sportswear', slug: 'mens-sportswear' },
        ],
      },
      {
        label: "Women's Clothing",
        slug: 'womens-clothing',
        items: [
          { label: 'Tops & Blouses', slug: 'womens-tops-blouses' },
          { label: 'Dresses', slug: 'dresses' },
          { label: 'Jeans & Trousers', slug: 'womens-jeans-trousers' },
          { label: 'Coats & Jackets', slug: 'womens-coats-jackets' },
          { label: 'Activewear', slug: 'womens-activewear' },
        ],
      },
      {
        label: "Children's Clothing",
        slug: 'childrens-clothing',
        items: [
          { label: 'Baby (0–24 months)', slug: 'baby-0-24m' },
          { label: 'Boys (2–13 years)', slug: 'boys-2-13' },
          { label: 'Girls (2–13 years)', slug: 'girls-2-13' },
          { label: 'School Uniforms', slug: 'school-uniforms' },
          { label: "Children's Sportswear", slug: 'childrens-sportswear' },
        ],
      },
      {
        label: 'Shoes',
        slug: 'shoes',
        items: [
          { label: "Men's Shoes", slug: 'mens-shoes' },
          { label: "Women's Shoes", slug: 'womens-shoes' },
          { label: "Children's Shoes", slug: 'childrens-shoes' },
          { label: 'Sports Shoes & Trainers', slug: 'sports-trainers' },
          { label: 'Boots', slug: 'boots' },
        ],
      },
      {
        label: 'Accessories',
        slug: 'fashion-accessories',
        items: [
          { label: 'Bags & Handbags', slug: 'bags-handbags' },
          { label: 'Belts', slug: 'belts' },
          { label: 'Hats & Caps', slug: 'hats-caps' },
          { label: 'Scarves & Gloves', slug: 'scarves-gloves' },
          { label: 'Sunglasses', slug: 'sunglasses' },
        ],
      },
      {
        label: 'Wholesale Clothing',
        slug: 'wholesale-clothing',
        items: [
          { label: 'Bundle & Job Lots', slug: 'clothing-bundle-lots' },
          { label: 'Clearance Lines', slug: 'clothing-clearance' },
          { label: 'Mixed Gender Lots', slug: 'clothing-mixed-lots' },
          { label: 'Branded Wholesale', slug: 'clothing-branded' },
          { label: 'Designer Inspired', slug: 'clothing-designer-inspired' },
        ],
      },
    ],
  },

  // ── 4. Electronics ─────────────────────────────────────────────────────────
  {
    label: 'Electronics',
    slug: 'electronics',
    icon: Zap,
    iconColor: 'text-yellow-400',
    subcategories: [
      {
        label: 'Mobile Phones',
        slug: 'mobile-phones',
        items: [
          { label: 'Smartphones', slug: 'smartphones' },
          { label: 'Feature Phones', slug: 'feature-phones' },
          { label: 'Phone Cases & Accessories', slug: 'phone-cases-accessories' },
          { label: 'Parts & Repair', slug: 'phone-parts-repair' },
          { label: 'SIM-Free & Unlocked', slug: 'sim-free-unlocked' },
        ],
      },
      {
        label: 'Computers & Tablets',
        slug: 'computers-tablets',
        items: [
          { label: 'Laptops', slug: 'laptops' },
          { label: 'Desktop PCs', slug: 'desktop-pcs' },
          { label: 'Tablets & iPads', slug: 'tablets-ipads' },
          { label: 'Computer Components', slug: 'computer-components' },
          { label: 'Peripherals & Accessories', slug: 'peripherals-accessories' },
        ],
      },
      {
        label: 'TV & Audio',
        slug: 'tv-audio',
        items: [
          { label: 'Televisions', slug: 'televisions' },
          { label: 'Sound Bars & Speakers', slug: 'soundbars-speakers' },
          { label: 'Headphones & Earphones', slug: 'headphones-earphones' },
          { label: 'DVD & Blu-ray Players', slug: 'dvd-bluray-players' },
          { label: 'Home Cinema Systems', slug: 'home-cinema-systems' },
        ],
      },
      {
        label: 'Cameras',
        slug: 'cameras',
        items: [
          { label: 'Digital Cameras', slug: 'digital-cameras' },
          { label: 'Action Cameras', slug: 'action-cameras' },
          { label: 'Camera Lenses', slug: 'camera-lenses' },
          { label: 'Camcorders', slug: 'camcorders' },
          { label: 'Camera Accessories', slug: 'camera-accessories' },
        ],
      },
      {
        label: 'Gaming',
        slug: 'gaming',
        items: [
          { label: 'Consoles', slug: 'consoles' },
          { label: 'Games', slug: 'games' },
          { label: 'Controllers & Accessories', slug: 'controllers-accessories' },
          { label: 'PC Gaming', slug: 'pc-gaming' },
          { label: 'Retro Gaming', slug: 'retro-gaming' },
        ],
      },
      {
        label: 'Smart Home',
        slug: 'smart-home',
        items: [
          { label: 'Smart Speakers & Displays', slug: 'smart-speakers-displays' },
          { label: 'Security Cameras & Doorbells', slug: 'security-cameras-doorbells' },
          { label: 'Smart Heating & Thermostats', slug: 'smart-heating-thermostats' },
          { label: 'Smart Plugs & Switches', slug: 'smart-plugs-switches' },
          { label: 'Smart Lighting', slug: 'smart-lighting-electronics' },
        ],
      },
    ],
  },

  // ── 5. Collectables & Art ──────────────────────────────────────────────────
  {
    label: 'Collectables & Art',
    slug: 'collectables-art',
    icon: Palette,
    iconColor: 'text-purple-400',
    subcategories: [
      {
        label: 'Antiques',
        slug: 'antiques',
        items: [
          { label: 'Furniture', slug: 'antique-furniture' },
          { label: 'Ceramics & Porcelain', slug: 'ceramics-porcelain' },
          { label: 'Silver & Metalware', slug: 'silver-metalware' },
          { label: 'Clocks & Watches', slug: 'antique-clocks-watches' },
          { label: 'Textiles & Linen', slug: 'textiles-linen' },
        ],
      },
      {
        label: 'Coins & Banknotes',
        slug: 'coins-banknotes',
        items: [
          { label: 'UK Coins', slug: 'uk-coins' },
          { label: 'World Coins', slug: 'world-coins' },
          { label: 'Banknotes', slug: 'banknotes' },
          { label: 'Bullion', slug: 'bullion' },
          { label: 'Error & Rare Coins', slug: 'error-rare-coins' },
        ],
      },
      {
        label: 'Art',
        slug: 'art',
        items: [
          { label: 'Paintings', slug: 'paintings' },
          { label: 'Prints & Posters', slug: 'prints-posters' },
          { label: 'Photography', slug: 'photography-art' },
          { label: 'Sculptures', slug: 'sculptures' },
          { label: 'Drawings & Illustrations', slug: 'drawings-illustrations' },
        ],
      },
      {
        label: 'Memorabilia',
        slug: 'memorabilia',
        items: [
          { label: 'Sports Memorabilia', slug: 'sports-memorabilia' },
          { label: 'Music Memorabilia', slug: 'music-memorabilia' },
          { label: 'Film & TV Memorabilia', slug: 'film-tv-memorabilia' },
          { label: 'Autographs', slug: 'autographs' },
          { label: 'Programmes & Tickets', slug: 'programmes-tickets' },
        ],
      },
      {
        label: 'Stamps',
        slug: 'stamps',
        items: [
          { label: 'UK Stamps', slug: 'uk-stamps' },
          { label: 'World Stamps', slug: 'world-stamps' },
          { label: 'First Day Covers', slug: 'first-day-covers' },
          { label: 'Stamp Collections', slug: 'stamp-collections' },
          { label: 'Postal History', slug: 'postal-history' },
        ],
      },
      {
        label: 'Vintage Toys & Models',
        slug: 'vintage-toys-models',
        items: [
          { label: 'Diecast Models', slug: 'diecast-models' },
          { label: 'Action Figures', slug: 'vintage-action-figures' },
          { label: 'Vintage Board Games', slug: 'vintage-board-games' },
          { label: 'Model Kits', slug: 'model-kits' },
          { label: 'Vintage Soft Toys', slug: 'vintage-soft-toys' },
        ],
      },
    ],
  },

  // ── 6. Sports, Hobbies & Leisure ──────────────────────────────────────────
  {
    label: 'Sports, Hobbies & Leisure',
    slug: 'sports-hobbies-leisure',
    icon: Dumbbell,
    iconColor: 'text-orange-400',
    subcategories: [
      {
        label: 'Sports Equipment',
        slug: 'sports-equipment',
        items: [
          { label: 'Football', slug: 'football-equipment' },
          { label: 'Cycling', slug: 'cycling-equipment' },
          { label: 'Fitness & Gym', slug: 'fitness-gym' },
          { label: 'Golf', slug: 'golf-equipment' },
          { label: 'Tennis & Racket Sports', slug: 'tennis-racket-sports' },
        ],
      },
      {
        label: 'Outdoor Recreation',
        slug: 'outdoor-recreation',
        items: [
          { label: 'Camping & Hiking', slug: 'camping-hiking' },
          { label: 'Fishing', slug: 'fishing' },
          { label: 'Climbing & Mountaineering', slug: 'climbing-mountaineering' },
          { label: 'Water Sports', slug: 'water-sports' },
          { label: 'Winter Sports', slug: 'winter-sports' },
        ],
      },
      {
        label: 'Hobbies & Crafts',
        slug: 'hobbies-crafts',
        items: [
          { label: 'Art & Craft Supplies', slug: 'art-craft-supplies' },
          { label: 'Model Making', slug: 'model-making' },
          { label: 'Sewing & Fabric', slug: 'sewing-fabric' },
          { label: 'Knitting & Crochet', slug: 'knitting-crochet' },
          { label: 'Puzzles & Board Games', slug: 'puzzles-board-games' },
        ],
      },
      {
        label: 'Musical Instruments',
        slug: 'musical-instruments',
        items: [
          { label: 'Guitars', slug: 'guitars' },
          { label: 'Keyboards & Pianos', slug: 'keyboards-pianos' },
          { label: 'Drums & Percussion', slug: 'drums-percussion' },
          { label: 'Wind & Brass', slug: 'wind-brass' },
          { label: 'DJ & Electronic Music', slug: 'dj-electronic-music' },
        ],
      },
      {
        label: 'Toys',
        slug: 'toys',
        items: [
          { label: 'Baby & Toddler', slug: 'baby-toddler-toys' },
          { label: 'Educational Toys', slug: 'educational-toys' },
          { label: 'Outdoor Toys & Play', slug: 'outdoor-toys-play' },
          { label: 'Electronic & Interactive', slug: 'electronic-interactive-toys' },
          { label: 'Soft Toys & Dolls', slug: 'soft-toys-dolls' },
        ],
      },
      {
        label: 'Books, Comics & Magazines',
        slug: 'books-comics-magazines',
        items: [
          { label: 'Fiction', slug: 'fiction-books' },
          { label: 'Non-Fiction', slug: 'non-fiction-books' },
          { label: 'Comics & Graphic Novels', slug: 'comics-graphic-novels' },
          { label: "Children's Books", slug: 'childrens-books' },
          { label: 'Magazines & Periodicals', slug: 'magazines-periodicals' },
        ],
      },
    ],
  },

  // ── 7. Jewellery & Watches ─────────────────────────────────────────────────
  {
    label: 'Jewellery & Watches',
    slug: 'jewellery-watches',
    icon: Gem,
    iconColor: 'text-rose-400',
    subcategories: [
      {
        label: 'Necklaces & Pendants',
        slug: 'necklaces-pendants',
        items: [
          { label: 'Gold Necklaces', slug: 'gold-necklaces' },
          { label: 'Silver Necklaces', slug: 'silver-necklaces' },
          { label: 'Pearl Necklaces', slug: 'pearl-necklaces' },
          { label: 'Gemstone Necklaces', slug: 'gemstone-necklaces' },
          { label: 'Fashion Necklaces', slug: 'fashion-necklaces' },
        ],
      },
      {
        label: 'Rings',
        slug: 'rings',
        items: [
          { label: 'Engagement Rings', slug: 'engagement-rings' },
          { label: 'Wedding Rings', slug: 'wedding-rings' },
          { label: 'Eternity Rings', slug: 'eternity-rings' },
          { label: 'Fashion Rings', slug: 'fashion-rings' },
          { label: "Men's Rings", slug: 'mens-rings' },
        ],
      },
      {
        label: 'Earrings',
        slug: 'earrings',
        items: [
          { label: 'Stud Earrings', slug: 'stud-earrings' },
          { label: 'Hoop Earrings', slug: 'hoop-earrings' },
          { label: 'Drop & Dangle Earrings', slug: 'drop-dangle-earrings' },
          { label: 'Clip-on Earrings', slug: 'clip-on-earrings' },
          { label: 'Statement Earrings', slug: 'statement-earrings' },
        ],
      },
      {
        label: 'Watches',
        slug: 'watches',
        items: [
          { label: "Men's Watches", slug: 'mens-watches' },
          { label: "Women's Watches", slug: 'womens-watches' },
          { label: 'Smart Watches', slug: 'smart-watches' },
          { label: 'Vintage & Antique Watches', slug: 'vintage-antique-watches' },
          { label: 'Watch Accessories', slug: 'watch-accessories' },
        ],
      },
      {
        label: 'Bracelets & Bangles',
        slug: 'bracelets-bangles',
        items: [
          { label: 'Charm Bracelets', slug: 'charm-bracelets' },
          { label: 'Bangles', slug: 'bangles' },
          { label: 'Chain Bracelets', slug: 'chain-bracelets' },
          { label: 'Cuff Bracelets', slug: 'cuff-bracelets' },
          { label: 'Anklets', slug: 'anklets' },
        ],
      },
      {
        label: 'Wholesale Jewellery',
        slug: 'wholesale-jewellery',
        items: [
          { label: 'Mixed Lots', slug: 'jewellery-mixed-lots' },
          { label: 'Sterling Silver', slug: 'sterling-silver-wholesale' },
          { label: 'Fashion Jewellery Lots', slug: 'fashion-jewellery-lots' },
          { label: 'Clearance', slug: 'jewellery-clearance' },
          { label: 'Branded & Designer', slug: 'branded-designer-jewellery' },
        ],
      },
    ],
  },

  // ── 8. Media ───────────────────────────────────────────────────────────────
  {
    label: 'Media',
    slug: 'media',
    icon: BookOpen,
    iconColor: 'text-teal-400',
    subcategories: [
      {
        label: 'DVDs & Blu-ray',
        slug: 'dvds-bluray',
        items: [
          { label: 'Movies', slug: 'movies-dvd' },
          { label: 'TV Series', slug: 'tv-series-dvd' },
          { label: 'Box Sets', slug: 'box-sets' },
          { label: 'Blu-ray Discs', slug: 'bluray-discs' },
          { label: '4K Ultra HD', slug: '4k-ultra-hd' },
        ],
      },
      {
        label: 'Music',
        slug: 'music',
        items: [
          { label: 'CDs', slug: 'music-cds' },
          { label: 'Vinyl Records', slug: 'vinyl-records' },
          { label: 'Cassette Tapes', slug: 'cassette-tapes' },
          { label: 'Music Memorabilia', slug: 'music-memorabilia-media' },
          { label: 'Sheet Music', slug: 'sheet-music' },
        ],
      },
      {
        label: 'Video Games',
        slug: 'video-games-media',
        items: [
          { label: 'PlayStation Games', slug: 'playstation-games' },
          { label: 'Xbox Games', slug: 'xbox-games' },
          { label: 'Nintendo Games', slug: 'nintendo-games' },
          { label: 'PC Games', slug: 'pc-games' },
          { label: 'Retro Games & Consoles', slug: 'retro-games-consoles' },
        ],
      },
      {
        label: 'Books',
        slug: 'books',
        items: [
          { label: 'Fiction', slug: 'fiction-books-media' },
          { label: 'Non-Fiction', slug: 'non-fiction-books-media' },
          { label: 'Textbooks & Educational', slug: 'textbooks-educational' },
          { label: 'Rare & Collectible Books', slug: 'rare-collectible-books' },
          { label: "Children's Books", slug: 'childrens-books-media' },
        ],
      },
      {
        label: 'Magazines & Comics',
        slug: 'magazines-comics',
        items: [
          { label: 'Current Magazines', slug: 'current-magazines' },
          { label: 'Back Issues', slug: 'back-issues' },
          { label: 'Comics', slug: 'comics-media' },
          { label: 'Graphic Novels', slug: 'graphic-novels-media' },
          { label: "Collector's Editions", slug: 'collectors-editions' },
        ],
      },
    ],
  },

  // ── 9. Health & Beauty ─────────────────────────────────────────────────────
  {
    label: 'Health & Beauty',
    slug: 'health-beauty',
    icon: HeartPulse,
    iconColor: 'text-red-400',
    subcategories: [
      {
        label: 'Skincare',
        slug: 'skincare',
        items: [
          { label: 'Moisturisers & Serums', slug: 'moisturisers-serums' },
          { label: 'Cleansers & Toners', slug: 'cleansers-toners' },
          { label: 'Sun Protection', slug: 'sun-protection' },
          { label: 'Face Masks', slug: 'face-masks' },
          { label: 'Anti-Ageing', slug: 'anti-ageing' },
        ],
      },
      {
        label: 'Hair Care',
        slug: 'hair-care',
        items: [
          { label: 'Shampoo & Conditioner', slug: 'shampoo-conditioner' },
          { label: 'Hair Styling', slug: 'hair-styling' },
          { label: 'Hair Colour & Dye', slug: 'hair-colour-dye' },
          { label: 'Hair Extensions', slug: 'hair-extensions' },
          { label: 'Hair Accessories', slug: 'hair-accessories' },
        ],
      },
      {
        label: 'Makeup & Cosmetics',
        slug: 'makeup-cosmetics',
        items: [
          { label: 'Face Makeup', slug: 'makeup-face' },
          { label: 'Eye Makeup', slug: 'makeup-eyes' },
          { label: 'Lip Makeup', slug: 'makeup-lips' },
          { label: 'Nail Products', slug: 'makeup-nails' },
          { label: 'Makeup Tools & Brushes', slug: 'makeup-tools-brushes' },
        ],
      },
      {
        label: 'Fragrances',
        slug: 'fragrances',
        items: [
          { label: "Women's Perfumes", slug: 'womens-perfumes' },
          { label: "Men's Aftershave", slug: 'mens-aftershave' },
          { label: 'Unisex Fragrances', slug: 'unisex-fragrances' },
          { label: 'Gift Sets', slug: 'fragrance-gift-sets' },
          { label: 'Wholesale Fragrances', slug: 'wholesale-fragrances' },
        ],
      },
      {
        label: 'Health & Wellbeing',
        slug: 'health-wellbeing',
        items: [
          { label: 'Vitamins & Supplements', slug: 'vitamins-supplements' },
          { label: 'Medical Supplies', slug: 'medical-supplies' },
          { label: 'Mobility Aids', slug: 'mobility-aids' },
          { label: 'Dental Care', slug: 'dental-care' },
          { label: 'Eye Care', slug: 'eye-care' },
        ],
      },
      {
        label: 'Wholesale Beauty',
        slug: 'wholesale-beauty',
        items: [
          { label: 'Bundle Lots', slug: 'beauty-bundle-lots' },
          { label: 'Salon Supplies', slug: 'salon-supplies' },
          { label: 'Clearance', slug: 'beauty-clearance' },
          { label: 'Ex-Display', slug: 'beauty-ex-display' },
          { label: 'Professional Brands', slug: 'beauty-professional-brands' },
        ],
      },
    ],
  },

  // ── 10. Business, Office & Industrial ─────────────────────────────────────
  {
    label: 'Business, Office & Industrial',
    slug: 'business-office-industrial',
    icon: Briefcase,
    iconColor: 'text-slate-400',
    subcategories: [
      {
        label: 'Office Supplies',
        slug: 'office-supplies',
        items: [
          { label: 'Stationery', slug: 'stationery-office' },
          { label: 'Printer Supplies', slug: 'printer-supplies' },
          { label: 'Filing & Storage', slug: 'filing-storage' },
          { label: 'Office Technology', slug: 'office-technology' },
          { label: 'Packaging Materials', slug: 'packaging-materials-office' },
        ],
      },
      {
        label: 'Industrial Equipment',
        slug: 'industrial-equipment',
        items: [
          { label: 'Power Tools', slug: 'power-tools-industrial' },
          { label: 'Hand Tools', slug: 'hand-tools-industrial' },
          { label: 'Safety Equipment', slug: 'safety-equipment' },
          { label: 'Lifting & Material Handling', slug: 'lifting-material-handling' },
          { label: 'Workshop Equipment', slug: 'workshop-equipment' },
        ],
      },
      {
        label: 'Wholesale & Job Lots',
        slug: 'wholesale-job-lots',
        items: [
          { label: 'Wholesale Lots', slug: 'wholesale-lots' },
          { label: 'Pallet Deals', slug: 'pallet-deals-business' },
          { label: 'Stock Clearance', slug: 'stock-clearance' },
          { label: 'Surplus & Liquidation', slug: 'surplus-liquidation' },
          { label: 'Returned Goods', slug: 'returned-goods' },
        ],
      },
      {
        label: 'Cleaning & Janitorial',
        slug: 'cleaning-janitorial',
        items: [
          { label: 'Cleaning Products', slug: 'cleaning-products-business' },
          { label: 'Hygiene & Sanitation', slug: 'hygiene-sanitation' },
          { label: 'Paper & Disposables', slug: 'paper-disposables' },
          { label: 'Waste Management', slug: 'waste-management' },
          { label: 'Floor Care Equipment', slug: 'floor-care-equipment' },
        ],
      },
      {
        label: 'Retail & Display',
        slug: 'retail-display',
        items: [
          { label: 'Display Equipment', slug: 'display-equipment' },
          { label: 'Shelving & Racking', slug: 'shelving-racking' },
          { label: 'EPOS & Retail Tech', slug: 'epos-retail-tech' },
          { label: 'Packaging & Wrapping', slug: 'packaging-wrapping' },
          { label: 'Labelling & Signage', slug: 'labelling-signage' },
        ],
      },
      {
        label: 'Catering & Food Service',
        slug: 'catering-food-service',
        items: [
          { label: 'Catering Equipment', slug: 'catering-equipment' },
          { label: 'Consumables & Disposables', slug: 'consumables-disposables' },
          { label: 'Food Packaging', slug: 'food-packaging' },
          { label: 'Beverages & Wholesale Food', slug: 'beverages-wholesale-food' },
          { label: 'Hygiene & Safety Supplies', slug: 'catering-hygiene-safety' },
        ],
      },
    ],
  },

  // ── 11. Property ───────────────────────────────────────────────────────────
  {
    label: 'Property',
    slug: 'property',
    icon: Building2,
    iconColor: 'text-cyan-400',
    subcategories: [
      {
        label: 'Residential Property',
        slug: 'residential-property',
        items: [
          { label: 'Houses', slug: 'houses' },
          { label: 'Flats & Apartments', slug: 'flats-apartments' },
          { label: 'Bungalows', slug: 'bungalows' },
          { label: 'Cottages & Rural', slug: 'cottages-rural' },
          { label: 'New Build Homes', slug: 'new-build-homes' },
        ],
      },
      {
        label: 'Commercial Property',
        slug: 'commercial-property',
        items: [
          { label: 'Offices', slug: 'offices' },
          { label: 'Retail Premises', slug: 'retail-premises' },
          { label: 'Warehouses & Industrial', slug: 'warehouses-industrial' },
          { label: 'Hospitality & Leisure', slug: 'hospitality-leisure-property' },
          { label: 'Land', slug: 'land' },
        ],
      },
      {
        label: 'Property Wanted',
        slug: 'property-wanted',
        items: [
          { label: 'Residential Wanted', slug: 'residential-wanted' },
          { label: 'Commercial Wanted', slug: 'commercial-wanted' },
          { label: 'Investment Properties', slug: 'investment-properties-wanted' },
          { label: 'Land Wanted', slug: 'land-wanted' },
          { label: 'Any Condition', slug: 'property-any-condition' },
        ],
      },
    ],
  },

  // ── 12. Everything Else ────────────────────────────────────────────────────
  {
    label: 'Everything Else',
    slug: 'everything-else',
    icon: LayoutGrid,
    iconColor: 'text-indigo-400',
    subcategories: [
      {
        label: 'Baby & Nursery',
        slug: 'baby-nursery',
        items: [
          { label: 'Prams & Pushchairs', slug: 'prams-pushchairs' },
          { label: 'Baby Clothing', slug: 'baby-clothing-everything' },
          { label: 'Feeding', slug: 'feeding' },
          { label: 'Nursery Furniture', slug: 'nursery-furniture' },
          { label: 'Baby Monitors & Safety', slug: 'baby-monitors-safety' },
        ],
      },
      {
        label: 'Pet Supplies',
        slug: 'pet-supplies-everything',
        items: [
          { label: 'Dogs', slug: 'dog-supplies' },
          { label: 'Cats', slug: 'cat-supplies' },
          { label: 'Fish & Aquatics', slug: 'fish-aquatics' },
          { label: 'Small Animals', slug: 'small-animals' },
          { label: 'Birds', slug: 'bird-supplies' },
        ],
      },
      {
        label: 'Food & Drink',
        slug: 'food-drink',
        items: [
          { label: 'Confectionery & Sweets', slug: 'confectionery-sweets' },
          { label: 'Beverages', slug: 'beverages-food' },
          { label: 'Health Foods', slug: 'health-foods' },
          { label: 'World Foods', slug: 'world-foods' },
          { label: 'Wholesale Food Lots', slug: 'wholesale-food-lots' },
        ],
      },
      {
        label: 'Services',
        slug: 'services',
        items: [
          { label: 'Business Services', slug: 'business-services' },
          { label: 'Creative Services', slug: 'creative-services' },
          { label: 'Tutoring & Education', slug: 'tutoring-education' },
          { label: 'Events & Entertainment', slug: 'events-entertainment' },
          { label: 'Other Services', slug: 'other-services' },
        ],
      },
      {
        label: 'Clearance & Mixed Lots',
        slug: 'clearance-mixed-lots',
        items: [
          { label: 'Mixed Household Lots', slug: 'mixed-household-lots' },
          { label: 'Electrical Clearance', slug: 'electrical-clearance-lots' },
          { label: 'Clothing Clearance', slug: 'clothing-clearance-lots' },
          { label: 'Tools & DIY Clearance', slug: 'tools-diy-clearance' },
          { label: 'General Clearance', slug: 'general-clearance' },
        ],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find an L1 category by slug. */
export function getL1Category(slug: string): L1Category | undefined {
  return CATEGORY_TREE.find((cat) => cat.slug === slug);
}

/** Find an L2 subcategory within a given L1 category. */
export function getL2Category(l1Slug: string, l2Slug: string): L2Category | undefined {
  return getL1Category(l1Slug)?.subcategories.find((sub) => sub.slug === l2Slug);
}
