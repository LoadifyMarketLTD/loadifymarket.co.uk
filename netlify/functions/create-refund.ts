/**
 * create-refund
 *
 * Issues a Stripe refund for a completed order.
 * Only admin users may call this endpoint.
 *
 * The function looks up the Stripe PaymentIntent associated with the order's
 * payment session and calls stripe.refunds.create().  The order status is
 * then updated to 'refunded' in the database.
 *
 * Security:
 *   – Requires Authorization: Bearer <admin-jwt>
 *   – Caller must have role = 'admin'
 *   – Order must be in a refundable status (paid | packed | shipped | delivered | disputed)
 *   – Idempotency: if a refund already exists for the PaymentIntent, Stripe
 *     returns the existing refund object (no double-refund possible).
 *
 * Method: POST
 * Body:   { orderId: string; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' }
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const REFUNDABLE_STATUSES = new Set(['paid', 'packed', 'shipped', 'delivered', 'disputed']);

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

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  // ── Authenticate caller ───────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // ── Verify admin role ─────────────────────────────────────────────────────
  const { data: callerRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (callerRow?.role !== 'admin') {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { orderId?: string; reason?: string };
  try {
    body = JSON.parse(event.body || '{}') as { orderId?: string; reason?: string };
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { orderId, reason = 'requested_by_customer' } = body;
  if (!orderId || typeof orderId !== 'string') {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'orderId is required' }) };
  }

  const validReasons = new Set(['duplicate', 'fraudulent', 'requested_by_customer']);
  const safeReason = validReasons.has(reason) ? reason : 'requested_by_customer';

  // ── Fetch order ───────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, orderNumber, status, total')
    .eq('id', orderId)
    .single<{ id: string; orderNumber: string; status: string; total: number }>();

  if (orderError || !order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (!REFUNDABLE_STATUSES.has(order.status)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        error: `Order status '${order.status}' is not eligible for refund. Eligible statuses: ${[...REFUNDABLE_STATUSES].join(', ')}`,
      }),
    };
  }

  // ── Find payment session ──────────────────────────────────────────────────
  const { data: paymentSession } = await supabase
    .from('payment_sessions')
    .select('stripeSessionId, paymentIntentId, status')
    .eq('orderId', orderId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle<{ stripeSessionId: string | null; paymentIntentId: string | null; status: string }>();

  // Try to get paymentIntentId directly; fall back to resolving via Stripe session
  let paymentIntentId = paymentSession?.paymentIntentId ?? null;

  const stripe = new Stripe(stripeSecretKey);

  if (!paymentIntentId && paymentSession?.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(paymentSession.stripeSessionId);
      paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    } catch (e) {
      console.error('create-refund: failed to retrieve Stripe session:', e);
    }
  }

  if (!paymentIntentId) {
    return {
      statusCode: 422,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'No Stripe PaymentIntent found for this order. The order may have been placed before Stripe was connected, or the payment may not have been captured. Use the Stripe Dashboard to issue this refund manually.',
      }),
    };
  }

  // ── Issue Stripe refund ───────────────────────────────────────────────────
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: safeReason as Stripe.RefundCreateParams.Reason,
      metadata: {
        orderId,
        orderNumber: order.orderNumber,
        issuedByAdminId: user.id,
      },
    });
  } catch (err) {
    const stripeErr = err as Stripe.errors.StripeError;
    // charge_already_refunded means the refund was already issued — treat as success
    if (stripeErr.code === 'charge_already_refunded') {
      // Update DB status even if Stripe already has the refund
      await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Order was already refunded in Stripe. Status updated.' }),
      };
    }
    console.error('create-refund: Stripe refund failed:', stripeErr.message);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Stripe refund failed: ${stripeErr.message}` }),
    };
  }

  // ── Update order status in DB ─────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', orderId);

  if (updateError) {
    console.error('create-refund: DB status update failed after successful Stripe refund:', updateError.message);
    // Non-fatal: refund is issued in Stripe; DB can be updated manually if needed
  }

  // ── Notify buyer (best-effort) ────────────────────────────────────────────
  const { data: orderFull } = await supabase
    .from('orders')
    .select('buyerId')
    .eq('id', orderId)
    .single<{ buyerId: string | null }>();

  if (orderFull?.buyerId) {
    await supabase.from('notifications').insert({
      userId: orderFull.buyerId,
      type: 'order_refunded',
      title: 'Refund Issued',
      message: `Your refund for order ${order.orderNumber} has been processed. It may take 3–5 business days to appear in your account.`,
      isRead: false,
    }).catch((e: unknown) => console.warn('create-refund: notification insert failed:', (e as Error).message));
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      message: `Refund of £${(refund.amount / 100).toFixed(2)} issued successfully.`,
    }),
  };
};
