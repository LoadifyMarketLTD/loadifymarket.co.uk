export interface GlobalCategoryNode {
  name: string;
  slug: string;
  children?: GlobalCategoryNode[];
}

export const GLOBAL_CATEGORY_TREE: readonly GlobalCategoryNode[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    children: [
      {
        name: 'Mobile Phones',
        slug: 'mobile-phones',
        children: [
          { name: 'Smartphones', slug: 'smartphones' },
          { name: 'Feature Phones', slug: 'feature-phones' },
          { name: 'Refurbished Phones', slug: 'refurbished-phones' },
        ],
      },
      {
        name: 'Phone Accessories',
        slug: 'phone-accessories',
        children: [
          { name: 'Cases', slug: 'cases' },
          { name: 'Chargers', slug: 'chargers' },
          { name: 'Screen Protectors', slug: 'screen-protectors' },
          { name: 'Power Banks', slug: 'power-banks' },
        ],
      },
      {
        name: 'TVs & Home Entertainment',
        slug: 'tvs-home-entertainment',
        children: [
          { name: 'Televisions', slug: 'televisions' },
          { name: 'Smart TVs', slug: 'smart-tvs' },
          { name: 'TV Accessories', slug: 'tv-accessories' },
          { name: 'Soundbars', slug: 'soundbars' },
        ],
      },
      {
        name: 'Audio',
        slug: 'audio',
        children: [
          { name: 'Headphones', slug: 'headphones' },
          { name: 'Earbuds', slug: 'earbuds' },
          { name: 'Speakers', slug: 'speakers' },
        ],
      },
      {
        name: 'Computers & Tablets',
        slug: 'computers-tablets',
        children: [
          { name: 'Laptops', slug: 'laptops' },
          { name: 'Desktop PCs', slug: 'desktop-pcs' },
          { name: 'Tablets', slug: 'tablets' },
          { name: 'Monitors', slug: 'monitors' },
        ],
      },
      {
        name: 'Gaming',
        slug: 'gaming',
        children: [
          { name: 'Consoles', slug: 'consoles' },
          { name: 'Games', slug: 'games' },
          { name: 'Controllers', slug: 'controllers' },
        ],
      },
    ],
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    children: [
      {
        name: 'Furniture',
        slug: 'furniture',
        children: [
          { name: 'Living Room Furniture', slug: 'living-room-furniture' },
          { name: 'Bedroom Furniture', slug: 'bedroom-furniture' },
          { name: 'Office Furniture', slug: 'home-office-furniture' },
        ],
      },
      {
        name: 'Kitchen & Dining',
        slug: 'kitchen-dining',
        children: [
          { name: 'Cookware', slug: 'cookware' },
          { name: 'Tableware', slug: 'tableware' },
          { name: 'Small Appliances', slug: 'small-appliances' },
        ],
      },
      {
        name: 'Garden & Outdoor',
        slug: 'garden-outdoor',
        children: [
          { name: 'Garden Tools', slug: 'garden-tools' },
          { name: 'Outdoor Furniture', slug: 'outdoor-furniture' },
          { name: 'Plants & Seeds', slug: 'plants-seeds' },
        ],
      },
    ],
  },
  {
    name: 'Clothing & Fashion',
    slug: 'clothing-fashion',
    children: [
      {
        name: 'Men\'s Clothing',
        slug: 'mens-clothing',
        children: [
          { name: 'Tops', slug: 'mens-tops' },
          { name: 'Bottoms', slug: 'mens-bottoms' },
          { name: 'Outerwear', slug: 'mens-outerwear' },
        ],
      },
      {
        name: 'Women\'s Clothing',
        slug: 'womens-clothing',
        children: [
          { name: 'Dresses', slug: 'dresses' },
          { name: 'Tops', slug: 'womens-tops' },
          { name: 'Outerwear', slug: 'womens-outerwear' },
        ],
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        children: [
          { name: 'Trainers', slug: 'trainers' },
          { name: 'Boots', slug: 'boots' },
          { name: 'Sandals', slug: 'sandals' },
        ],
      },
    ],
  },
  {
    name: 'Toys & Games',
    slug: 'toys-games',
    children: [
      {
        name: 'Action Toys',
        slug: 'action-toys',
        children: [
          { name: 'Action Figures', slug: 'action-figures' },
          { name: 'RC Toys', slug: 'rc-toys' },
        ],
      },
      {
        name: 'Educational Toys',
        slug: 'educational-toys',
        children: [
          { name: 'STEM Toys', slug: 'stem-toys' },
          { name: 'Puzzles', slug: 'puzzles' },
        ],
      },
      {
        name: 'Board Games',
        slug: 'board-games',
        children: [
          { name: 'Family Games', slug: 'family-games' },
          { name: 'Strategy Games', slug: 'strategy-games' },
        ],
      },
    ],
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    children: [
      {
        name: 'Gym & Training',
        slug: 'gym-training',
        children: [
          { name: 'Cardio Equipment', slug: 'cardio-equipment' },
          { name: 'Weights', slug: 'weights' },
        ],
      },
      {
        name: 'Team Sports',
        slug: 'team-sports',
        children: [
          { name: 'Football', slug: 'football' },
          { name: 'Basketball', slug: 'basketball' },
        ],
      },
      {
        name: 'Skating',
        slug: 'skating',
        children: [
          { name: 'Skates', slug: 'skates' },
          { name: 'Protective Gear', slug: 'protective-gear' },
        ],
      },
    ],
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    children: [
      {
        name: 'Car Parts',
        slug: 'car-parts',
        children: [
          { name: 'Engine Parts', slug: 'engine-parts' },
          { name: 'Brakes & Suspension', slug: 'brakes-suspension' },
        ],
      },
      {
        name: 'Car Care',
        slug: 'car-care',
        children: [
          { name: 'Cleaning Kits', slug: 'cleaning-kits' },
          { name: 'Oils & Fluids', slug: 'oils-fluids' },
        ],
      },
      {
        name: 'Tyres & Wheels',
        slug: 'tyres-wheels',
        children: [
          { name: 'Tyres', slug: 'tyres' },
          { name: 'Alloy Wheels', slug: 'alloy-wheels' },
        ],
      },
    ],
  },
  {
    name: 'Health & Beauty',
    slug: 'health-beauty',
    children: [
      {
        name: 'Skincare',
        slug: 'skincare',
        children: [
          { name: 'Cleansers', slug: 'cleansers' },
          { name: 'Moisturisers', slug: 'moisturisers' },
        ],
      },
      {
        name: 'Haircare',
        slug: 'haircare',
        children: [
          { name: 'Shampoo & Conditioner', slug: 'shampoo-conditioner' },
          { name: 'Styling', slug: 'styling' },
        ],
      },
      {
        name: 'Personal Care',
        slug: 'personal-care',
        children: [
          { name: 'Oral Care', slug: 'oral-care' },
          { name: 'Fragrances', slug: 'fragrances' },
        ],
      },
    ],
  },
  {
    name: 'Pets',
    slug: 'pets',
    children: [
      {
        name: 'Dog Supplies',
        slug: 'dog-supplies',
        children: [
          { name: 'Dog Food', slug: 'dog-food' },
          { name: 'Leads & Collars', slug: 'leads-collars' },
        ],
      },
      {
        name: 'Cat Supplies',
        slug: 'cat-supplies',
        children: [
          { name: 'Cat Food', slug: 'cat-food' },
          { name: 'Litter', slug: 'litter' },
        ],
      },
      {
        name: 'Aquatics',
        slug: 'aquatics',
        children: [
          { name: 'Aquariums', slug: 'aquariums' },
          { name: 'Filters', slug: 'aquarium-filters' },
        ],
      },
    ],
  },
  {
    name: 'Food & Drink',
    slug: 'food-drink',
    children: [
      {
        name: 'Pantry',
        slug: 'pantry',
        children: [
          { name: 'Pasta & Rice', slug: 'pasta-rice' },
          { name: 'Canned Food', slug: 'canned-food' },
        ],
      },
      {
        name: 'Snacks',
        slug: 'snacks',
        children: [
          { name: 'Crisps', slug: 'crisps' },
          { name: 'Chocolate', slug: 'chocolate' },
        ],
      },
      {
        name: 'Beverages',
        slug: 'beverages',
        children: [
          { name: 'Soft Drinks', slug: 'soft-drinks' },
          { name: 'Tea & Coffee', slug: 'tea-coffee' },
        ],
      },
    ],
  },
  {
    name: 'Office & Business',
    slug: 'office-business',
    children: [
      {
        name: 'Office Supplies',
        slug: 'office-supplies',
        children: [
          { name: 'Paper', slug: 'paper' },
          { name: 'Writing', slug: 'writing' },
        ],
      },
      {
        name: 'Office Furniture',
        slug: 'office-furniture',
        children: [
          { name: 'Desks', slug: 'desks' },
          { name: 'Office Chairs', slug: 'office-chairs' },
        ],
      },
      {
        name: 'Tech & Printing',
        slug: 'tech-printing',
        children: [
          { name: 'Printers', slug: 'printers' },
          { name: 'Ink & Toner', slug: 'ink-toner' },
        ],
      },
    ],
  },
];

export const TOP_LEVEL_CATEGORY_NAMES = GLOBAL_CATEGORY_TREE.map((c) => c.name);

export interface DynamicCategoryFilter {
  key: string;
  label: string;
  options: string[];
}

export const DYNAMIC_FILTERS_BY_CATEGORY: Record<string, DynamicCategoryFilter[]> = {
  'mobile-phones': [
    { key: 'brand', label: 'Brand', options: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Other'] },
    { key: 'storage', label: 'Storage', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'condition', label: 'Condition', options: ['new', 'used', 'refurbished'] },
  ],
  skates: [
    { key: 'size', label: 'Size', options: ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9'] },
    { key: 'type', label: 'Type', options: ['Inline', 'Quad', 'Ice'] },
    { key: 'condition', label: 'Condition', options: ['new', 'used', 'refurbished'] },
  ],
  televisions: [
    { key: 'brand', label: 'Brand', options: ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Other'] },
    { key: 'size', label: 'Size', options: ['32"', '43"', '50"', '55"', '65"', '75"+'] },
    { key: 'smart_type', label: 'Smart Type', options: ['Android TV', 'Tizen', 'webOS', 'Roku', 'Non-Smart'] },
  ],
};
