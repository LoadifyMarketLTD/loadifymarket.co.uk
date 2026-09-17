import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { sendPushToUser } from './_shared/pushNotifications';
import { findOrderTransfer, reconcilePaidOrderPayout, reverseOrderTransfer } from './_shared/orderTransfer';
import { reconcileFullOrderRefund } from './_shared/orderRefund';

const METHODS = 'POST, OPTIONS';
type ReturnAction = 'approve' | 'reject' | 'received';

interface RequestBody {
  returnId?: string;
  action?: ReturnAction;
}

const transition: Record<ReturnAction, { from: string; to: string }> = {
  approve: { from: 'requested', to: 'approved' },
  reject: { from: 'requested', to: 'rejected' },
  received: { from: 'approved', to: 'received' },
};

async function processAutomaticRefund(
  admin: any,
  current: { id: string; orderId: string; buyerId: string; sellerId: string },
  actorId: string,
) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey?.startsWith('sk_')) throw new Error('Stripe server configuration is unavailable');

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, orderNumber, status, escrowStatus, total, commission, sellerId, buyerId, stripePaymentIntentId')
    .eq('id', current.orderId)
    .maybeSingle();
  if (orderError || !order) throw new Error('Order not found for automatic refund');

  if (order.status === 'refunded' || order.escrowStatus === 'refunded') {
    await admin.from('returns').update({
      status: 'completed',
      resolvedBy: actorId,
      resolvedAt: new Date().toISOString(),
    }).eq('id', current.id);
    return { success: true, alreadyRefunded: true };
  }

  if (!new Set(['paid', 'packed', 'shipped', 'delivered', 'completed']).has(order.status)) {
    throw new Error(`Order status '${order.status}' is not refundable`);
  }

  const { data: paymentSession } = await admin
    .from('payment_sessions')
    .select('stripeSessionId, stripePaymentIntent')
    .eq('orderId', current.orderId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
  let paymentIntentId = order.stripePaymentIntentId || paymentSession?.stripePaymentIntent || null;
  if (!paymentIntentId && paymentSession?.stripeSessionId?.startsWith('cs_')) {
    const session = await stripe.checkout.sessions.retrieve(paymentSession.stripeSessionId);
    paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  }
  if (!paymentIntentId) throw new Error('No Stripe PaymentIntent is linked to this order');

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        orderId: current.orderId,
        orderNumber: order.orderNumber,
        automatedReturnRefund: 'true',
      },
    }, { idempotencyKey: `order-refund:${current.orderId}` });
  } catch (error) {
    const stripeError = error as Stripe.errors.StripeError;
    if (stripeError.code !== 'charge_already_refunded') throw error;
    const existing = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 1 });
    if (!existing.data[0]) throw error;
    refund = existing.data[0];
  }

  if (refund.status !== 'succeeded') {
    return { success: true, pending: true, refundId: refund.id, status: refund.status };
  }

  let warning: string | null = null;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const { data: sellerProfile } = await admin
      .from('seller_profiles')
      .select('stripeAccountId')
      .eq('userId', order.sellerId)
      .maybeSingle();
    const { data: payoutRecord } = await admin
      .from('payouts')
      .select('id, stripeTransferId')
      .eq('orderId', current.orderId)
      .not('stripeTransferId', 'is', null)
      .limit(1)
      .maybeSingle();

    const expectedAmountPence = Math.round((Number(order.total) - Number(order.commission || 0)) * 100);
    const transfer = await findOrderTransfer(stripe, {
      orderId: current.orderId,
      knownTransferId: payoutRecord?.stripeTransferId ?? null,
      transferGroup: paymentIntent.transfer_group,
      expectedAmountPence: expectedAmountPence > 0 ? expectedAmountPence : null,
      expectedDestination: sellerProfile?.stripeAccountId ?? null,
    });

    if (transfer) {
      const payoutId = await reconcilePaidOrderPayout(admin, {
        sellerId: order.sellerId,
        orderId: current.orderId,
        amount: transfer.amount / 100,
        transferId: transfer.id,
        note: 'Reconciled during automatic return refund.',
      });
      const reversal = await reverseOrderTransfer(
        stripe,
        transfer,
        `order-refund-transfer:${current.orderId}`,
        { orderId: current.orderId },
      );
      await admin.from('payouts').update({
        status: 'cancelled',
        reference: reversal.id,
        notes: `Seller transfer reversed after automatic refund. Stripe reversal ID: ${reversal.id}`,
      }).eq('id', payoutId);
    }
  } catch (error) {
    warning = 'Buyer refund succeeded, but seller-transfer reconciliation requires manual review.';
    console.error('return-action automatic refund reconciliation:', error);
  }

  await reconcileFullOrderRefund(admin, current.orderId);
  await admin.from('returns').update({
    status: 'completed',
    refundAmount: refund.amount / 100,
    resolvedBy: actorId,
    resolvedAt: new Date().toISOString(),
  }).eq('id', current.id);

  await admin.from('notifications').insert([
    {
      userId: order.buyerId,
      type: 'order',
      title: 'Refund Issued',
      message: `Your refund for order ${order.orderNumber} has been processed.`,
      isRead: false,
      link: `/orders?mode=buy&orderId=${current.orderId}`,
    },
    {
      userId: order.sellerId,
      type: 'return',
      title: 'Return completed',
      message: `Return for order ${order.orderNumber} was received and the buyer refund was processed.`,
      isRead: false,
      link: '/seller/returns',
    },
  ]);

  if (warning) {
    const { data: admins } = await admin.from('users').select('id').eq('role', 'admin').eq('isActive', true);
    if (admins?.length) {
      await admin.from('notifications').insert(admins.map((row: { id: string }) => ({
        userId: row.id,
        type: 'payment',
        title: 'Refund requires payout review',
        message: `${order.orderNumber}: ${warning}`,
        isRead: false,
        link: '/admin/payouts',
      })));
    }
  }

  return {
    success: true,
    refundId: refund.id,
    amount: refund.amount / 100,
    status: refund.status,
    warning,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const returnId = typeof body.returnId === 'string' ? body.returnId.trim() : '';
  const action = body.action;
  if (!returnId || !action || !(action in transition)) {
    return jsonResponse(400, { error: 'returnId and a valid action are required' }, METHODS);
  }

  const { data: current, error: readError } = await admin
    .from('returns')
    .select('id, orderId, buyerId, sellerId, status, buyerTrackingNumber')
    .eq('id', returnId)
    .maybeSingle<{ id: string; orderId: string; buyerId: string; sellerId: string; status: string; buyerTrackingNumber: string | null }>();
  if (readError || !current) return jsonResponse(404, { error: 'Return request not found' }, METHODS);
  if (current.sellerId !== auth.actor.id) return jsonResponse(403, { error: 'Only the order seller can perform this action' }, METHODS);

  const expected = transition[action];
  const retryReceivedRefund = action === 'received' && current.status === 'received';
  if (current.status === 'completed') return jsonResponse(200, { ok: true, alreadyCompleted: true }, METHODS);
  if (current.status !== expected.from && !retryReceivedRefund) {
    return jsonResponse(409, { error: `Return is already ${current.status}; expected ${expected.from}` }, METHODS);
  }
  if (action === 'received' && !current.buyerTrackingNumber?.trim()) {
    return jsonResponse(409, { error: 'Buyer return tracking is required before confirming receipt' }, METHODS);
  }

  let updated: any = current;
  if (!retryReceivedRefund) {
    const { data: transitioned, error: updateError } = await admin
      .from('returns')
      .update({ status: expected.to })
      .eq('id', current.id)
      .eq('sellerId', auth.actor.id)
      .eq('status', expected.from)
      .select('*')
      .maybeSingle();
    if (updateError) return jsonResponse(400, { error: updateError.message }, METHODS);
    if (!transitioned) return jsonResponse(409, { error: 'Return changed while this action was being processed' }, METHODS);
    updated = transitioned;
  }

  let automaticRefund: any = null;
  if (action === 'received') {
    try {
      automaticRefund = await processAutomaticRefund(admin, current, auth.actor.id);
    } catch (refundError) {
      console.error('return-action automatic refund failed:', refundError);
      return jsonResponse(502, {
        error: refundError instanceof Error ? refundError.message : 'Automatic refund failed',
        return: updated,
      }, METHODS);
    }
  }

  const buyerMessage = action === 'approve'
    ? 'Your return request was approved. Add return tracking in the Resolution Centre.'
    : action === 'reject'
      ? 'Your return request was rejected. Open the Resolution Centre for details.'
      : automaticRefund?.pending
        ? 'The seller confirmed receipt. Stripe is processing your refund.'
        : 'The seller confirmed receipt and your refund was processed automatically.';

  await sendPushToUser(admin, current.buyerId, {
    title: action === 'received' ? 'Return received' : `Return ${expected.to}`,
    body: buyerMessage,
    data: {
      path: `/orders?mode=buy&orderId=${encodeURIComponent(current.orderId)}`,
      type: 'return',
      orderId: current.orderId,
    },
  });

  return jsonResponse(200, { ok: true, return: updated, automaticRefund }, METHODS);
};
