import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for backend operations
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Verify user authentication from Authorization header
export async function verifyAuth(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, userId: null };
  }

  const token = authHeader.substring(7);
  const supabase = createSupabaseAdmin();

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authenticated: false, userId: null };
    }

    return { authenticated: true, userId: user.id };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { authenticated: false, userId: null };
  }
}
