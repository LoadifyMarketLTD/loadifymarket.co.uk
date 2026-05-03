import { Handler, HandlerEvent } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthOk {
  ok: true;
  caller: { id: string; email: string; role: string };
}
interface AuthFail {
  ok: false;
  status: number;
}
type AuthResult = AuthOk | AuthFail;

interface SellerRow {
  userId: string;
  name: string;
  email: string;
  company: string;
  date: string;
  sellerStatus: 'draft' | 'submitted' | 'active' | 'suspended';
  stripeConnectStatus: string | null;
}

// ── Auth helper ────────────────────────────────────────────────────────────────

async function authenticateAdmin(event: HandlerEvent, admin: SupabaseClient): Promise<AuthResult> {
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

  if (!authEmail) {
    return { ok: false, status: 401 };
  }

  // Fast-path: check app_metadata.role from the JWT claim (set by migration 340
  // and kept in sync by the auth trigger).  This avoids an extra DB round-trip
  // and works correctly even when the public.users row has a case mismatch on
  // the email column.
  const jwtRole = (authUser.app_metadata as Record<string, unknown> | undefined)?.role;
  if (jwtRole === 'admin') {
    return {
      ok: true,
      caller: { id: authUser.id, email: authEmail, role: 'admin' },
    };
  }

  // Fallback: look up by user ID (not email) for robustness against email
  // casing differences between auth.users and public.users.
  const { data: dbUser, error: dbError } = await admin
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle();

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Send an internal server-to-server email via the send-email function. */
async function sendInternalEmail(
  appUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET
      ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET }
      : {}),
  };
  await fetch(`${appUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify(payload),
  });
}

/** Build a display name from a user row, falling back to email. */
function sellerDisplayName(user: { firstName?: string | null; lastName?: string | null; email: string }): string {
  return [`${user.firstName ?? ''}`, `${user.lastName ?? ''}`].filter(Boolean).join(' ') || user.email;
}

/** 48 hours in milliseconds — threshold for onboarding reminder eligibility. */
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

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

  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');

  try {
    // ── GET — list all sellers ────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const { data: rows, error } = await admin
        .from('users')
        .select(`
          id,
          email,
          firstName,
          lastName,
          createdAt,
          seller_profiles (
            sellerStatus,
            stripeConnectStatus,
            storeName,
            businessName
          )
        `)
        .eq('role', 'seller')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const sellers: SellerRow[] = (rows || []).map((u) => {
        const sp = Array.isArray(u.seller_profiles)
          ? u.seller_profiles[0]
          : u.seller_profiles;
        const firstName = (u?.['firstName'] as string | null) ?? '';
        const lastName = (u?.['lastName'] as string | null) ?? '';
        const name = `${firstName} ${lastName}`.trim() || u.email;
        const company =
          (sp?.storeName as string | null) ||
          (sp?.businessName as string | null) ||
          '—';
        return {
          userId: u.id as string,
          name,
          email: u.email as string,
          company,
          date: formatDate(u.createdAt as string | null),
          sellerStatus: ((sp?.sellerStatus as string) || 'draft') as SellerRow['sellerStatus'],
          stripeConnectStatus: (sp?.stripeConnectStatus as string | null) ?? null,
        };
      });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ sellers }),
      };
    }

    // ── POST — operations ─────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(event.body || '{}') as Record<string, unknown>;
      } catch {
        return {
          statusCode: 400,
          headers: JSON_HEADERS,
          body: JSON.stringify({ error: 'Invalid request body' }),
        };
      }

      const op = body.op as string | undefined;
      const userId = body.userId as string | undefined;

      // ── get_seller_detail ──────────────────────────────────────────────────
      if (op === 'get_seller_detail') {
        if (!userId) {
          return {
            statusCode: 400,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'userId required' }),
          };
        }

        const [userRes, spRes, listingsCountRes, ordersCountRes] = await Promise.all([
          admin.from('users').select('id, email, firstName, lastName, createdAt, phone, role, isActive').eq('id', userId).maybeSingle(),
          admin.from('seller_profiles').select('*').eq('userId', userId).maybeSingle(),
          admin.from('products').select('id').eq('sellerId', userId),
          admin.from('orders').select('id', { count: 'exact', head: true }).eq('sellerId', userId),
        ]);

        if (userRes.error) throw userRes.error;

        // Count reports on the seller's products
        const productIds = (listingsCountRes.data || []).map((p: { id: string }) => p.id);
        let reportsCount = 0;
        if (productIds.length > 0) {
          const { count } = await admin
            .from('reported_listings')
            .select('id', { count: 'exact', head: true })
            .in('productId', productIds);
          reportsCount = count ?? 0;
        }
        const u = userRes.data;
        const sp = spRes.data;

        return {
          statusCode: 200,
          headers: JSON_HEADERS,
          body: JSON.stringify({
            detail: {
              phone: (u?.phone as string | null) ?? null,
              role: (u?.role as string) ?? 'seller',
              isActive: (u?.isActive as boolean) ?? true,
              createdAt: (u?.createdAt as string | null) ?? null,
              stripeAccountId: (sp?.stripeAccountId as string | null) ?? null,
              storeName: (sp?.storeName as string | null) ?? null,
              businessName: (sp?.businessName as string | null) ?? null,
              businessAddress: (sp?.businessAddress as Record<string, string> | null) ?? null,
              contactPhone: (sp?.contactPhone as string | null) ?? null,
              sellerRating: (sp?.rating as number | null) ?? null,
              totalSales: (sp?.totalSales as number | null) ?? null,
              listingsCount: productIds.length,
              ordersCount: ordersCountRes.count ?? 0,
              reportsCount,
            },
          }),
        };
      }

      // ── approve ────────────────────────────────────────────────────────────
      if (op === 'approve') {
        if (!userId) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
        // Set isApproved so the activation pipeline can promote the seller.
        const { error } = await admin.from('seller_profiles').update({ isApproved: true }).eq('userId', userId);
        if (error) throw error;
        // Re-run the activation pipeline so the seller becomes 'active'
        // immediately if Stripe and profile requirements are also met, rather
        // than waiting for the next Stripe webhook or connect-status poll.
        let sellerStatus = 'submitted';
        try {
          const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
          const result = await tryAutoActivateSeller(admin, userId);
          if (result) sellerStatus = result.sellerStatus;
        } catch (activationErr) {
          console.warn('admin-sellers approve: activation pipeline failed (non-fatal):', activationErr);
        }
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true, sellerStatus }) };
      }

      // ── reject ─────────────────────────────────────────────────────────────
      if (op === 'reject') {
        if (!userId) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
        const { error } = await admin.from('seller_profiles').update({ sellerStatus: 'suspended' }).eq('userId', userId);
        if (error) throw error;
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true }) };
      }

      // ── suspend ────────────────────────────────────────────────────────────
      if (op === 'suspend') {
        if (!userId) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
        const { error } = await admin.from('seller_profiles').update({ sellerStatus: 'suspended' }).eq('userId', userId);
        if (error) throw error;
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ sellerStatus: 'suspended' }) };
      }

      // ── reactivate ─────────────────────────────────────────────────────────
      if (op === 'reactivate') {
        if (!userId) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
        const { error } = await admin.from('seller_profiles').update({ sellerStatus: 'submitted' }).eq('userId', userId);
        if (error) throw error;
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ sellerStatus: 'submitted' }) };
      }

      // ── force_activate ─────────────────────────────────────────────────────
      if (op === 'force_activate') {
        if (!userId) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
        const { error } = await admin.from('seller_profiles').update({ sellerStatus: 'active', isApproved: true }).eq('userId', userId);
        if (error) throw error;
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true }) };
      }

      // ── warn ───────────────────────────────────────────────────────────────
      if (op === 'warn') {
        if (!userId) return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'userId required' }) };
        const { data: u, error: userError } = await admin
          .from('users')
          .select('email, firstName, lastName')
          .eq('id', userId)
          .maybeSingle();
        if (userError) throw userError;
        if (u?.email) {
          const name = sellerDisplayName({ firstName: u.firstName as string | null, lastName: u.lastName as string | null, email: u.email as string });
          await sendInternalEmail(appUrl, {
            to: u.email as string,
            subject: 'Important notice about your Loadify Market account',
            template: 'admin_seller_verification',
            data: { sellerName: name, message: 'You have received a warning regarding your account. Please review the platform guidelines.' },
          });
        }
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ success: true }) };
      }

      // ── onboarding_reminder ────────────────────────────────────────────────
      if (op === 'onboarding_reminder') {
        const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString();
        const { data: incomplete, error: qErr } = await admin
          .from('users')
          .select('id, email, firstName, lastName')
          .eq('role', 'seller')
          .or('onboardingCompleted.eq.false,onboardingCompleted.is.null')
          .lte('createdAt', cutoff);
        if (qErr) throw qErr;
        const sellers = incomplete || [];
        const results = await Promise.allSettled(
          sellers.map((s) => {
            const name = sellerDisplayName({ firstName: s.firstName as string | null, lastName: s.lastName as string | null, email: s.email as string });
            return sendInternalEmail(appUrl, {
              to: s.email,
              subject: 'Complete your Loadify Market seller setup',
              template: 'onboarding_reminder',
              data: { sellerName: name, windowLabel: '48h', onboardingUrl: `${appUrl}/onboarding` },
            }).catch((err: unknown) => {
              console.warn(`admin-sellers: onboarding reminder email failed for ${s.email as string}:`, err);
              throw err;
            });
          }),
        );
        const sent = results.filter((r) => r.status === 'fulfilled').length;
        return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ sent }) };
      }

      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: `Unknown op: ${op ?? '(none)'}` }),
      };
    }

    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (err: unknown) {
    console.error('ADMIN SELLERS ERROR:', err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
