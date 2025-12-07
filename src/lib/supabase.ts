import { createClient } from '@supabase/supabase-js';
import { createMockSupabaseClient } from './mocks/supabase-mock';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Use mock client if credentials are missing
const useMock = !supabaseUrl || !supabaseAnonKey;

if (useMock) {
  console.warn('⚠️  Supabase credentials not found - using MOCK client for development');
  console.warn('📝 To use real Supabase, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
}

export const supabase = useMock 
  ? (createMockSupabaseClient() as unknown as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey);
