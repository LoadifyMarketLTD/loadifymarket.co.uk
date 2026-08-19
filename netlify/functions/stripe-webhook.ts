import Stripe from 'stripe';
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';

const WEBHOOK_SECRETS = [
  process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim(),
].filter((s): s is string => Boolean(s));

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY.trim(), { apiVersion: '2025-08-27.basil' })
  : null;

const supabase = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export const ZERO_COMMISSION_PROMO_END_UTC = new Date('2026-12-31T23:59:59Z').getTime();
export const DEFAULT_COMMISSION_RATE = 0.07;
const STRIPE_EVENT_LEASE_MS = 5 * 60 * 1000;

export function getCommissionRate(configuredRate?: number): number {
  if (Date.now() < ZERO_COMMISSION_PROMO_END_UTC) return 0;
  return typeof configuredRate === 'number' && configuredRate >= 0
    ? configuredRate
    : DEFAULT_COMMISSION_RATE;
}

async function fetchConfiguredCommissionRate(sb: import('@supabase/supabase-js').SupabaseClient): Promise<number | null> {
  try {
    const { data: config } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_config')
      .maybeSingle<{ value: unknown }>();

    const configValue = config?.value && typeof config.value === 'object'
      ? config.value as Record<string, unknown>
      : null;
    const rawConfig = configValue?.commissionRate;
    if (typeof rawConfig === 'number' && rawConfig >= 0) return rawConfig / 100;

    const { data: legacy } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'commission_rate')
      .maybeSingle<{ value: unknown }>();
    const rawLegacy = typeof legacy?.value === 'number'
      ? legacy.value
      : Number(legacy?.value);
    return Number.isFinite(rawLegacy) && rawLegacy >= 0 ? rawLegacy / 100 : null;
  } catch {
    return null;
  }
}

async function claimStripeEvent(sb: import('@supabase/supabase-js').SupabaseClient, event: Stripe.Event): Promise<'claimed' | 'done' | 'busy'> {
  const now = new Date().toISOString();
  const { error: insertError } = await sb.from('stripe_events').insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    status: 'processing',
    error_message: null,
    processed_at: now,
  });

  if (!insertError) return 'claimed';
  if (insertError.code !== '23505') {
    throw new Error(`Stripe event idempotency storage failed: ${insertError.message}`);
  }

  const { data: existing, error: readError } = await sb
    .from('stripe_events')
    .select('id, status, processed_at')
    .eq('event_id', event.id)
    .maybeSingle<{ id: string; status: string; processed_at: string }>();

  if (readError || !existing) {
    throw new Error(`Stripe event idempotency lookup failed: ${readError?.message ?? 'row missing'}`);
  }
  if (existing.status === 'processed' || existing.status === 'skipped') return 'done';

  if (existing.status === 'processing') {
    const staleBefore = new Date(Date.now() - STRIPE_EVENT_LEASE_MS).toISOString();
    const { data: reclaimed, error: reclaimError } = await sb
      .from('stripe_events')
      .update({ status: 'processing', error_message: null, processed_at: now })
      .eq('event_id', event.id)
      .eq('status', 'processing')
      .lt('processed_at', staleBefore)
      .select('id')
      .maybeSingle<{ id: string }>();

    if (reclaimError) throw new Error(`Stripe event stale-lease reclaim failed: ${reclaimError.message}`);
    return reclaimed ? 'claimed' : 'busy';
  }

  if (existing.status === 'failed') {
    const { data: claimed, error: retryError } = await sb
      .from('stripe_events')
      .update({ status: 'processing', error_message: null, processed_at: now })
      .eq('event_id', event.id)
      .eq('status', 'failed')
      .select('id')
      .maybeSingle<{ id: string }>();

    if (retryError) throw new Error(`Stripe event retry claim failed: ${retryError.message}`);
    return claimed ? 'claimed' : 'busy';
  }

  return 'busy';
}

async function markStripeEvent(sb: import('@supabase/supabase-js').SupabaseClient, eventId: string, status: 'processed' | 'failed', errorMessage: string | null = null): Promise<void> {
  const { error } = await sb
    .from('stripe_events')
    .update({ status, error_message: errorMessage, processed_at: new Date().toISOString() })
    .eq('event_id', eventId);
  if (error) console.error(`stripe_events: failed to mark ${eventId} ${status}:`, error.message);
}

