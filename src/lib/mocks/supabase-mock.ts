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
};

// Initialize with sample data
const initializeMockData = () => {
  // Sample categories - Main categories
  const mainCategories = [
    { id: 'cat-mixed-lots', name: 'Mixed Job Lots', slug: 'mixed-job-lots' },
    { id: 'cat-clothing', name: 'Clothing', slug: 'clothing' },
    { id: 'cat-shoes', name: 'Shoes', slug: 'shoes' },
    { id: 'cat-jewellery', name: 'Jewellery', slug: 'jewellery' },
    { id: 'cat-electronics', name: 'Media & Electronics', slug: 'media-electronics' },
    { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
    { id: 'cat-toys', name: 'Toys', slug: 'toys' },
    { id: 'cat-health-beauty', name: 'Health & Beauty', slug: 'health-beauty' },
    { id: 'cat-pets', name: 'Pets', slug: 'pets' },
    { id: 'cat-memorabilia', name: 'Memorabilia', slug: 'memorabilia' },
    { id: 'cat-adult', name: 'Adult', slug: 'adult' },
    { id: 'cat-food-drink', name: 'Food & Drink', slug: 'food-drink' },
    { id: 'cat-office', name: 'Office Supplies', slug: 'office-supplies' },
  ];

  mainCategories.forEach(cat => {
    mockStorage.categories.set(cat.id, { ...cat, parentId: null });
  });

  // Sample products
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
    isActive: true,
    isApproved: true,
    palletInfo: { palletCount: 1, itemsPerPallet: 50 },
    images: ['https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800'],
    createdAt: new Date().toISOString(),
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
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800'],
    createdAt: new Date().toISOString(),
  });

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
    isActive: true,
    isApproved: true,
    images: ['https://images.unsplash.com/photo-1592286927505-2c7e370d2a3e?w=800'],
    createdAt: new Date().toISOString(),
  });

  // Mock seller profile
  mockStorage.seller_profiles.set('seller-1', {
    id: 'seller-1',
    userId: 'seller-1',
    businessName: 'XDrive Logistics Market Demo Store',
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
    storeName: 'XDrive Logistics Market Demo Store',
    createdAt: new Date().toISOString(),
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
      insert: (values: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            console.log(`[MOCK] INSERT into ${table}`, values);
            const id = values.id || `${table}-${Date.now()}`;
            const newItem = { ...values, id };
            mockStorage[table as keyof typeof mockStorage]?.set(id as string, newItem);
            return { data: newItem, error: null };
          },
        }),
      }),
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
      delete: () => ({
        eq: (column: string, value: unknown) => ({
          data: async () => {
            console.log(`[MOCK] DELETE from ${table} WHERE ${column} = ${value}`);
            const storage = mockStorage[table as keyof typeof mockStorage];
            if (storage) {
              for (const [key, item] of storage.entries()) {
                if ((item as Record<string, unknown>)[column] === value) {
                  storage.delete(key);
                }
              }
            }
            return { data: null, error: null };
          },
        }),
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
