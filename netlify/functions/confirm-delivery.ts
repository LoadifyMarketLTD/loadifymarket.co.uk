/**
 * confirm-delivery
 *
 * Called by the buyer to confirm receipt/completion of an order.
 * This endpoint MUST NOT release Stripe funds or mark escrow released. The
 * canonical payout boundary is the scheduled escrow-release function, which
 * applies the configured protection window and re-checks disputes/refunds.
 *
 * Security:
 *   – Requires Authorization: Bearer <buyer-jwt>
 *   – Caller must still be an active platform account
 *   – Order must belong to the authenticated buyer
 *   – Order must be in a buyer-confirmable state: 'shipped' or 'delivered'
 *   – Uses service-role client for the authoritative ownership/state checks
 *
 * Method: POST
 * Body:   { orderId: string }
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';

const CONFIRMABLE_STATUSES = new Set(['shipped', 'delivered']);

const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';
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

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, orderNumber, status, escrowStatus, buyerId, sellerId, deliveredAt')
    .eq('id', orderId)
    .maybeSingle<{
      id: string;
      orderNumber: string;
      status: string;
      escrowStatus: string | null;
      buyerId: string;
      sellerId: string | null;
      deliveredAt: string | null;
    }>();

  if (orderErr) {
    console.error('confirm-delivery: order fetch error', orderErr);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to fetch order' }) };
  }

  if (!order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyerId !== buyerId) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (order.escrowStatus === 'released' || order.status === 'completed') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, alreadyReleased: true, fundsReleased: true, status: order.status }),
    };
  }

  if (!CONFIRMABLE_STATUSES.has(order.status)) {
    return {
      statusCode: 422,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Cannot confirm delivery for an order with status '${order.status}'` }),
    };
  }

  // Buyer confirmation may advance a shipped order to delivered, but escrow
  // remains held. Keeping status=delivered and escrowStatus=held is required so
  // escrow-release can apply the protection window before any Stripe Transfer.
  if (order.status === 'shipped') {
    const deliveredAt = order.deliveredAt ?? new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'delivered', deliveredAt })
      .eq('id', orderId)
      .eq('status', 'shipped');

    if (updateErr) {
      console.error('confirm-delivery: delivery confirmation update error', updateErr);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to confirm delivery' }) };
    }
  }

  // Avoid duplicate seller notifications when the buyer repeats the action.
  if (order.sellerId) {
    const notificationTitle = 'Delivery confirmed by buyer';
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('userId', order.sellerId)
      .eq('type', 'delivery')
      .eq('title', notificationTitle)
      .eq('link', '/seller/orders')
      .ilike('message', `%${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}%`)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (!existingNotification) {
      await supabase.from('notifications').insert({
        userId: order.sellerId,
        type: 'delivery',
        title: notificationTitle,
        message: `The buyer has confirmed delivery of order ${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}. Funds remain protected until the escrow release window and final eligibility checks are complete.`,
        link: '/seller/orders',
      });
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      status: 'delivered',
      escrowStatus: order.escrowStatus,
      fundsReleased: false,
    }),
  };
};
