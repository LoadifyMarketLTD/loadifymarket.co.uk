import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';

const REFUNDABLE_STATUSES = new Set(['paid', 'packed', 'shipped', 'delivered', 'completed']);
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
  if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_') || !supabaseUrl || !supabaseServiceRoleKey) {
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

  const { data: callerRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>();
  if (callerRow?.role !== 'admin') {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Admin access required' }) };
  }

  const refundRl = await checkRateLimit({
    supabase,
    tableName: 'create_refund_rate_limits',
    identifier: user.id,
    windowMinutes: 60,
    maxAttempts: 10,
    policy: 'fail-closed',
  });
  if (refundRl.exceeded) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many refund requests in a short period. Please wait and try again.' }),
    };
  }

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

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, orderNumber, status, escrowStatus, total, sellerId, buyerId, stripePaymentIntentId')
    .eq('id', orderId)
    .maybeSingle<{
      id: string;
      orderNumber: string;
      status: string;
      escrowStatus: string;
      total: number;
      sellerId: string;
      buyerId: string;
      stripePaymentIntentId: string | null;
    }>();

  if (orderError || !order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.status === 'refunded' || order.escrowStatus === 'refunded') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, alreadyRefunded: true, message: 'Order is already marked as refunded.' }),
    };
  }

  if (!REFUNDABLE_STATUSES.has(order.status)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Order status '${order.status}' is not eligible for refund.` }),
    };
  }

  const { data: paymentSession } = await supabase
    .from('payment_sessions')
    .select('stripeSessionId, stripePaymentIntent, status')
    .eq('orderId', orderId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle<{ stripeSessionId: string | null; stripePaymentIntent: string | null; status: string }>();

  let paymentIntentId = order.stripePaymentIntentId || paymentSession?.stripePaymentIntent || null;
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

  if (!paymentIntentId && paymentSession?.stripeSessionId?.startsWith('cs_')) {
    try {
      const session = await stripe.checkout.sessions.retrieve(paymentSession.stripeSessionId);
      paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    } catch (error) {
      console.error('create-refund: unable to resolve PaymentIntent from Checkout Session:', error);
    }
  }

  if (!paymentIntentId) {
    return {
      statusCode: 422,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No Stripe PaymentIntent is linked to this order. Manual payment review is required.' }),
    };
  }

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: safeReason as Stripe.RefundCreateParams.Reason,
        metadata: {
          orderId,
          orderNumber: order.orderNumber,
          issuedByAdminId: user.id,
        },
      },
      { idempotencyKey: `order-refund:${orderId}` },
    );
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    if (stripeError.code === 'charge_already_refunded') {
      const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 1 });
      const first = existing.data[0];
      if (!first) {
        return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Stripe reports the charge as refunded but no refund record could be resolved.' }) };
      }
      refund = first;
    } else {
      console.error('create-refund: Stripe refund failed:', stripeError.message);
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Stripe refund failed. Please try again or review the payment in Stripe.' }) };
    }
  }

  // If the protection window already released a seller transfer, recover it.
  // If funds are still held there is no payout row and nothing needs reversing.
  let transferReversalId: string | null = null;
  let transferRecoveryWarning: string | null = null;

  const { data: payoutRecord, error: payoutLookupError } = await supabase
    .from('payouts')
    .select('id, stripeTransferId, status')
    .eq('orderId', orderId)
    .eq('status', 'paid')
    .not('stripeTransferId', 'is', null)
    .limit(1)
    .maybeSingle<{ id: string; stripeTransferId: string; status: string }>();

  if (payoutLookupError) {
    transferRecoveryWarning = 'Seller transfer lookup failed after buyer refund.';
    console.error('create-refund:', transferRecoveryWarning, payoutLookupError.message);
  } else if (payoutRecord?.stripeTransferId) {
    try {
      const reversal = await stripe.transfers.createReversal(
        payoutRecord.stripeTransferId,
        {
          metadata: {
            orderId,
            orderNumber: order.orderNumber,
            refundId: refund.id,
            reversedByAdminId: user.id,
          },
        },
        { idempotencyKey: `order-refund-reversal:${orderId}` },
      );
      transferReversalId = reversal.id;

      const { error: payoutUpdateError } = await supabase
        .from('payouts')
        .update({
          status: 'cancelled',
          reference: reversal.id,
          notes: `Seller transfer reversed after refund. Stripe reversal ID: ${reversal.id}`,
        })
        .eq('id', payoutRecord.id);
      if (payoutUpdateError) {
        transferRecoveryWarning = 'Seller transfer was reversed in Stripe but payout reconciliation failed in the database.';
        console.error('create-refund:', transferRecoveryWarning, payoutUpdateError.message);
      }
    } catch (reversalError) {
      transferRecoveryWarning = 'Buyer refund succeeded, but the released seller transfer could not be automatically reversed. Manual Stripe recovery is required.';
      console.error('create-refund:', transferRecoveryWarning, reversalError);
    }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'refunded', escrowStatus: 'refunded' })
    .eq('id', orderId);

  if (updateError) {
    console.error('create-refund: refund succeeded but order reconciliation failed:', updateError.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Refund was issued in Stripe, but order reconciliation failed. Do not issue another refund; review this order in admin.',
        refundId: refund.id,
      }),
    };
  }

  await supabase.from('notifications').insert({
    userId: order.buyerId,
    type: 'order_refunded',
    title: 'Refund Issued',
    message: `Your refund for order ${order.orderNumber} has been processed. It may take several business days to appear in your account.`,
    isRead: false,
    link: '/buyer/orders',
  }).catch((error: unknown) => console.warn('create-refund: buyer notification failed:', error));

  if (transferRecoveryWarning) {
    await supabase.from('notifications').insert({
      userId: user.id,
      type: 'payment',
      title: 'Refund requires payout review',
      message: `${order.orderNumber}: ${transferRecoveryWarning}`,
      isRead: false,
      link: '/admin/payouts',
    }).catch((error: unknown) => console.warn('create-refund: admin warning notification failed:', error));
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      transferReversalId,
      warning: transferRecoveryWarning,
      message: `Refund of £${(refund.amount / 100).toFixed(2)} issued successfully.`,
    }),
  };
};
