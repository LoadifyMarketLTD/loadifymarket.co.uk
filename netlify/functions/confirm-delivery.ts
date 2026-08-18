/**
 * confirm-delivery
 *
 * Called by the buyer after a physical shipment or service has been marked
 * delivered. Buyer confirmation releases the held seller funds through the
 * exact same idempotent Stripe Transfer path used by the scheduled escrow job.
 *
 * Security:
 *   – Requires Authorization: Bearer <buyer-jwt>
 *   – Order must belong to the authenticated buyer
 *   – Order must already be in 'delivered' state
 *   – Open disputes/refunds and payout capability are re-checked by the shared
 *     release path before any funds or order state are changed
 *
 * Method: POST
 * Body:   { orderId: string }
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { releaseHeldOrder } from './_shared/escrowRelease';

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
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey || !stripeKey || !stripeKey.startsWith('sk_')) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

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
    .select('id, orderNumber, status, escrowStatus, buyerId')
    .eq('id', orderId)
    .maybeSingle<{
      id: string;
      orderNumber: string;
      status: string;
      escrowStatus: string | null;
      buyerId: string;
    }>();

  if (orderErr) {
    console.error('confirm-delivery: order fetch error', orderErr);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to fetch order' }) };
  }

  if (!order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyerId !== user.id) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (order.status === 'completed' && order.escrowStatus === 'released') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, alreadyReleased: true }),
    };
  }

  // A buyer cannot release funds merely because the seller marked an order as
  // shipped. Physical delivery must reach Delivered via the shipment lifecycle;
  // service completion reaches the same Delivered state via seller-order-status.
  if (order.status !== 'delivered') {
    return {
      statusCode: 422,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Cannot confirm delivery for an order with status '${order.status}'` }),
    };
  }

  if (order.escrowStatus !== 'held') {
    return {
      statusCode: 409,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'This order is not currently eligible for funds release.' }),
    };
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const result = await releaseHeldOrder({
      supabase,
      stripe,
      orderId: order.id,
      reason: 'buyer_confirmed',
    });

    if (!result.released) {
      const message = result.reason === 'open_dispute'
        ? 'Funds cannot be released while a dispute is open.'
        : 'Funds cannot be released yet. Please contact support if this continues.';
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ error: message, reason: result.reason }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        alreadyReleased: result.alreadyReleased,
        transferId: result.transferId,
      }),
    };
  } catch (error) {
    console.error('confirm-delivery: payout release failed', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Delivery was not confirmed because the funds release could not be completed. Please try again.' }),
    };
  }
};
