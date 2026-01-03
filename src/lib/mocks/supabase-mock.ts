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
};

// User ID constants for mock data
const USER_IDS = {
  ANGELICA_TODA: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  DANIEL_PREDA: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  ADMIN: '99999999-9999-9999-9999-999999999999',
  TEST_USER: 'mock-user-id',
} as const;

// Initialize with sample data
const initializeMockData = () => {
  // Sample users (both Angelica and Daniel are sellers, which allows them to buy and sell)
  mockStorage.users.set(USER_IDS.ANGELICA_TODA, {
    id: USER_IDS.ANGELICA_TODA,
    email: 'angelicatoda@gmail.com',
    role: 'seller',  // Sellers can both buy and sell
    firstName: 'Angelica',
    lastName: 'Toda',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  });

  mockStorage.users.set(USER_IDS.DANIEL_PREDA, {
    id: USER_IDS.DANIEL_PREDA,
    email: 'dannyelbill@gmail.com',
    role: 'seller',  // Sellers can both buy and sell
    firstName: 'Daniel',
    lastName: 'Preda',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  });

  mockStorage.users.set(USER_IDS.ADMIN, {
    id: USER_IDS.ADMIN,
    email: 'loadifymarket.co.uk@gmail.com',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  });

  mockStorage.users.set(USER_IDS.TEST_USER, {
    id: USER_IDS.TEST_USER,
    email: 'test@loadifymarket.co.uk',
    role: 'buyer',
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  });

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
};

initializeMockData();

// Mock users for testing
const mockUsers: Record<string, User> = {
  'angelicatoda@gmail.com': {
    id: USER_IDS.ANGELICA_TODA,
    email: 'angelicatoda@gmail.com',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { role: 'seller' },  // Seller role allows both buying and selling
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
  'dannyelbill@gmail.com': {
    id: USER_IDS.DANIEL_PREDA,
    email: 'dannyelbill@gmail.com',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { role: 'seller' },  // Seller role allows both buying and selling
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
  'loadifymarket.co.uk@gmail.com': {
    id: USER_IDS.ADMIN,
    email: 'loadifymarket.co.uk@gmail.com',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { role: 'admin' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
  // Default test user
  'test@loadifymarket.co.uk': {
    id: USER_IDS.TEST_USER,
    email: 'test@loadifymarket.co.uk',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { role: 'buyer' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
};

// SECURITY NOTE: This mock client is for DEVELOPMENT ONLY
// In production, real Supabase authentication is used
// The hardcoded password here is acceptable only because:
// 1. It's never used in production (only when VITE_SUPABASE_URL is not set)
// 2. It's clearly marked as a mock/test credential
// 3. Real user passwords are managed securely by Supabase Auth
const MOCK_PASSWORD = 'Johnny2000$$'; // Development-only test password

export const createMockSupabaseClient = () => {
  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        console.log('[MOCK] Signing in with:', email);
        
        // Validate password against mock password (development only)
        if (password !== MOCK_PASSWORD) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
          };
        }
        
        // Get the mock user for this email
        const user = mockUsers[email] || mockUsers['test@loadifymarket.co.uk'];
        
        return {
          data: { user, session: { access_token: 'mock-token' } },
          error: null,
        };
      },
      signUp: async ({ email }: { email: string; password: string }) => {
        console.log('[MOCK] Signing up:', email);
        const user = mockUsers[email] || mockUsers['test@loadifymarket.co.uk'];
        return {
          data: { user, session: { access_token: 'mock-token' } },
          error: null,
        };
      },
      signOut: async () => {
        console.log('[MOCK] Signing out');
        return { error: null };
      },
      updateUser: async (updates: { email?: string; password?: string }) => {
        console.log('[MOCK] Updating user auth:', updates);
        // In mock mode, just return success
        // Email changes would normally require verification
        return {
          data: { user: mockUsers['test@loadifymarket.co.uk'] },
          error: null,
        };
      },
      getSession: async () => {
        console.log('[MOCK] Getting session');
        // Return default test user session
        const user = mockUsers['test@loadifymarket.co.uk'];
        return {
          data: { session: { access_token: 'mock-token', user } },
          error: null,
        };
      },
      onAuthStateChange: () => {
        console.log('[MOCK] Auth state change listener registered');
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: unknown) => ({
          single: async () => {
            console.log(`[MOCK] SELECT from ${table} WHERE ${column} = ${value}`);
            const data = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || [])
              .find((item) => (item as Record<string, unknown>)[column] === value);
            return { data, error: null };
          },
          data: async () => {
            console.log(`[MOCK] SELECT from ${table} WHERE ${column} = ${value}`);
            const data = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || [])
              .filter((item) => (item as Record<string, unknown>)[column] === value);
            return { data, error: null };
          },
        }),
        order: (column: string) => ({
          limit: (count: number) => ({
            data: async () => {
              console.log(`[MOCK] SELECT from ${table} ORDER BY ${column} LIMIT ${count}`);
              const data = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || [])
                .slice(0, count);
              return { data, error: null };
            },
          }),
          data: async () => {
            console.log(`[MOCK] SELECT from ${table} ORDER BY ${column}`);
            const data = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || []);
            return { data, error: null };
          },
        }),
        data: async () => {
          console.log(`[MOCK] SELECT ${columns || '*'} from ${table}`);
          const data = Array.from(mockStorage[table as keyof typeof mockStorage]?.values() || []);
          return { data, error: null };
        },
      }),
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
            data: { publicUrl: `https://mock-storage.loadifymarket.co.uk/${bucket}/${path}` },
          };
        },
      }),
    },
  };
};
