/**
 * Mock Supabase Client for Development
 * Used when real Supabase credentials are not available
 */

import type { User } from '@supabase/supabase-js';

// Mock data storage
const mockStorage = {
  users: new Map<string, Record<string, unknown>>(),
  products: new Map<string, Record<string, unknown>>(),
  orders: new Map<string, Record<string, unknown>>(),
  reviews: new Map<string, Record<string, unknown>>(),
  returns: new Map<string, Record<string, unknown>>(),
  disputes: new Map<string, Record<string, unknown>>(),
  shipments: new Map<string, Record<string, unknown>>(),
  categories: new Map<string, Record<string, unknown>>(),
  seller_profiles: new Map<string, Record<string, unknown>>(),
  seller_stores: new Map<string, Record<string, unknown>>(),
  recently_viewed: new Map<string, Record<string, unknown>>(),
  saved_searches: new Map<string, Record<string, unknown>>(),
  product_questions: new Map<string, Record<string, unknown>>(),
  order_items: new Map<string, Record<string, unknown>>(),
  conversations: new Map<string, Record<string, unknown>>(),
  messages: new Map<string, Record<string, unknown>>(),
  notifications: new Map<string, Record<string, unknown>>(),
  wishlists: new Map<string, Record<string, unknown>>(),
  carts: new Map<string, Record<string, unknown>>(),
  rfq_requests: new Map<string, Record<string, unknown>>(),
  shipping_methods: new Map<string, Record<string, unknown>>(),
  shipping_rates: new Map<string, Record<string, unknown>>(),
  product_shipping: new Map<string, Record<string, unknown>>(),
};

