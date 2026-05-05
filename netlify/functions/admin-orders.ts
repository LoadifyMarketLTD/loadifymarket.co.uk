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

  const jwtRole = (authUser.app_metadata as Record<string, unknown> | undefined)?.role;
  if (jwtRole === 'admin') {
    return { ok: true, caller: { id: authUser.id, email: authEmail, role: 'admin' } };
  }

  const { data: dbUser, error: dbError } = await admin
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (dbError || !dbUser || dbUser.role !== 'admin') {
    return { ok: false, status: 403 };
  }

  return { ok: true, caller: { id: authUser.id, email: authEmail, role: dbUser.role } };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  // Support both SUPABASE_URL (Netlify dashboard convention) and the VITE_
  // prefixed variant that build tooling also exports to the environment.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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
    // ── GET — list all orders ─────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const { data: rows, error: ordersErr } = await admin
        .from('orders')
        .select('id, orderNumber, total, status, createdAt, buyerId, productId')
        .order('createdAt', { ascending: false })
        .limit(100);

      if (ordersErr) throw ordersErr;

      const orderRows = rows || [];

      // Resolve buyer names from users table
      const buyerIds = [...new Set(orderRows.map((o: { buyerId: string | null }) => o.buyerId).filter((id): id is string => !!id))];
      const buyerNames: Record<string, string> = {};

      if (buyerIds.length > 0) {
        const { data: buyers } = await admin
          .from('users')
          .select('id, firstName, lastName')
          .in('id', buyerIds);
        (buyers ?? []).forEach((b: { id: string; firstName?: string | null; lastName?: string | null }) => {
          const name = [b.firstName, b.lastName].filter((n): n is string => !!n).join(' ').trim();
          buyerNames[b.id] = name || 'Customer';
        });
      }

      // Resolve product titles in a separate query (avoids FK hint issues with camelCase columns)
      const productIds = [...new Set(orderRows.map((o: { productId: string | null }) => o.productId).filter((id): id is string => !!id))];
      const productTitles: Record<string, string> = {};

      if (productIds.length > 0) {
        const { data: products } = await admin
          .from('products')
          .select('id, title')
          .in('id', productIds);
        (products ?? []).forEach((p: { id: string; title?: string | null }) => {
          productTitles[p.id] = p.title || '—';
        });
      }

      const orders = orderRows.map((o: {
        id: string;
        orderNumber: string | null;
        total: number | null;
        status: string | null;
        createdAt: string | null;
        buyerId: string;
        productId: string;
      }) => ({
        id: o.id,
        orderNumber: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
        buyer: buyerNames[o.buyerId] ?? (o.buyerId ? o.buyerId.slice(0, 8).toUpperCase() : '—'),
        product: productTitles[o.productId] ?? '—',
        total: o.total ?? 0,
        status: o.status ?? 'paid',
        date: formatDate(o.createdAt),
      }));

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ orders }),
      };
    }

    // ── POST — update order status ────────────────────────────────────────────
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
      const orderId = body.orderId as string | undefined;
      const status = body.status as string | undefined;

      if (op === 'update_status') {
        if (!orderId || !status) {
          return {
            statusCode: 400,
            headers: JSON_HEADERS,
            body: JSON.stringify({ error: 'orderId and status required' }),
          };
        }

        const { error: updateErr } = await admin
          .from('orders')
          .update({ status })
          .eq('id', orderId);

        if (updateErr) throw updateErr;

        return {
          statusCode: 200,
          headers: JSON_HEADERS,
          body: JSON.stringify({ success: true }),
        };
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
    const message = err instanceof Error ? err.message : String(err);
    console.error('ADMIN ORDERS ERROR:', message, err);
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Internal Server Error', detail: message }),
    };
  }
};
