import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * /.netlify/functions/admin-sellers
 *
 * Canonical service-role endpoint backing the Admin > Sellers page.
 *
 * Why this exists:
 *   The admin page previously queried `users` and `seller_profiles` directly
 *   from the browser using the anon key. Those tables are guarded by RLS that
 *   depends on `is_admin_or_owner()` — which in turn reads `public.users.role`.
 *   If the signed-in admin's public.users row is missing, stale, or stored with
 *   a different role value, RLS silently filters the result to zero rows and
 *   the page shows "No sellers found" even when sellers exist.
 *
 *   This endpoint moves the read/write to the server, verifies the caller via
 *   their Supabase JWT, and uses the service role client so the query is never
 *   filtered by RLS. Admin authorisation is granted when EITHER:
 *     1. The caller's public.users row has role in ('admin', 'owner'), OR
 *     2. The caller's authenticated email equals ADMIN_NOTIFICATION_EMAIL.
 *   The email fallback makes the endpoint self-healing for the owner account
 *   even if the public.users row is out of sync with the role constant.
 *
 * Supported operations (JSON body):
 *   GET                             → list sellers
 *   POST { op: 'list' }             → list sellers (same as GET)
 *   POST { op: 'suspend', userId }  → set sellerStatus='suspended'
 *   POST { op: 'reactivate', userId } → set sellerStatus='submitted'
 *     (auto-activation will re-evaluate and promote to 'active' when ready)
 *
 * Required env vars:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

type AdminCaller = { id: string; email: string; role: string | null };

async function authenticateAdmin(
  event: HandlerEvent,
  admin: SupabaseClient,
): Promise<AdminCaller | null> {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const authUser = data.user;

  const { data: row } = await admin
    .from('users')
    .select('id, email, role')
    .eq('id', authUser.id)
    .single<{ id: string; email: string; role: string }>();

  const email = (row?.email ?? authUser.email ?? '').toLowerCase().trim();
  const role = row?.role ?? null;

  const adminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL ?? '').toLowerCase().trim();
  const isDbAdmin = role === 'admin' || role === 'owner';
  const isEmailAdmin = adminEmail !== '' && email === adminEmail;

  if (!isDbAdmin && !isEmailAdmin) return null;
  return { id: authUser.id, email, role };
}

interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string | null;
}

interface SellerProfileRow {
  userId: string;
  sellerStatus: 'draft' | 'submitted' | 'active' | 'suspended' | null;
  stripeConnectStatus: string | null;
  storeName: string | null;
  businessName: string | null;
  fullName: string | null;
}

async function listSellers(admin: SupabaseClient) {
  const { data: sellerUsers, error: usersError } = await admin
    .from('users')
    .select('id, email, firstName, lastName, createdAt')
    .eq('role', 'seller')
    .order('createdAt', { ascending: false })
    .returns<UserRow[]>();

  if (usersError) {
    throw new Error(`users query failed: ${usersError.message}`);
  }

  const userIds = (sellerUsers ?? []).map((u) => u.id);
  let profiles: SellerProfileRow[] = [];
  if (userIds.length > 0) {
    const { data, error: profilesError } = await admin
      .from('seller_profiles')
      .select('userId, sellerStatus, stripeConnectStatus, storeName, businessName, fullName')
      .in('userId', userIds)
      .returns<SellerProfileRow[]>();
    if (profilesError) {
      throw new Error(`seller_profiles query failed: ${profilesError.message}`);
    }
    profiles = data ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return (sellerUsers ?? []).map((u) => {
    const p = profileMap.get(u.id);
    const fullName = p?.fullName?.trim();
    const stitchedName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return {
      userId: u.id,
      name: fullName || stitchedName || u.email,
      email: u.email,
      company: p?.storeName || p?.businessName || '—',
      date: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '—',
      sellerStatus: (p?.sellerStatus ?? 'draft') as 'draft' | 'submitted' | 'active' | 'suspended',
      stripeConnectStatus: p?.stripeConnectStatus ?? null,
    };
  });
}

async function updateSellerStatus(
  admin: SupabaseClient,
  userId: string,
  sellerStatus: 'submitted' | 'suspended',
) {
  // Ensure the row exists before updating. The DB trigger trg_new_user_profile
  // creates it on user insert, but we upsert defensively to cover orphan cases.
  const { error: upsertError } = await admin
    .from('seller_profiles')
    .upsert({ userId, sellerStatus }, { onConflict: 'userId' });
  if (upsertError) {
    throw new Error(`seller_profiles update failed: ${upsertError.message}`);
  }
}

export const handler: Handler = async (event) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('admin-sellers: missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server misconfiguration — contact platform admin' }),
    };
  }

  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const caller = await authenticateAdmin(event, admin);
  if (!caller) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body: { op?: string; userId?: string } = {};
  if (event.httpMethod === 'POST' && event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
  }

  const op = (body.op ?? 'list').trim();

  try {
    if (op === 'list' || event.httpMethod === 'GET') {
      const sellers = await listSellers(admin);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellers }),
      };
    }

    if (op === 'suspend' || op === 'reactivate') {
      const userId = (body.userId ?? '').trim();
      if (!userId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
      }
      const nextStatus = op === 'suspend' ? 'suspended' : 'submitted';
      await updateSellerStatus(admin, userId, nextStatus);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, userId, sellerStatus: nextStatus }),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: `Unknown op: ${op}` }) };
  } catch (err) {
    console.error('admin-sellers: unhandled error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal server error',
      }),
    };
  }
};
