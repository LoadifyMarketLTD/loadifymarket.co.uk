import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from './mocks/supabase-mock';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const hasCreds = Boolean(supabaseUrl && supabaseAnonKey);
const isDev = import.meta.env.DEV;

let client: SupabaseClient;

if (!hasCreds) {
  if (isDev) {
    // In development, fall back to mock so local work doesn't require a live Supabase project.
    console.warn('⚠️  Supabase credentials not found - using MOCK client (DEV only)');
    console.warn('📝 Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env to use real Supabase');
    client = createMockSupabaseClient() as unknown as SupabaseClient;
  } else {
    // In production, missing credentials are a fatal misconfiguration — fail fast.
    throw new Error(
      '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in production. ' +
      'The mock client is not available outside of development builds.'
    );
  }
} else {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
