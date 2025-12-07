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

// Initialize with sample data
const initializeMockData = () => {
  // Sample categories
  mockStorage.categories.set('electronics', {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    parentId: null,
  });
  
  mockStorage.categories.set('pallets', {
    id: 'pallets',
    name: 'Pallets',
    slug: 'pallets',
    parentId: null,
  });

  // Sample products
  mockStorage.products.set('product-1', {
    id: 'product-1',
    title: 'Electronics Pallet - Grade A',
    description: 'High quality electronics pallet with mixed items',
    price: 1500.00,
    type: 'pallet',
    condition: 'new',
    categoryId: 'electronics',
    sellerId: 'seller-1',
    stock: 10,
    isApproved: true,
    palletCount: 1,
    itemsPerPallet: 50,
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
