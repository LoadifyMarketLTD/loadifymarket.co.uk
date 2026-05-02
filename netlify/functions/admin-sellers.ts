import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function authenticateAdmin(event: any, admin: any) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401 };
  }

  const token = authHeader.substring(7).trim();

  const { data, error } = await admin.auth.getUser(token);

  if (error || !data?.user) {
    return { ok: false, status: 401 };
  }

  const authUser = data.user;
  const authEmail = (authUser.email || '').toLowerCase().trim();

  console.log('AUTH USER EMAIL:', authEmail);

  if (!authEmail) {
    return { ok: false, status: 401 };
  }

  // 🔥 FIXUL REAL AICI (EMAIL, NU ID)
  const { data: dbUser, error: dbError } = await admin
    .from('users')
    .select('role')
    .eq('email', authEmail)
    .maybeSingle();

  console.log('DB USER ROLE:', dbUser?.role ?? null);

  if (dbError || !dbUser || dbUser.role !== 'admin') {
    return { ok: false, status: 403 };
  }

  return {
    ok: true,
    caller: {
      id: authUser.id,
      email: authEmail,
      role: dbUser.role,
    },
  };
}

export const handler: Handler = async (event) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Server config error' }),
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateAdmin(event, admin);

  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    // 🔥 LIST SELLERS
    const { data: users, error } = await admin
      .from('users')
      .select('id, email, firstName, lastName, createdAt')
      .eq('role', 'seller');

    if (error) throw error;

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({ sellers: users || [] }),
    };
  } catch (err: any) {
    console.error('ADMIN SELLERS ERROR:', err);

    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
