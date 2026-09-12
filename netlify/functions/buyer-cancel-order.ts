import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { checkRateLimit } from './_shared/rateLimiter';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const url = process.env.VITE_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!url || !key || !stripeKey.startsWith('sk_')) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, sb, ['buyer', 'seller', 'admin']);
  if (!auth.ok) return { statusCode: auth.status, body: JSON.stringify({ error: 'Authentication required' }) };
  const rl = await checkRateLimit({
    supabase: sb,
    tableName: 'buyer_cancel_order_rate_limits',
    identifier: auth.actor.id,
    windowMinutes: 60,
    maxAttempts: 10,
    policy: 'fail-closed',
  });  if (rl.exceeded) return { statusCode: 429, body: JSON.stringify({ error: 'Too many cancellation attempts. Please try again later.' }) };

  let body: { orderId?: string; reason?: string };
  try { body = JSON.parse(event.body ?? '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }; }
  if (!body.orderId) return { statusCode: 400, body: JSON.stringify({ error: 'orderId is required' }) };

  const { data: order, error } = await sb.from('orders')
    .select('id,orderNumber,buyerId,sellerId,status,stripePaymentIntentId')
    .eq('id', body.orderId)
    .maybeSingle<{ id:string; orderNumber:string; buyerId:string; sellerId:string; status:string; stripePaymentIntentId:string|null }>();
  if (error || !order) return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  if (order.buyerId !== auth.actor.id) return { statusCode: 403, body: JSON.stringify({ error: 'Only the buyer can cancel this order' }) };
  if (order.status !== 'paid') {
    return { statusCode: 409, body: JSON.stringify({ error: 'This order can only be cancelled before the seller starts fulfilment.' }) };
  }

  const { data: shipment } = await sb.from('shipments').select('id,status').eq('order_id', order.id).maybeSingle<{ id:string; status:string }>();
  if (shipment) return { statusCode: 409, body: JSON.stringify({ error: 'This order already has a shipment and can no longer be cancelled automatically.' }) };

  const { data: payout } = await sb.from('payouts').select('id,status,stripeTransferId')
    .eq('orderId', order.id).in('status', ['processing','paid']).limit(1)
    .maybeSingle<{ id:string; status:string; stripeTransferId:string|null }>();
  if (payout) return { statusCode: 409, body: JSON.stringify({ error: 'Seller payout processing has started. Please contact support to cancel this order safely.' }) };  let paymentIntentId = order.stripePaymentIntentId;
  if (!paymentIntentId) {
    const { data: ps } = await sb.from('payment_sessions').select('stripePaymentIntent')
      .eq('orderId', order.id).order('createdAt', { ascending:false }).limit(1)
      .maybeSingle<{ stripePaymentIntent:string|null }>();
    paymentIntentId = ps?.stripePaymentIntent ?? null;
  }
  if (!paymentIntentId) return { statusCode: 422, body: JSON.stringify({ error: 'Payment reference is missing. Please contact support.' }) };

  const stripe = new Stripe(stripeKey, { apiVersion:'2025-08-27.basil' });
  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: { orderId:order.id, orderNumber:order.orderNumber, cancelledBy:auth.actor.id },
    }, { idempotencyKey:`buyer-cancel:${order.id}` });
  } catch (e) {
    console.error('buyer-cancel-order: Stripe refund failed', e);
    return { statusCode: 502, body: JSON.stringify({ error: 'The refund could not be issued. The order was not cancelled.' }) };
  }

  const { error: finalizeError } = await sb.rpc('server_finalize_buyer_cancellation_v1', {
    p_order_id: order.id,
    p_buyer_id: auth.actor.id,
    p_reason: (body.reason ?? 'Ordered by mistake').slice(0,500),
  });
  if (finalizeError) { console.error('buyer-cancel-order: finalize failed', finalizeError); return { statusCode: 500, body: JSON.stringify({ error: 'Payment reversal completed, but order reconciliation needs support review. Do not retry.' }) }; }
  await sb.from('notifications').insert([{ userId:order.sellerId, type:'order', title:'Order cancelled by buyer', message:`Order ${order.orderNumber} was cancelled before fulfilment.`, link:'/seller/orders' },{ userId:order.buyerId, type:'payment', title:'Order cancelled', message:`Order ${order.orderNumber} was cancelled. The payment reversal is processing.`, link:'/buyer/orders' }]);
  return { statusCode: 200, body: JSON.stringify({ success:true, status:'refunded' }) };
};