export const handler: Handler = async (event) => {
  if (!stripe || !supabase || WEBHOOK_SECRETS.length === 0) {
    return { statusCode: 501, body: JSON.stringify({ error: 'Stripe webhook not configured' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const signature = event.headers['stripe-signature'];
  if (!signature || !event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing webhook signature or body' }) };
  }

  let stripeEvent: Stripe.Event | null = null;
  for (const secret of WEBHOOK_SECRETS) {
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, signature, secret);
      break;
    } catch {
      // Try the next configured endpoint secret.
    }
  }

  if (!stripeEvent) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Webhook signature verification failed' }) };
  }

  let claimed = false;
  try {
    const claim = await claimStripeEvent(supabase, stripeEvent);
    if (claim === 'done') {
      return { statusCode: 200, body: JSON.stringify({ received: true, skipped: true }) };
    }
    if (claim === 'busy') {
      return { statusCode: 500, body: JSON.stringify({ error: 'Event is already being processed; retry later' }) };
    }
    claimed = true;

    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session);
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(supabase, stripeEvent.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.succeeded':
        await handleMobilePaymentIntentSucceeded(supabase, stripeEvent.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(supabase, stripeEvent.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(supabase, stripeEvent.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleRefund(stripeEvent.data.object as Stripe.Charge);
        break;
      case 'charge.dispute.created':
        await handleStripeDispute(supabase, stripeEvent.data.object as Stripe.Dispute);
        break;
      case 'account.updated':
        await handleConnectAccountUpdated(stripeEvent.data.object as Stripe.Account);
        break;
      case 'transfer.created':
        await handleTransferCreated(stripeEvent.data.object as Stripe.Transfer);
        break;
      case 'payout.paid':
        await handlePayoutPaid(stripeEvent.data.object as Stripe.Payout, stripeEvent.account ?? null);
        break;
      default:
        console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
    }

    await markStripeEvent(supabase, stripeEvent.id, 'processed');
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error(`Stripe webhook ${stripeEvent.id} failed:`, error);
    if (claimed) {
      await markStripeEvent(
        supabase,
        stripeEvent.id,
        'failed',
        (error instanceof Error ? error.message : String(error)).slice(0, 500),
      );
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook processing failed' }) };
  }
};

interface CartItem {
  productId: string;
  sellerId: string;
  quantity: number;
  price: number;
  title: string;
  image: string | null;
  listingContext: 'product' | 'service';
}

interface CommercialBuyerSnapshot {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  vatNumber: string | null;
  isB2B: boolean;
  reverseCharge: boolean;
}

interface CommercialSellerSnapshot {
  id: string;
  businessName: string;
}

interface OrderData {
  commercialSnapshotVersion?: number;
  buyerSnapshot?: CommercialBuyerSnapshot;
  sellerSnapshot?: CommercialSellerSnapshot;
  items: CartItem[];
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string>;
  subtotal: number;
  chargeableSubtotal?: number;
  chargeableSubtotalPence?: number;
  shippingAmount: number;
  shippingAmountPence?: number;
  shippingMethod: string;
  total: number;
  totalPence?: number;
  buyerId: string;
  transferGroup?: string;
  reservationToken?: string;
  isB2B?: boolean;
  applyReverseCharge?: boolean;
}

function requireCommercialSnapshotEvidence(orderData: OrderData): {
  buyer: CommercialBuyerSnapshot;
  seller: CommercialSellerSnapshot;
} {
  if (orderData.commercialSnapshotVersion !== 1) {
    throw new Error('Payment session is missing commercial snapshot evidence v1');
  }

  const buyer = orderData.buyerSnapshot;
  const seller = orderData.sellerSnapshot;
  if (
    !buyer ||
    !buyer.id?.trim() ||
    !buyer.name?.trim() ||
    !buyer.email?.trim() ||
    typeof buyer.isB2B !== 'boolean' ||
    typeof buyer.reverseCharge !== 'boolean'
  ) {
    throw new Error('Payment session contains incomplete buyer snapshot evidence');
  }
  if (buyer.id !== orderData.buyerId) {
    throw new Error('Payment session buyer snapshot does not match buyerId');
  }
  if (buyer.reverseCharge && !buyer.isB2B) {
    throw new Error('Payment session contains invalid reverse-charge snapshot evidence');
  }
  if (Boolean(orderData.isB2B) !== buyer.isB2B || Boolean(orderData.applyReverseCharge) !== buyer.reverseCharge) {
    throw new Error('Payment session commercial/tax snapshot conflicts with checkout totals metadata');
  }
  if (!seller || !seller.id?.trim() || !seller.businessName?.trim()) {
    throw new Error('Payment session contains incomplete seller snapshot evidence');
  }

  for (const item of orderData.items ?? []) {
    if (
      !item?.productId?.trim() ||
      !item.sellerId?.trim() ||
      !item.title?.trim() ||
      (item.listingContext !== 'product' && item.listingContext !== 'service') ||
      !Object.prototype.hasOwnProperty.call(item, 'image') ||
      (item.image !== null && typeof item.image !== 'string') ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.price) ||
      item.price <= 0
    ) {
      throw new Error('Payment session contains incomplete or invalid product snapshot evidence');
    }
  }

  return { buyer, seller };
}

function productIdsFromMetadata(metadata: Record<string, unknown> | null | undefined): string[] {
  const items = metadata?.items;
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const id = (item as Record<string, unknown>).productId;
    return typeof id === 'string' && id ? id : null;
  }).filter((id): id is string => Boolean(id)))];
}