// Initialize with sample data
const initializeMockData = () => {
  // Sample categories - Main categories (bulk/wholesale B2B)
  const mainCategories = [
    { id: 'cat-mixed-lots',    name: 'Mixed Job Lots',    slug: 'mixed-job-lots' },
    { id: 'cat-clothing',      name: 'Clothing',          slug: 'clothing' },
    { id: 'cat-shoes',         name: 'Shoes',             slug: 'shoes' },
    { id: 'cat-jewellery',     name: 'Jewellery',         slug: 'jewellery' },
    { id: 'cat-accessories',   name: 'Accessories',       slug: 'accessories' },
    { id: 'cat-toys',          name: 'Toys',              slug: 'toys' },
    { id: 'cat-health-beauty', name: 'Health & Beauty',   slug: 'health-beauty' },
    { id: 'cat-pets',          name: 'Pets',              slug: 'pets' },
    { id: 'cat-memorabilia',   name: 'Memorabilia',       slug: 'memorabilia' },
    { id: 'cat-adult',         name: 'Adult',             slug: 'adult' },
    { id: 'cat-food-drink',    name: 'Food & Drink',      slug: 'food-drink' },
    { id: 'cat-office',        name: 'Office Supplies',   slug: 'office-supplies' },
    // B2C categories that match ShopPage's B2C_CATEGORIES
    { id: 'cat-electronics',   name: 'Electronics',       slug: 'electronics' },
    { id: 'cat-fashion',       name: 'Fashion',           slug: 'fashion' },
    { id: 'cat-home-garden',   name: 'Home & Garden',     slug: 'home-garden' },
    { id: 'cat-tools',         name: 'Tools',             slug: 'tools' },
    { id: 'cat-vehicles',      name: 'Vehicles',          slug: 'vehicles' },
    { id: 'cat-handmade',      name: 'Handmade',          slug: 'handmade' },
  ];

  mainCategories.forEach(cat => {
    mockStorage.categories.set(cat.id, { ...cat, parentId: null });
  });

  // B2B / bulk products (type: pallet, lot)
  mockStorage.products.set('product-1', {
    id: 'product-1',
    title: 'Electronics Pallet - Grade A',
    description: 'High quality electronics pallet with mixed items',
    price: 1500.00,
    type: 'pallet',
    condition: 'new',
    categoryId: 'cat-electronics',
    sellerId: 'seller-1',
    stockQuantity: 10,
    stockStatus: 'in_stock',
    rating: 4.5,
    reviewCount: 3,
    views: 50,
    isActive: true,
    isApproved: true,
    palletInfo: { palletCount: 1, itemsPerPallet: 50 },
    images: ['https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-2', {
    id: 'product-2',
    title: 'Men\'s Designer Clothing Mixed Lot',
    description: 'Excellent mixed lot of branded men\'s clothing',
    price: 850.00,
    type: 'lot',
    condition: 'new',
    categoryId: 'cat-clothing',
    sellerId: 'seller-1',
    stockQuantity: 3,
    stockStatus: 'low_stock',
    rating: 4.2,
    reviewCount: 1,
    views: 22,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // B2C products (type: product / retail / handmade) — visible on /shop
  mockStorage.products.set('product-3', {
    id: 'product-3',
    title: 'Refurbished iPhone 13 - 128GB',
    description: 'Professionally refurbished iPhone in excellent condition',
    price: 449.99,
    type: 'product',
    condition: 'refurbished',
    categoryId: 'cat-electronics',
    sellerId: 'seller-1',
    stockQuantity: 12,
    stockStatus: 'in_stock',
    rating: 4.8,
    reviewCount: 14,
    views: 120,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1592286927505-2c7e370d2a3e?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-4', {
    id: 'product-4',
    title: 'Handmade Ceramic Mug',
    description: 'Beautiful handmade ceramic mug, each one unique',
    price: 24.99,
    type: 'handmade',
    condition: 'new',
    categoryId: 'cat-handmade',
    sellerId: 'seller-1',
    stockQuantity: 8,
    stockStatus: 'in_stock',
    rating: 5.0,
    reviewCount: 7,
    views: 45,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-5', {
    id: 'product-5',
    title: 'Fashion Summer Dress',
    description: 'Lightweight summer dress, available in multiple sizes',
    price: 39.99,
    type: 'retail',
    condition: 'new',
    categoryId: 'cat-fashion',
    sellerId: 'seller-1',
    stockQuantity: 20,
    stockStatus: 'in_stock',
    rating: 4.3,
    reviewCount: 5,
    views: 63,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Amazon Returns lots (type: lot) — fills Amazon Returns section
  mockStorage.products.set('product-6', {
    id: 'product-6',
    title: 'Amazon Returns Pallet — Electronics Mixed',
    description: 'Unsorted Amazon customer returns, electronics and accessories',
    price: 499.00,
    type: 'lot',
    condition: 'used',
    categoryId: 'cat-electronics',
    sellerId: 'seller-1',
    stockQuantity: 5,
    stockStatus: 'in_stock',
    rating: 4.1,
    reviewCount: 8,
    views: 38,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-7', {
    id: 'product-7',
    title: 'Amazon Customer Returns — Household & Kitchen',
    description: 'Mixed household and kitchen returns pallet, wide variety of items',
    price: 320.00,
    type: 'lot',
    condition: 'used',
    categoryId: 'cat-home-garden',
    sellerId: 'seller-1',
    stockQuantity: 8,
    stockStatus: 'in_stock',
    rating: 3.9,
    reviewCount: 4,
    views: 29,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1556909114-44e3e9e0f46f?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-8', {
    id: 'product-8',
    title: 'Returns Lot — Small Appliances & Gadgets',
    description: 'Customer return small appliances, tested and listed individually',
    price: 280.00,
    type: 'lot',
    condition: 'used',
    categoryId: 'cat-electronics',
    sellerId: 'seller-1',
    stockQuantity: 6,
    stockStatus: 'in_stock',
    rating: 4.0,
    reviewCount: 3,
    views: 21,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-9', {
    id: 'product-9',
    title: 'Trade Returns — Tools & Garden Mixed Pallet',
    description: 'Trade quality tools and garden returns pallet, major retailer',
    price: 650.00,
    type: 'lot',
    condition: 'used',
    categoryId: 'cat-tools',
    sellerId: 'seller-1',
    stockQuantity: 3,
    stockStatus: 'low_stock',
    rating: 4.4,
    reviewCount: 6,
    views: 47,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Clearance products (type: clearance) — fills Clearance Deals section
  mockStorage.products.set('product-10', {
    id: 'product-10',
    title: 'Clearance — End of Line Kitchen Appliances',
    description: 'End-of-line kitchen appliances, mixed brands, full working order',
    price: 199.00,
    type: 'clearance',
    condition: 'new',
    categoryId: 'cat-home-garden',
    sellerId: 'seller-1',
    stockQuantity: 15,
    stockStatus: 'in_stock',
    discount: 40,
    rating: 4.2,
    reviewCount: 9,
    views: 55,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1556909114-44e3e9e0f46f?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-11', {
    id: 'product-11',
    title: 'Clearance Clothing — Mixed Sizes Job Lot',
    description: 'End of season clothing clearance, mixed brands and sizes',
    price: 145.00,
    type: 'clearance',
    condition: 'new',
    categoryId: 'cat-fashion',
    sellerId: 'seller-1',
    stockQuantity: 10,
    stockStatus: 'in_stock',
    discount: 55,
    rating: 4.0,
    reviewCount: 5,
    views: 42,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-12', {
    id: 'product-12',
    title: 'Clearance Electronics — Accessories & Cables',
    description: 'Brand new accessories and cables, end of line stock',
    price: 89.00,
    type: 'clearance',
    condition: 'new',
    categoryId: 'cat-electronics',
    sellerId: 'seller-1',
    stockQuantity: 30,
    stockStatus: 'in_stock',
    discount: 35,
    rating: 4.5,
    reviewCount: 12,
    views: 67,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-13', {
    id: 'product-13',
    title: 'Garden Clearance — Seasonal Furniture',
    description: 'End-of-season garden furniture and accessories clearance',
    price: 249.00,
    type: 'clearance',
    condition: 'new',
    categoryId: 'cat-home-garden',
    sellerId: 'seller-1',
    stockQuantity: 7,
    stockStatus: 'in_stock',
    discount: 50,
    rating: 4.1,
    reviewCount: 3,
    views: 33,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-14', {
    id: 'product-14',
    title: 'Clearance Flat Pack Furniture — Trade Lot',
    description: 'End-of-line flat pack furniture, full sets available',
    price: 380.00,
    type: 'clearance',
    condition: 'new',
    categoryId: 'cat-home-garden',
    sellerId: 'seller-1',
    stockQuantity: 4,
    stockStatus: 'low_stock',
    discount: 45,
    rating: 3.8,
    reviewCount: 2,
    views: 18,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Wholesale / pallet products — fills Wholesale & Bulk section
  mockStorage.products.set('product-15', {
    id: 'product-15',
    title: 'Wholesale Clothing — 500 Mixed Units',
    description: 'Wholesale branded clothing bundle, 500 mixed units, ideal for resellers',
    price: 2200.00,
    type: 'wholesale',
    condition: 'new',
    categoryId: 'cat-clothing',
    sellerId: 'seller-1',
    stockQuantity: 2,
    stockStatus: 'low_stock',
    rating: 4.6,
    reviewCount: 7,
    views: 88,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-16', {
    id: 'product-16',
    title: 'Trade Pallet — Mixed Homeware & Kitchen',
    description: 'Trade pallet of homeware and kitchen products, Grade A stock',
    price: 1100.00,
    type: 'pallet',
    condition: 'new',
    categoryId: 'cat-home-garden',
    sellerId: 'seller-1',
    stockQuantity: 5,
    stockStatus: 'in_stock',
    rating: 4.3,
    reviewCount: 4,
    views: 41,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-17', {
    id: 'product-17',
    title: 'Wholesale Health & Beauty — 200 Units',
    description: 'Wholesale health and beauty products, mixed branded stock',
    price: 750.00,
    type: 'wholesale',
    condition: 'new',
    categoryId: 'cat-health-beauty',
    sellerId: 'seller-1',
    stockQuantity: 8,
    stockStatus: 'in_stock',
    rating: 4.2,
    reviewCount: 5,
    views: 35,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockStorage.products.set('product-18', {
    id: 'product-18',
    title: 'Industrial Tools Pallet — Bulk Trade Buy',
    description: 'Full pallet of industrial and trade tools, excellent for trade buyers',
    price: 3200.00,
    type: 'pallet',
    condition: 'new',
    categoryId: 'cat-tools',
    sellerId: 'seller-1',
    stockQuantity: 3,
    stockStatus: 'low_stock',
    rating: 4.7,
    reviewCount: 9,
    views: 72,
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Mock seller profile
  mockStorage.seller_profiles.set('seller-1', {
    id: 'seller-1',
    userId: 'seller-1',
    businessName: 'Loadify Market Demo Store',
    isApproved: true,
    rating: 4.8,
    totalSales: 156,
    marketplaceRole: 'both',
    paymentBehaviour: 'good',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    users: {
      id: 'seller-1',
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      firstName: 'Demo',
      lastName: 'Seller',
    },
  });

  // Mock seller store
  mockStorage.seller_stores.set('seller-1', {
    id: 'seller-1',
    userId: 'seller-1',
    storeSlug: 'demo-store',
    storeName: 'Loadify Market Demo Store',
    createdAt: new Date().toISOString(),
  });

  // Sample RFQ requests for demo
  mockStorage.rfq_requests.set('rfq-1', {
    id: 'rfq-1',
    product_name: 'Electronics Pallet - Grade A',
    quantity: '5 pallets',
    destination_country: 'United Kingdom',
    estimated_budget: '£6,000 – £8,000',
    buyer_email: 'buyer1@example.com',
    message: 'Looking for regular supply of Grade A electronics pallets. Can you provide samples?',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  });

  mockStorage.rfq_requests.set('rfq-2', {
    id: 'rfq-2',
    product_name: 'Men\'s Designer Clothing Mixed Lot',
    quantity: '200 units',
    destination_country: 'Germany',
    estimated_budget: '£3,000 – £5,000',
    buyer_email: 'wholesale@boutique.de',
    message: '',
    status: 'replied',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  });

  mockStorage.rfq_requests.set('rfq-3', {
    id: 'rfq-3',
    product_name: 'Refurbished iPhone 13 - 128GB',
    quantity: '50 units',
    destination_country: 'France',
    estimated_budget: '£20,000 – £25,000',
    buyer_email: 'procurement@techretail.fr',
    message: 'We need Grade B or better. Please confirm availability and lead time.',
    status: 'pending',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Sample shipping methods & rates
  const shippingMethods = [
    { id: 'sm-rm48', name: 'Royal Mail Tracked 48', courier: 'Royal Mail',       tracking: true,  active: true },
    { id: 'sm-rm24', name: 'Royal Mail Tracked 24', courier: 'Royal Mail',       tracking: true,  active: true },
    { id: 'sm-evri', name: 'Evri Standard Delivery', courier: 'Evri',            tracking: true,  active: true },
    { id: 'sm-coll', name: 'Collection in Person',  courier: 'Local Collection', tracking: false, active: true },
  ];

  const shippingRates: Record<string, { price: number; min_weight: number | null; max_weight: number | null }> = {
    'sm-rm48': { price: 3.99, min_weight: 0, max_weight: 2 },
    'sm-rm24': { price: 4.99, min_weight: 0, max_weight: 2 },
    'sm-evri': { price: 2.99, min_weight: 0, max_weight: 2 },
    'sm-coll': { price: 0.00, min_weight: null, max_weight: null },
  };

  shippingMethods.forEach((method) => {
    const now = new Date().toISOString();
    const rateId = `sr-${method.id}`;
    const rate = shippingRates[method.id];
    const rateRecord = {
      id: rateId,
      method_id: method.id,
      currency: 'GBP',
      created_at: now,
      ...rate,
    };
    // Embed the rate directly so the mock doesn't need to handle nested joins
    mockStorage.shipping_methods.set(method.id, {
      ...method,
      created_at: now,
      shipping_rates: [rateRecord],
    });
    mockStorage.shipping_rates.set(rateId, rateRecord);
  });

  // Seed product_shipping associations for mock products (all products get all 4 methods)
  const mockProductIds = [
    'product-1', 'product-2', 'product-3', 'product-4', 'product-5',
    'product-6', 'product-7', 'product-8', 'product-9',
    'product-10', 'product-11', 'product-12', 'product-13', 'product-14',
    'product-15', 'product-16', 'product-17', 'product-18',
  ];
  const mockShippingMethodIds = ['sm-rm48', 'sm-rm24', 'sm-evri', 'sm-coll'];

  mockProductIds.forEach((productId) => {
    mockShippingMethodIds.forEach((methodId) => {
      const psId = `ps-${productId}-${methodId}`;
      const method = mockStorage.shipping_methods.get(methodId);
      mockStorage.product_shipping.set(psId, {
        id: psId,
        product_id: productId,
        method_id: methodId,
        dispatch_time: '1–2 working days',
        created_at: new Date().toISOString(),
        // Embed method data for mock join support
        shipping_methods: method,
      });
    });
  });
};

initializeMockData();

// Mock user for testing
const mockUser: User = {
  id: 'mock-user-id',
  email: 'test@loadifymarket.co.uk',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { role: 'buyer' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

// Helper to create a chainable query builder
const createQueryBuilder = (table: string, _columns?: string) => {
  const filters: Array<{ type: string; column: string; value: unknown; operator?: string }> = [];
  let orderBy: { column: string; ascending: boolean } | null = null;
  let limitCount: number | null = null;

  const applyFilters = (data: Record<string, unknown>[]) => {
    let filtered = [...data];
    
    for (const filter of filters) {
      if (filter.type === 'eq') {
        filtered = filtered.filter(item => item[filter.column] === filter.value);
      } else if (filter.type === 'in') {
        const values = filter.value as unknown[];
        filtered = filtered.filter(item => values.includes(item[filter.column]));
      } else if (filter.type === 'gte') {
        filtered = filtered.filter(item => {
          const itemValue = item[filter.column];
          const filterValue = filter.value;
          if (itemValue === null || itemValue === undefined) return false;
          // Handle string and number comparisons safely
          if (typeof itemValue === 'number' && typeof filterValue === 'number') {
            return itemValue >= filterValue;
          }
          if (typeof itemValue === 'string' && typeof filterValue === 'string') {
            return itemValue >= filterValue;
          }
          // Fallback: try comparison anyway (dates, etc.)
          return (itemValue as number | string) >= (filterValue as number | string);
        });
      } else if (filter.type === 'lte') {
        filtered = filtered.filter(item => {
          const itemValue = item[filter.column];
          const filterValue = filter.value;
          if (itemValue === null || itemValue === undefined) return false;
          // Handle string and number comparisons safely
          if (typeof itemValue === 'number' && typeof filterValue === 'number') {
            return itemValue <= filterValue;
          }
          if (typeof itemValue === 'string' && typeof filterValue === 'string') {
            return itemValue <= filterValue;
          }
          // Fallback: try comparison anyway (dates, etc.)
          return (itemValue as number | string) <= (filterValue as number | string);
        });
      } else if (filter.type === 'is') {
        filtered = filtered.filter(item => item[filter.column] === filter.value);
      } else if (filter.type === 'neq') {
        filtered = filtered.filter(item => item[filter.column] !== filter.value);
      } else if (filter.type === 'not') {
        // NOT IN is complex; skip filtering in mock (pass all records through)
        // Real Supabase `.not('col', 'in', '(val1,val2)')` would exclude matching rows
      } else if (filter.type === 'or') {
        // Simple OR: parse "col.eq.val,col2.eq.val2" style
        const conditions = (filter.value as string).split(',');
        filtered = filtered.filter(item =>
          conditions.some(cond => {
            const parts = cond.trim().split('.');
            if (parts.length >= 3) {
              const col = parts[0];
              const op = parts[1];
              const val = parts.slice(2).join('.').replace(/%/g, '');
              if (op === 'eq') return String(item[col]) === val;
              if (op === 'ilike') {
                const itemVal = String(item[col] ?? '').toLowerCase();
                return itemVal.includes(val.toLowerCase());
              }
            }
            return false;
          })
        );
      }
    }

    if (orderBy) {
      const currentOrderBy = orderBy;
      filtered.sort((a, b) => {
        const aVal = a[currentOrderBy.column];
        const bVal = b[currentOrderBy.column];
        
        // Handle null/undefined
        if (aVal === null || aVal === undefined) return currentOrderBy.ascending ? 1 : -1;
        if (bVal === null || bVal === undefined) return currentOrderBy.ascending ? -1 : 1;
        
        // Safe comparison for numbers and strings
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return currentOrderBy.ascending ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return currentOrderBy.ascending ? comparison : -comparison;
        }
        
        // Fallback for mixed types
        const aValComp = aVal as number | string;
        const bValComp = bVal as number | string;
        if (aValComp === bValComp) return 0;
        const comparison = aValComp < bValComp ? -1 : 1;
        return currentOrderBy.ascending ? comparison : -comparison;
      });
    }

    if (limitCount !== null) {
      filtered = filtered.slice(0, limitCount);
    }

    return filtered;
  };

  const builder: Record<string, unknown> = {
    eq: (column: string, value: unknown) => {
      filters.push({ type: 'eq', column, value });
      return builder;
    },
    in: (column: string, values: unknown[]) => {
      filters.push({ type: 'in', column, value: values });
      return builder;
    },
    gte: (column: string, value: unknown) => {
      filters.push({ type: 'gte', column, value });
      return builder;
    },
    lte: (column: string, value: unknown) => {
      filters.push({ type: 'lte', column, value });
      return builder;
    },
    is: (column: string, value: unknown) => {
      filters.push({ type: 'is', column, value });
      return builder;
    },
    neq: (column: string, value: unknown) => {
      filters.push({ type: 'neq', column, value });
      return builder;
    },
    not: (column: string, _operator: string, _value: unknown) => {
      filters.push({ type: 'not', column, value: null });
      return builder;
    },
    or: (query: string) => {
      filters.push({ type: 'or', column: '', value: query });
      return builder;
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      orderBy = { column, ascending: options?.ascending !== false };
      return builder;
    },
    limit: (count: number) => {
      limitCount = count;
      return builder;
    },
    single: async () => {
      const allData = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || []) as Record<string, unknown>[];
      const filtered = applyFilters(allData);
      console.log(`[MOCK] SELECT from ${table} - filters:`, filters, 'orderBy:', orderBy, 'limit:', limitCount);
      return { data: filtered[0] || null, error: null };
    },
    then: (resolve: (value: { data: Record<string, unknown>[] | null; error: unknown }) => void) => {
      const allData = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || []) as Record<string, unknown>[];
      const filtered = applyFilters(allData);
      console.log(`[MOCK] SELECT from ${table} - filters:`, filters, 'orderBy:', orderBy, 'limit:', limitCount);
      return Promise.resolve({ data: filtered, error: null }).then(resolve);
    },
  };

  // Add async data() method
  (builder as Record<string, unknown>).data = async () => {
    const allData = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || []) as Record<string, unknown>[];
    const filtered = applyFilters(allData);
    console.log(`[MOCK] SELECT from ${table} - filters:`, filters, 'orderBy:', orderBy, 'limit:', limitCount);
    return { data: filtered, error: null };
  };

  return builder;
};

export const createMockSupabaseClient = () => {
  return {
    auth: {
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        console.log('[MOCK] Signing in with:', email);
        return {
          data: { user: mockUser, session: { access_token: 'mock-token' } },
          error: null,
        };
      },
      signUp: async ({ email }: { email: string; password: string }) => {
        console.log('[MOCK] Signing up:', email);
        return {
          data: { user: mockUser, session: { access_token: 'mock-token' } },
          error: null,
        };
      },
      signOut: async () => {
        console.log('[MOCK] Signing out');
        return { error: null };
      },
      getSession: async () => {
        console.log('[MOCK] Getting session');
        return {
          data: { session: { access_token: 'mock-token', user: mockUser } },
          error: null,
        };
      },
      onAuthStateChange: () => {
        console.log('[MOCK] Auth state change listener registered');
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: (table: string) => ({
      select: (columns?: string) => createQueryBuilder(table, columns),
      insert: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        // Store immediately — supports both array and single-object inserts
        const items = Array.isArray(values) ? values : [values];
        const storedItems: Record<string, unknown>[] = [];
        for (const item of items) {
          const id = (item as Record<string, unknown>).id || `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const newItem = { ...item, id };
          mockStorage[table as keyof typeof mockStorage]?.set(id as string, newItem);
          storedItems.push(newItem);
          console.log(`[MOCK] INSERT into ${table}`, newItem);
        }
        const firstItem = storedItems[0] || null;
        return {
          select: () => ({
            single: async () => ({ data: firstItem, error: null }),
            then: (resolve: (value: { data: Record<string, unknown>[]; error: null }) => void) =>
              Promise.resolve({ data: storedItems, error: null }).then(resolve),
          }),
          then: (resolve: (value: { data: Record<string, unknown> | null; error: null }) => void) =>
            Promise.resolve({ data: firstItem, error: null }).then(resolve),
        };
      },
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => ({
          select: () => ({
            single: async () => {
              console.log(`[MOCK] UPDATE ${table} SET ... WHERE ${column} = ${value}`);
              const storage = mockStorage[table as keyof typeof mockStorage];
              if (storage) {
                for (const [key, item] of storage.entries()) {
                  if ((item as Record<string, unknown>)[column] === value) {
                    const updated = { ...item, ...values };
                    storage.set(key, updated);
                    return { data: updated, error: null };
                  }
                }
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
      // The delete().eq() result is a promise-like object that supports both
      // `await supabase.from(t).delete().eq(col, val)` (uses then/catch/finally)
      // and the legacy `.data()` callback pattern used elsewhere in the codebase.
      delete: () => ({
        eq: (column: string, value: unknown) => {
          const doDelete = () => {
            console.log(`[MOCK] DELETE from ${table} WHERE ${column} = ${value}`);
            const storage = mockStorage[table as keyof typeof mockStorage];
            if (storage) {
              for (const [key, item] of storage.entries()) {
                if ((item as Record<string, unknown>)[column] === value) {
                  storage.delete(key);
                }
              }
            }
            return { data: null as null, error: null as null };
          };
          const result = doDelete();
          const promise = Promise.resolve(result);
          return {
            data: async () => result,
            then: promise.then.bind(promise),
            catch: promise.catch.bind(promise),
            finally: promise.finally.bind(promise),
          };
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          console.log(`[MOCK] Upload to ${bucket}/${path}`);
          return { data: { path }, error: null };
        },
        getPublicUrl: (path: string) => {
          console.log(`[MOCK] Get public URL for ${path}`);
          return {
            data: { publicUrl: `https://mock-storage.localhost/${bucket}/${path}` },
          };
        },
      }),
    },
    rpc: async (fn: string, _params?: Record<string, unknown>) => {
      console.log(`[MOCK] RPC call: ${fn}`);
      return { data: null, error: null };
    },
  };
};
