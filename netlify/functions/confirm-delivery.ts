/**
 * confirm-delivery
 *
 * Called by the buyer to confirm that a job/order has been completed.
 * Releases escrow by marking the order as completed and notifying the seller.
 *
 * Security:
 *   – Requires Authorization: Bearer <buyer-jwt>
 *   – Caller must still be an active platform account
 *   – Order must belong to the authenticated buyer
 *   – Order must be in a releasable status: 'shipped' or 'delivered'
 *   – Uses service-role client for the DB write so RLS cannot be bypassed
 *     from the browser
 *
 * Method: POST
 * Body:   { orderId: string }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

const RELEASABLE_STATUSES = new Set(['shipped', 'delivered']);

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';
// Note: If VITE_APP_URL is unset we intentionally fall back to the production
// origin (consistent with every other Netlify function in this codebase). The
// Access-Control-Allow-Origin header is a browser hint, not a security barrier —
// server-side JWT authentication is the actual security mechanism.

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      headers: corsHeaders,
      body: JSON.stringify({ error: auth.status === 401 ? 'Unauthorized' : 'Account is suspended' }),
    };
  }

  const buyerId = auth.actor.id;

  // ── Parse body ────────────────────────────────────────────────────────────
  let orderId: string | undefined;
  try {
    const body = JSON.parse(event.body ?? '{}') as Record<string, unknown>;
    orderId = typeof body.orderId === 'string' ? body.orderId.trim() : undefined;
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!orderId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'orderId is required' }) };
  }

  // ── Fetch order and verify ownership ─────────────────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, orderNumber, status, escrowStatus, buyerId, sellerId, total')
    .eq('id', orderId)
    .maybeSingle<{
      id: string;
      orderNumber: string;
      status: string;
      escrowStatus: string | null;
      buyerId: string;
      sellerId: string | null;
      total: number;
    }>();

  if (orderErr) {
    console.error('confirm-delivery: order fetch error', orderErr);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to fetch order' }) };
  }

  if (!order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  // Must be the buyer's own order
  if (order.buyerId !== buyerId) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Order must be in a state that allows escrow release
  if (!RELEASABLE_STATUSES.has(order.status)) {
    return {
      statusCode: 422,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Cannot confirm delivery for an order with status '${order.status}'` }),
    };
  }

  // Idempotency: already released
  if (order.escrowStatus === 'released' || order.status === 'completed') {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, alreadyReleased: true }) };
  }

  // ── Release escrow ────────────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      escrowStatus: 'released',
      escrowReleasedAt: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateErr) {
    console.error('confirm-delivery: update error', updateErr);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to release escrow' }) };
  }

  // ── Notify seller ─────────────────────────────────────────────────────────
  if (order.sellerId) {
    await supabase.from('notifications').insert({
      userId: order.sellerId,
      type: 'payment',
      title: 'Job confirmed — funds released',
      message: `The buyer has confirmed completion of order ${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}. Escrow has been released.`,
      link: '/seller/orders',
    });
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true }),
  };
};