async function releasePaymentReservation(
  sb: import('@supabase/supabase-js').SupabaseClient,
  metadata: Record<string, unknown> | null | undefined,
): Promise<void> {
  const productIds = productIdsFromMetadata(metadata);
  const reservationToken = typeof metadata?.reservationToken === 'string'
    ? metadata.reservationToken
    : null;

  if (reservationToken && productIds.length > 0) {
    const { error } = await sb
      .from('products')
      .update({ listingStatus: 'active', reservedUntil: null, reservationToken: null })
      .in('id', productIds)
      .eq('listingStatus', 'reserved')
      .eq('reservationToken', reservationToken);
    if (error) throw error;
    return;
  }

  const { error } = await sb.rpc('release_expired_reservations');
  if (error) throw error;
}

async function claimPendingPaymentSession(
  sb: import('@supabase/supabase-js').SupabaseClient,
  sessionId: string,
  nextStatus: 'failed' | 'cancelled',
): Promise<boolean> {
  const { data, error } = await sb
    .from('payment_sessions')
    .update({ status: nextStatus })
    .eq('id', sessionId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return Boolean(data);
}

interface AtomicPaidOrderResult {
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerTotal: number;
  firstPaidTransition: boolean;
}

async function fulfilPaidOrder(
  sb: import('@supabase/supabase-js').SupabaseClient,
  paymentSessionId: string,
  paymentIntentId: string,
  orderData: OrderData,
): Promise<AtomicPaidOrderResult> {
  const items = orderData.items ?? [];
  if (!items.length) throw new Error('Payment session contains no order items');
  if (new Set(items.map((item) => item.productId)).size !== items.length) {
    throw new Error('Payment session contains duplicate product lines');
  }

  const sellerIds = [...new Set(items.map((item) => item.sellerId))];
  if (sellerIds.length !== 1) {
    throw new Error('Payment session violates single-seller checkout invariant');
  }
  const sellerId = sellerIds[0];
  const { seller: sellerSnapshot } = requireCommercialSnapshotEvidence(orderData);
  if (sellerSnapshot.id !== sellerId) {
    throw new Error('Payment session seller snapshot does not match item seller');
  }

  const configuredRate = await fetchConfiguredCommissionRate(sb);
  const commissionRate = getCommissionRate(configuredRate ?? undefined);

  const { data, error } = await sb.rpc('server_materialize_paid_order_v1', {
    p_payment_session_id: paymentSessionId,
    p_payment_intent_id: paymentIntentId,
    p_commission_rate: commissionRate,
  });
  if (error) throw error;

  const result = data as AtomicPaidOrderResult | null;
  if (
    !result ||
    typeof result.orderId !== 'string' ||
    typeof result.orderNumber !== 'string' ||
    typeof result.sellerId !== 'string' ||
    typeof result.sellerTotal !== 'number' ||
    typeof result.firstPaidTransition !== 'boolean'
  ) {
    throw new Error('Atomic paid-order materialization returned an invalid contract');
  }
  if (result.sellerId !== sellerId) {
    throw new Error('Atomic paid-order materialization returned conflicting seller identity');
  }

  if (result.firstPaidTransition) {
    await sb.from('notifications').insert({
      userId: sellerId,
      type: 'order',
      title: 'New order received',
      message: `Order ${result.orderNumber} has been placed. Total: £${result.sellerTotal.toFixed(2)}`,
      link: '/seller/orders',
    }).catch((err: unknown) => console.warn('Seller notification failed:', err));

    sendPushToUser(sb, sellerId, {
      title: 'New order received',
      body: `Order ${result.orderNumber} placed. Total: £${result.sellerTotal.toFixed(2)}`,
      data: { type: 'new_order', orderId: result.orderId },
    }).catch((err: unknown) => console.warn('Seller push failed:', err));

    if (orderData.buyerId) {
      await sb.from('notifications').insert({
        userId: orderData.buyerId,
        type: 'order',
        title: 'Order confirmed',
        message: `Your order has been placed successfully. We'll notify you when it ships.`,
        link: '/buyer/orders',
      }).catch((err: unknown) => console.warn('Buyer notification failed:', err));

      sendPushToUser(sb, orderData.buyerId, {
        title: 'Order confirmed ✓',
        body: `Your order has been placed. We'll notify you when it ships.`,
        data: { type: 'order_confirmed', orderId: result.orderId },
      }).catch((err: unknown) => console.warn('Buyer push failed:', err));
    }
  }

  return result;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== 'paid') {
    throw new Error(`Checkout session ${session.id} completed without paid status`);
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error(`Checkout session ${session.id} has no PaymentIntent`);

  const { data: pendingSession, error } = await supabase!
    .from('payment_sessions')
    .select('id, status, metadata, createdAt')
    .eq('stripeSessionId', session.id)
    .maybeSingle<{ id: string; status: string; metadata: OrderData; createdAt: string }>();

  if (error || !pendingSession) {
    throw new Error(`No payment_sessions row found for Stripe session ${session.id}`);
  }
  if (pendingSession.status === 'completed') return;
  if (pendingSession.status !== 'pending') {
    throw new Error(`Payment session ${pendingSession.id} is not processable (${pendingSession.status})`);
  }

  const orderData = pendingSession.metadata;
  const expectedPence = Number.isInteger(orderData.totalPence)
    ? Number(orderData.totalPence)
    : Math.round(Number(orderData.total) * 100);
  if (!Number.isFinite(expectedPence) || session.amount_total !== expectedPence) {
    throw new Error(`Checkout amount mismatch for session ${session.id}`);
  }
  if (session.currency?.toLowerCase() !== 'gbp') {
    throw new Error(`Unexpected checkout currency for session ${session.id}`);
  }

  const result = await fulfilPaidOrder(supabase!, pendingSession.id, paymentIntentId, orderData);

  // Email is a post-commit side effect. Never duplicate it on an idempotent
  // materialization retry that did not perform the first paid transition.
  if (!result.firstPaidTransition) return;

  const { data: sellerUser } = await supabase!
    .from('users')
    .select('email')
    .eq('id', result.sellerId)
    .maybeSingle<{ email: string }>();
  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
  };

  if (sellerUser?.email) {
    fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: sellerUser.email,
        subject: `New Order Received — ${result.orderNumber}`,
        template: 'seller_new_order',
        data: { orderNumber: result.orderNumber, orderDate: new Date().toLocaleDateString('en-GB'), items: orderData.items, sellerTotal: result.sellerTotal },
      }),
    }).catch((err: unknown) => console.warn('Seller email failed:', err));
  }

  if (session.customer_email) {
    fetch(`${appUrl}/.netlify/functions/send-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: session.customer_email,
        subject: 'Order Confirmation',
        template: 'order_confirmation',
        data: { customerName: 'Customer', orderNumber: result.orderNumber, orderDate: new Date().toLocaleDateString('en-GB'), total: expectedPence / 100, items: orderData.items },
      }),
    }).catch((err: unknown) => console.warn('Buyer email failed:', err));
  }
}

async function handleCheckoutExpired(
  sb: import('@supabase/supabase-js').SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { data: pending, error } = await sb
    .from('payment_sessions')
    .select('id, metadata')
    .eq('stripeSessionId', session.id)
    .eq('status', 'pending')
    .maybeSingle<{ id: string; metadata: Record<string, unknown> }>();
  if (error) throw error;
  if (!pending) return;

  const claimed = await claimPendingPaymentSession(sb, pending.id, 'cancelled');
  if (!claimed) return;
  await releasePaymentReservation(sb, pending.metadata);
}

async function handleMobilePaymentIntentSucceeded(
  sb: import('@supabase/supabase-js').SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { data: pendingSession, error } = await sb
    .from('payment_sessions')
    .select('id, status, metadata, createdAt')
    .eq('stripePaymentIntent', paymentIntent.id)
    .maybeSingle<{ id: string; status: string; metadata: OrderData; createdAt: string }>();

  if (error) throw error;
  if (!pendingSession || pendingSession.status === 'completed') return;
  if (pendingSession.status !== 'pending') return;

  const orderData = pendingSession.metadata;
  const expectedPence = Number.isInteger(orderData.totalPence)
    ? Number(orderData.totalPence)
    : Math.round(Number(orderData.total) * 100);
  const received = paymentIntent.amount_received || paymentIntent.amount;
  if (!Number.isFinite(expectedPence) || received !== expectedPence) {
    throw new Error(`PaymentIntent amount mismatch for ${paymentIntent.id}`);
  }
  if (paymentIntent.currency.toLowerCase() !== 'gbp') {
    throw new Error(`Unexpected PaymentIntent currency for ${paymentIntent.id}`);
  }

  await fulfilPaidOrder(sb, pendingSession.id, paymentIntent.id, orderData);
}

interface PaymentSessionWithOrder {
  orderId: string;
  orders?: { orderNumber?: string } | null;
}

async function handleRefund(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const { data: payment } = await supabase!
    .from('payment_sessions')
    .select('orderId, orders(orderNumber)')
    .eq('stripePaymentIntent', paymentIntentId)
    .maybeSingle<PaymentSessionWithOrder>();

  if (!payment?.orderId) return;

  const { error: orderError } = await supabase!
    .from('orders')
    .update({ status: 'refunded', escrowStatus: 'refunded' })
    .eq('id', payment.orderId);
  if (orderError) throw orderError;

  const { data: payout } = await supabase!
    .from('payouts')
    .select('id, stripeTransferId, status')
    .eq('orderId', payment.orderId)
    .eq('status', 'paid')
    .maybeSingle<{ id: string; stripeTransferId: string | null; status: string }>();

  if (payout?.stripeTransferId && stripe) {
    const reversal = await stripe.transfers.createReversal(
      payout.stripeTransferId,
      { metadata: { orderId: payment.orderId } },
      { idempotencyKey: `order-refund-transfer:${payment.orderId}` },
    );
    const { error: payoutError } = await supabase!
      .from('payouts')
      .update({ status: 'cancelled', reference: reversal.id, notes: `Transfer reversed after Stripe refund. Reversal ID: ${reversal.id}` })
      .eq('id', payout.id);
    if (payoutError) throw payoutError;
  }
}

export async function handlePaymentFailed(
  sb: import('@supabase/supabase-js').SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  // A failed card attempt normally returns the same PaymentIntent to
  // requires_payment_method, where Stripe expects the customer to retry it.
  // Keep the DB session pending and keep its reservation. Only a terminal
  // canceled/expired event or the Stripe-aware cleanup may release stock.
  void sb;
  console.warn(
    `payment_intent.payment_failed: ${paymentIntent.id} remains reserved for retry; status=${paymentIntent.status}`,
  );
}

async function handlePaymentIntentCanceled(
  sb: import('@supabase/supabase-js').SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const { data: pending, error } = await sb
    .from('payment_sessions')
    .select('id, metadata')
    .eq('stripePaymentIntent', paymentIntent.id)
    .eq('status', 'pending')
    .maybeSingle<{ id: string; metadata: Record<string, unknown> }>();
  if (error) throw error;
  if (!pending) return;

  const claimed = await claimPendingPaymentSession(sb, pending.id, 'cancelled');
  if (!claimed) return;
  await releasePaymentReservation(sb, pending.metadata);
}

export async function handleStripeDispute(
  sb: import('@supabase/supabase-js').SupabaseClient,
  dispute: Stripe.Dispute,
): Promise<void> {
  const paymentIntentId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : dispute.payment_intent?.id ?? null;
  if (!paymentIntentId) return;

  const { data: session } = await sb
    .from('payment_sessions')
    .select('orderId')
    .eq('stripePaymentIntent', paymentIntentId)
    .maybeSingle<{ orderId: string | null }>();
  if (!session?.orderId) return;

  const { data: order } = await sb
    .from('orders')
    .select('id, buyerId, sellerId')
    .eq('id', session.orderId)
    .single<{ id: string; buyerId: string | null; sellerId: string | null }>();
  if (!order?.buyerId || !order.sellerId) return;

  const { error } = await sb.from('disputes').insert({
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    stripeDisputeId: dispute.id,
    subject: `Stripe Chargeback — Dispute ID: ${dispute.id}`,
    description: [
      'A Stripe chargeback was raised. REQUIRES MANUAL REVIEW.',
      `Stripe Dispute ID: ${dispute.id}`,
      `Reason: ${dispute.reason}`,
      `Amount: £${(dispute.amount / 100).toFixed(2)}`,
      `Status: ${dispute.status}`,
    ].join('\n'),
    protectionReason: 'other',
    status: 'in_review',
    escrowStatus: 'held',
  });
  if (error && error.code !== '23505') throw error;
}

export async function handleConnectAccountUpdated(
  account: Stripe.Account,
  stripeClientOverride?: Stripe | null,
): Promise<void> {
  const stripeConnectStatus: 'pending' | 'restricted' | 'active' =
    account.charges_enabled && account.payouts_enabled
      ? 'active'
      : account.details_submitted
        ? 'restricted'
        : 'pending';

  const { data: updated, error } = await supabase!
    .from('seller_profiles')
    .update({
      stripeConnectStatus,
      stripeChargesEnabled: Boolean(account.charges_enabled),
      stripePayoutsEnabled: Boolean(account.payouts_enabled),
      stripeDetailsSubmitted: Boolean(account.details_submitted),
    })
    .eq('stripeAccountId', account.id)
    .select('userId');
  if (error) throw error;
  if (!updated?.length) return;

  if (stripeConnectStatus === 'active') {
    const stripeClient = stripeClientOverride ?? stripe!;
    try {
      await stripeClient.accounts.update(account.id, {
        settings: { payouts: { schedule: { delay_days: 7 } } },
      });
    } catch (payoutDelayError) {
      console.warn('account.updated: unable to set payout delay:', payoutDelayError);
    }
  }

  try {
    const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
    const sellerId = (updated[0] as { userId: string }).userId;
    const result = await tryAutoActivateSeller(supabase!, sellerId, stripeConnectStatus);
    if (!result?.firstActivation) return;

    const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
    const internalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
    };
    const activatedAt = new Date().toLocaleString('en-GB');

    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      fetch(`${appUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          to: process.env.ADMIN_NOTIFICATION_EMAIL,
          subject: 'Loadify: Seller Account Now Active',
          template: 'admin_seller_active',
          data: { activatedAt },
        }),
      }).catch((err: unknown) => console.warn('Admin activation email failed:', err));
    }

    const { data: userRow } = await supabase!
      .from('users')
      .select('email')
      .eq('id', sellerId)
      .maybeSingle<{ email: string }>();
    if (userRow?.email) {
      fetch(`${appUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          to: userRow.email,
          subject: 'Your Loadify Market store is now live!',
          template: 'seller_account_active',
          data: { activatedAt },
        }),
      }).catch((err: unknown) => console.warn('Seller activation email failed:', err));
    }
  } catch (activationError) {
    console.warn('account.updated: auto-activation check failed:', activationError);
  }
}

export async function handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
  const orderId = typeof transfer.metadata?.orderId === 'string' ? transfer.metadata.orderId : null;
  if (!orderId) return;

  const { error } = await supabase!
    .from('payouts')
    .update({ status: 'paid', notes: `Transfer confirmed by Stripe webhook. Transfer ID: ${transfer.id}` })
    .eq('orderId', orderId)
    .eq('stripeTransferId', transfer.id);
  if (error) console.error('transfer.created payout update failed:', error.message);
}

export async function handlePayoutPaid(
  payout: Stripe.Payout,
  connectedAccountId: string | null,
): Promise<void> {
  if (!connectedAccountId) return;

  const { data: sellerProfile } = await supabase!
    .from('seller_profiles')
    .select('userId')
    .eq('stripeAccountId', connectedAccountId)
    .maybeSingle<{ userId: string }>();
  if (!sellerProfile?.userId) return;

  const { error } = await supabase!
    .from('payouts')
    .update({
      stripePayoutId: payout.id,
      paidAt: new Date(payout.arrival_date * 1000).toISOString(),
      notes: `Bank payout confirmed by Stripe. Payout ID: ${payout.id}`,
    })
    .eq('sellerId', sellerProfile.userId)
    .eq('status', 'paid')
    .is('stripePayoutId', null);
  if (error) console.error('payout.paid DB update failed:', error.message);
}
