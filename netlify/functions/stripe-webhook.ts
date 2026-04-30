import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';

// Collect all available webhook signing secrets.
// STRIPE_WEBHOOK_SECRET       — standard account webhook (checkout events)
// STRIPE_CONNECT_WEBHOOK_SECRET — Connect platform webhook (account.updated events)
// At least one must be set; both can be set simultaneously when you register
// two separate webhook endpoints in the Stripe Dashboard.
const WEBHOOK_SECRETS = [
  process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim(),
].filter((s): s is string => s !== undefined && s.length > 0);

if (!process.env.STRIPE_SECRET_KEY || WEBHOOK_SECRETS.length === 0) {
  console.warn('Stripe webhook not configured - missing environment variables');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
      apiVersion: '2025-08-27.basil',
    })
  : null;

const supabase = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

// ── 0% Commission Promotion ───────────────────────────────────────────────────
// The platform charges 0% commission on all transactions until
// 31 December 2026 23:59:59 GMT (= 23:59:59 UTC). After that date the normal
// configured commission rate resumes automatically without any manual intervention.
//
// Exported so the unit test can reference the exact deadline value.
export const ZERO_COMMISSION_PROMO_END_UTC = new Date('2026-12-31T23:59:59Z').getTime();

/** Default post-promo commission rate used as a fallback if DB read fails. */
export const DEFAULT_COMMISSION_RATE = 0.07;

/**
 * Returns the effective commission rate for the current moment.
 *   - 0          during the promotion  (now < ZERO_COMMISSION_PROMO_END_UTC)
 *   - configuredRate (or DEFAULT_COMMISSION_RATE) once the promotion ends
 *
 * Exported for unit testing — use vi.useFakeTimers / vi.setSystemTime to
 * pin Date.now() to a specific point in time when testing.
 *
 * @param configuredRate - The commission rate from platform_settings (as a
 *   fraction, e.g. 0.07 for 7%). When omitted the DEFAULT_COMMISSION_RATE is used.
 */
export function getCommissionRate(configuredRate?: number): number {
  if (Date.now() < ZERO_COMMISSION_PROMO_END_UTC) return 0;
  return typeof configuredRate === 'number' && configuredRate >= 0 ? configuredRate : DEFAULT_COMMISSION_RATE;
}

/**
 * Reads the platform-configured commission rate from platform_settings.
 * Returns null when the setting is absent or unreadable (caller should fall
 * back to DEFAULT_COMMISSION_RATE). The admin stores commissionRate as a
 * percentage (e.g. 7 = 7%), so we divide by 100 before returning.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchConfiguredCommissionRate(sb: import('@supabase/supabase-js').SupabaseClient<any>): Promise<number | null> {
  try {
    const { data } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_config')
      .maybeSingle<{ value: unknown }>();
    if (!data?.value) return null;
    const val = typeof data.value === 'object' && data.value !== null
      ? (data.value as Record<string, unknown>)
      : null;
    const raw = val?.commissionRate;
    if (typeof raw !== 'number' || raw < 0) return null;
    // Admin stores as percentage (e.g. 7 for 7%); convert to fraction
    return raw / 100;
  } catch {
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  // Return 501 if not configured — require at least one webhook signing secret.
  if (!stripe || !supabase || WEBHOOK_SECRETS.length === 0) {
    return { 
      statusCode: 501, 
      body: JSON.stringify({ error: 'Stripe webhook not configured' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No signature' }),
    };
  }

  let stripeEvent: Stripe.Event | null = null;

  // Try each available signing secret in order. This allows one endpoint to
  // serve both the standard account webhook (STRIPE_WEBHOOK_SECRET) and the
  // Stripe Connect webhook (STRIPE_CONNECT_WEBHOOK_SECRET) simultaneously,
  // which is the recommended setup for Connect platforms.
  for (const secret of WEBHOOK_SECRETS) {
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body!, sig, secret);
      break; // verified successfully
    } catch {
      // try next secret
    }
  }

  if (!stripeEvent) {
    console.error('Webhook signature verification failed with all available secrets');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' }),
    };
  }

  try {
    // ── Event-level idempotency via stripe_events table ────────────────────
    // Insert the event ID before processing. If the ID already exists
    // (UNIQUE constraint), the insert fails and we skip processing to
    // avoid duplicate orders / double stock decrements on Stripe retries.
    if (supabase) {
      const { error: dedupError } = await supabase
        .from('stripe_events')
        .insert({
          event_id:   stripeEvent.id,
          event_type: stripeEvent.type,
          livemode:   stripeEvent.livemode,
          status:     'processed',
        });

      if (dedupError) {
        if (dedupError.code === '23505') {
          // Unique violation — already processed
          console.log(`stripe_events: duplicate event ${stripeEvent.id} (${stripeEvent.type}) — skipping`);
          return { statusCode: 200, body: JSON.stringify({ received: true, skipped: true }) };
        }
        // Any other DB error means we cannot guarantee idempotency — abort
        // to prevent duplicate orders on Stripe retries.
        console.error(`stripe_events insert failed for ${stripeEvent.id}, aborting to preserve idempotency: ${dedupError.message}`);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Idempotency check failed — event not processed' }),
        };
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        // For web checkout the orders are already created by checkout.session.completed
        // (which fires before payment_intent.succeeded).  For mobile the payment
        // session is pre-populated by create-payment-intent.ts with
        // stripePaymentIntent set at insert time (status='pending'), so the handler
        // below will pick it up and create orders. Web pending sessions do NOT have
        // stripePaymentIntent set at insert time, so they are never matched here.
        await handleMobilePaymentIntentSucceeded(supabase!, stripe!, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        console.error('PaymentIntent failed:', paymentIntent.id);
        await handlePaymentFailed(supabase!, paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      // ── Stripe charge dispute (chargeback) ────────────────────────────────
      // Triggered when a buyer raises a dispute / chargeback with their bank.
      // We store the dispute record and mark the linked order for manual review.
      // We do NOT auto-refund or auto-close — admin must handle each dispute.
      case 'charge.dispute.created': {
        const dispute = stripeEvent.data.object as Stripe.Dispute;
        await handleStripeDispute(supabase!, dispute);
        break;
      }
      // ──────────────────────────────────────────────────────────────────────

      // ── Stripe Connect account status updates ──────────────────────────────
      // Triggered by Stripe when a connected Express account's verification
      // state changes (e.g. seller completes onboarding, payouts are enabled,
      // or restrictions are added). Keeps our DB in sync automatically.
      case 'account.updated': {
        const account = stripeEvent.data.object as Stripe.Account;
        await handleConnectAccountUpdated(account);
        break;
      }
      // ──────────────────────────────────────────────────────────────────────

      // ── Stripe Connect transfer confirmation ──────────────────────────────
      // Fired when a transfer to a seller's connected account is created.
      // We log the transfer and update the corresponding payouts row (matched
      // by stripeTransferId) so the admin audit trail is complete.
      case 'transfer.created': {
        const transfer = stripeEvent.data.object as Stripe.Transfer;
        await handleTransferCreated(transfer);
        break;
      }
      // ──────────────────────────────────────────────────────────────────────

      // ── Stripe payout to seller's bank account ────────────────────────────
      // Fired when Stripe pays out a seller's connected-account balance to
      // their bank. We update the matching payouts row with the Stripe payout
      // ID so the seller and admin can see the settled amount.
      case 'payout.paid': {
        const payout = stripeEvent.data.object as Stripe.Payout;
        // stripeEvent.account is set on Connect webhooks and identifies the
        // connected seller account that triggered the payout.
        await handlePayoutPaid(payout, stripeEvent.account ?? null);
        break;
      }
      // ──────────────────────────────────────────────────────────────────────

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Mark the event as failed in stripe_events so admin can see it
    if (supabase) {
      await supabase
        .from('stripe_events')
        .update({
          status:        'failed',
          error_message: error instanceof Error ? error.message : String(error),
        })
        .eq('event_id', stripeEvent.id)
        .catch((e: unknown) => console.error('Failed to update stripe_events status:', e));
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // ── Idempotency guard ──────────────────────────────────────────────────────
  // The primary idempotency guarantee comes from the stripe_events table INSERT
  // with a UNIQUE constraint on event_id performed in the main handler.
  // We add a secondary check: if this session already has a 'completed'
  // payment_sessions record, skip. (The 'pending' record is written by
  // create-checkout.ts before the customer is redirected to Stripe, so we must
  // filter by status='completed' to avoid false-positive skips.)
  const sessionCheckResult = await supabase!
    .from('payment_sessions')
    .select('id')
    .eq('stripeSessionId', session.id)
    .eq('status', 'completed')
    .maybeSingle();

  if (sessionCheckResult.data) {
    console.log(`Idempotency: checkout session ${session.id} already processed — skipping`);
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Fetch pre-populated order data from payment_sessions ──────────────────
  // create-checkout.ts writes a 'pending' record with all order details before
  // redirecting the customer to Stripe, avoiding Stripe's 500-char metadata
  // limit and ensuring sellerId / price integrity (values come from the DB).
  const { data: pendingSession, error: pendingError } = await supabase!
    .from('payment_sessions')
    .select('id, metadata')
    .eq('stripeSessionId', session.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingError || !pendingSession) {
    throw new Error(
      `No pending payment_sessions record found for Stripe session ${session.id}. ` +
      'This may indicate create-checkout did not complete successfully.'
    );
  }

  // CartItem interface — matches the shape written by create-checkout.ts
  interface CartItem {
    productId: string;
    sellerId: string;
    quantity: number;
    price: number;
    title: string;
  }

  interface OrderData {
    items: CartItem[];
    shippingAddress: Record<string, string>;
    billingAddress: Record<string, string>;
    subtotal: number;
    shippingAmount: number;
    shippingMethod: string;
    total: number;
    buyerId: string;
    transferGroup: string;
    isB2B?: boolean;
    applyReverseCharge?: boolean;
  }

  const orderData = pendingSession.metadata as OrderData;
  const items: CartItem[] = orderData.items;
  const shippingAddress = orderData.shippingAddress;
  const billingAddress = orderData.billingAddress;
  const transferGroup = orderData.transferGroup;

  if (!items?.length) throw new Error('Order data contains no items');

  // ── Split items by seller ──────────────────────────────────────────────────
  // The marketplace model requires one order per seller so each seller only
  // sees their own items and is responsible for shipping their portion.
  const sellerGroups = new Map<string, CartItem[]>();
  for (const item of items) {
    const group = sellerGroups.get(item.sellerId) ?? [];
    group.push(item);
    sellerGroups.set(item.sellerId, group);
  }

  const VAT_RATE = 0.20;
  // Dynamic commission rate: 0% during the promo period, admin-configured rate after.
  // Read from platform_settings for live admin control; fall back to DEFAULT_COMMISSION_RATE.
  const configuredRate = await fetchConfiguredCommissionRate(supabase);
  const COMMISSION_RATE = getCommissionRate(configuredRate ?? undefined);
  const totalShipping = orderData.shippingAmount ?? 0;
  const totalSubtotal = orderData.subtotal;

  let firstOrderId: string | null = null;

  for (const [sellerId, sellerItems] of sellerGroups) {
    // item.price in the enriched metadata is always the VAT-inclusive DB price.
    // For B2B reverse charge, Stripe was charged the ex-VAT amount
    // (item.price / 1.20), but the metadata still stores the original price.
    // sellerSubtotal = item.price / (1 + VAT_RATE) gives the ex-VAT amount
    // which equals what Stripe charged — correct in both B2C and B2B cases.
    // For B2B reverse charge: vatAmount = 0 (customer accounts for VAT).
    const isReverseCharge = Boolean(orderData.applyReverseCharge);
    const sellerSubtotal = sellerItems.reduce(
      (sum, i) => sum + (i.price / (1 + VAT_RATE)) * i.quantity,
      0
    );
    const sellerVat = isReverseCharge
      ? 0
      : sellerItems.reduce(
          (sum, i) => sum + i.price * (VAT_RATE / (1 + VAT_RATE)) * i.quantity,
          0
        );
    // Distribute shipping proportionally by ex-VAT order value
    const sellerShipping =
      totalSubtotal > 0 ? (sellerSubtotal / totalSubtotal) * totalShipping : 0;
    const sellerGrandTotal = sellerSubtotal + sellerVat + sellerShipping;
    const sellerCommission = sellerSubtotal * COMMISSION_RATE;
    const primaryItem = sellerItems[0];

    // Create one order row for this seller
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          buyerId: orderData.buyerId || null,
          sellerId,
          productId: primaryItem.productId,
          quantity: sellerItems.reduce((sum, i) => sum + i.quantity, 0),
          subtotal: sellerSubtotal,
          vatAmount: sellerVat,
          shippingAmount: sellerShipping,
          total: sellerGrandTotal,
          commission: sellerCommission,
          status: 'paid',
          escrowStatus: 'held',
          shippingAddress,
          billingAddress,
          shippingMethod: orderData.shippingMethod || 'Standard',
          isB2B: Boolean(orderData.isB2B),
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error(`Error creating order for seller ${sellerId}:`, orderError);
      throw orderError;
    }

    if (!firstOrderId) firstOrderId = order.id;

    // Create order items — subtotal is ex-VAT to match orders.subtotal semantics.
    const orderItems = sellerItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      pricePerUnit: item.price,
      vatRate: VAT_RATE,
      subtotal: (item.price / (1 + VAT_RATE)) * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Roll back the orphaned order to keep the DB consistent.
      await supabase
        .from('orders')
        .delete()
        .eq('id', order.id)
        .catch((e: unknown) => console.error('Failed to delete orphaned order after items insert failure:', e));
      throw itemsError;
    }

    // Atomically decrement stock for each purchased goods listing.
    // Service listings (listingContext = 'service') have no inventory — skip.
    for (const item of sellerItems) {
      // Check listingContext before decrementing stock
      const { data: productMeta } = await supabase
        .from('products')
        .select('listingContext, stockQuantity')
        .eq('id', item.productId)
        .single<{ listingContext: string | null; stockQuantity: number }>();

      if (productMeta?.listingContext === 'service') {
        continue; // service listings have no stock to decrement
      }

      const { error: rpcError } = await supabase.rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_qty: item.quantity,
      });

      if (rpcError) {
        // RPC not yet deployed — fall back to a conditional (CAS) update that
        // only writes if the stock value has not changed since we read it,
        // preventing a race condition between two concurrent orders.
        console.warn('decrement_product_stock RPC failed, using fallback:', rpcError.message);
        const currentQty = productMeta?.stockQuantity ?? 0;
        const newQty = Math.max(0, currentQty - item.quantity);
        const newStatus =
          newQty <= 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock';

        const { count } = await supabase
          .from('products')
          .update({ stockQuantity: newQty, stockStatus: newStatus })
          .eq('id', item.productId)
          .eq('stockQuantity', currentQty) // CAS: only update if unchanged
          .select('id', { count: 'exact', head: true });

        if (!count || count === 0) {
          console.warn(`Stock decrement fallback: stock for product ${item.productId} changed concurrently — skipping update to avoid corruption`);
        }
      }

      // Mark this goods listing as sold — consistent with handleMobilePaymentIntentSucceeded.
      // Without this, a product paid for via web checkout would remain 'active' and
      // could be added to another buyer's cart immediately after payment.
      await supabase!
        .from('products')
        .update({ listingStatus: 'sold', reservedUntil: null })
        .eq('id', item.productId);
    }

    const confirmedOrderNumber: string =
      (order as { orderNumber?: string }).orderNumber ?? order.id;
    console.log(`Seller order ${confirmedOrderNumber} created for seller ${sellerId}`);

    // Credit seller balance (net of commission) using the DB RPC.
    const { error: balanceError } = await supabase!.rpc('credit_seller_balance', {
      p_seller_id: sellerId,
      p_order_id: order.id,
    });
    if (balanceError) {
      // PostgREST code 42883 = "function does not exist" — the RPC is missing
      // from the database. Log an actionable message so the on-call engineer
      // knows exactly which migration to re-apply and which order was affected.
      if ((balanceError as { code?: string }).code === '42883') {
        console.error(
          `credit_seller_balance RPC does not exist in the database. ` +
          `Re-apply 90_launch_features.sql (or the migration that defines this function). ` +
          `Affected: seller=${sellerId}, order=${order.id}`,
        );
      } else {
        console.warn('credit_seller_balance RPC failed:', balanceError.message);
      }
    }

    // ── Stripe Connect automatic Transfer ────────────────────────────────────
    // If the seller has a fully-active Stripe Connect Express account, create
    // an automatic Transfer for their net payout (order total minus commission).
    // This is the "separate charges and transfers" model: the platform collects
    // the full payment and then pushes funds to each connected seller account.
    // transfer_group links all transfers for this checkout back to the same
    // originating payment, satisfying Stripe Connect compliance requirements.
    // Falls back gracefully: sellers without Connect continue to use the manual
    // payout / credit_seller_balance flow above.
    const { data: sellerConnectProfile } = await supabase!
      .from('seller_profiles')
      .select('stripeAccountId, stripeConnectStatus')
      .eq('userId', sellerId)
      .single<{ stripeAccountId: string | null; stripeConnectStatus: string | null }>();

    if (
      sellerConnectProfile?.stripeAccountId &&
      sellerConnectProfile.stripeConnectStatus === 'active'
    ) {
      const netSellerAmount = sellerGrandTotal - sellerCommission;
      try {
        if (!transferGroup) {
          // transferGroup is set by create-checkout.ts for all sessions created
          // after the Connect activation. Missing means the order was placed
          // before the code was deployed — proceed without it but log for audit.
          console.warn(
            `stripe-webhook: transferGroup missing from order data for session ${session.id} — ` +
            'transfer will proceed without transfer_group (legacy order before Connect activation)'
          );
        }

        const transfer = await stripe!.transfers.create({
          amount: Math.round(netSellerAmount * 100), // convert to pence
          currency: 'gbp',
          destination: sellerConnectProfile.stripeAccountId,
          // Link this transfer to the originating payment so Stripe can
          // properly associate payouts with the charge in its Dashboard.
          ...(transferGroup ? { transfer_group: transferGroup } : {}),
          metadata: { orderId: order.id, sellerId },
        });

        await supabase!.from('payouts').insert({
          sellerId,
          orderId: order.id,
          amount: netSellerAmount,
          currency: 'GBP',
          status: 'paid',
          stripeTransferId: transfer.id,
          paidAt: new Date().toISOString(),
        });

        console.log(
          `Stripe transfer ${transfer.id} created for seller ${sellerId}: £${netSellerAmount.toFixed(2)}`
        );
      } catch (transferError) {
        // Log but do not throw — the order is already recorded. Admin can
        // investigate and retry the transfer from the Stripe Dashboard.
        console.error(`Stripe Connect transfer failed for seller ${sellerId}:`, transferError);

        // Record the failure in the payouts table so admins can see it in the
        // payouts dashboard and take corrective action (manual Stripe transfer).
        // Sanitise the error: include only the generic message, not any raw
        // Stripe object that might contain card/account details.
        const errMsg = transferError instanceof Error
          ? transferError.message.substring(0, 200)
          : 'Unknown transfer error';
        await supabase!.from('payouts').insert({
          sellerId,
          orderId: order.id,
          amount: netSellerAmount,
          currency: 'GBP',
          status: 'failed',
          notes: `Automatic Stripe Connect transfer failed: ${errMsg}`,
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Send seller new-order notification email (async, don't wait).
    const { data: sellerUser } = await supabase!
      .from('users')
      .select('email')
      .eq('id', sellerId)
      .single<{ email: string }>();

    if (sellerUser?.email) {
      fetch(`${(process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '')}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
        },
        body: JSON.stringify({
          to: sellerUser.email,
          subject: `New Order Received — ${confirmedOrderNumber}`,
          template: 'seller_new_order',
          data: {
            orderNumber: confirmedOrderNumber,
            orderDate: new Date().toLocaleDateString('en-GB'),
            items: sellerItems.map((i) => ({
              title: i.title,
              quantity: i.quantity,
              price: i.price,
            })),
            sellerTotal: sellerGrandTotal,
          },
        }),
      }).catch(err => console.error('Seller email send failed:', err));
    }

    // Insert in-app notification for seller — fire-and-forget, non-blocking
    supabase!.from('notifications').insert({
      userId: sellerId,
      type: 'order',
      title: 'New order received',
      message: `Order ${confirmedOrderNumber} has been placed. Total: £${sellerGrandTotal.toFixed(2)}`,
      link: '/pp/seller/orders',
    }).catch((err: unknown) => console.warn('Seller notification insert failed (non-fatal):', err));

    // Push notification to seller (mobile — non-fatal)
    sendPushToUser(supabase!, sellerId, {
      title: 'New order received',
      body: `Order ${confirmedOrderNumber} placed. Total: £${sellerGrandTotal.toFixed(2)}`,
      data: { type: 'new_order', orderId: order.id },
    }).catch((err: unknown) => console.warn('Seller push notification failed (non-fatal):', err));
  }

  // Insert in-app notification for buyer — fire-and-forget, non-blocking
  if (orderData.buyerId) {
    supabase!.from('notifications').insert({
      userId: orderData.buyerId,
      type: 'order',
      title: 'Order confirmed',
      message: `Your order has been placed successfully. We'll notify you when it ships.`,
      link: '/pp/buyer/orders',
    }).catch((err: unknown) => console.warn('Buyer notification insert failed (non-fatal):', err));

    // Push notification to buyer (mobile — non-fatal)
    sendPushToUser(supabase!, orderData.buyerId, {
      title: 'Order confirmed ✓',
      body: `Your order has been placed. We'll notify you when it ships.`,
      data: { type: 'order_confirmed', orderId: firstOrderId ?? '' },
    }).catch((err: unknown) => console.warn('Buyer push notification failed (non-fatal):', err));
  }

  // Mark the pre-populated payment_sessions record as completed now that all
  // orders have been created. Also record the payment intent and order link.
  await supabase!
    .from('payment_sessions')
    .update({
      orderId: firstOrderId,
      stripePaymentIntent: session.payment_intent as string,
      amount: orderData.total,
      status: 'completed',
    })
    .eq('id', pendingSession.id);

  // Send buyer confirmation email (async, don't wait)
  const sellerCount = sellerGroups.size;
  const subjectSuffix = sellerCount > 1 ? ` (${sellerCount} sellers)` : '';
  fetch(`${(process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '')}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
    },
    body: JSON.stringify({
      to: session.customer_email,
      subject: `Order Confirmation${subjectSuffix}`,
      template: 'order_confirmation',
      data: {
        customerName: 'Customer',
        orderNumber: firstOrderId ?? 'unknown',
        orderDate: new Date().toLocaleDateString('en-GB'),
        total: orderData.total,
        items: (items as CartItem[]).map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    }),
  }).catch(err => console.error('Email send failed:', err));

  console.log(`Checkout session ${session.id} processed: ${sellerGroups.size} seller order(s) created`);
}

interface PaymentSessionWithOrder {
  orderId: string;
  orders?: { orderNumber?: string } | null;
}

async function handleRefund(charge: Stripe.Charge) {
  const { data: payment } = await supabase!
    .from('payment_sessions')
    .select('orderId, orders(orderNumber)')
    .eq('stripePaymentIntent', charge.payment_intent)
    .single<PaymentSessionWithOrder>();

  if (payment?.orderId) {
    await supabase!
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', payment.orderId);

    const orderNumber = payment.orders?.orderNumber ?? payment.orderId;
    console.log(`Order ${orderNumber} refunded`);
  }
}

/**
 * Handles payment_intent.payment_failed events.
 *
 * 1. Finds the pending payment_sessions record:
 *    - Mobile sessions: matched by stripePaymentIntent = paymentIntent.id
 *      (set at insert time by create-payment-intent.ts)
 *    - Web sessions:    matched by metadata->>'transferGroup' = transfer_group
 *      (stripePaymentIntent is not set at insert time for web sessions)
 * 2. Marks the session as 'failed'.
 * 3. Immediately releases any product reservations (listingStatus → 'active')
 *    listed in session.metadata.items so the items become purchasable again
 *    without waiting for the 15-minute scheduled expiry.
 *
 * Exported for unit testing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handlePaymentFailed(sb: import('@supabase/supabase-js').SupabaseClient<any>, paymentIntent: Stripe.PaymentIntent): Promise<void> {
  // ── 1. Locate the pending session ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessionData: { id: string; metadata: Record<string, any> } | null = null;

  // Mobile path: stripePaymentIntent is set at insert time, so we can look up
  // the session directly by PaymentIntent ID.
  const { data: mobileSession, error: mobileErr } = await sb
    .from('payment_sessions')
    .select('id, metadata')
    .eq('stripePaymentIntent', paymentIntent.id)
    .eq('status', 'pending')
    .maybeSingle<{ id: string; metadata: Record<string, unknown> }>();

  if (mobileErr) {
    console.error(`payment_intent.payment_failed: mobile session lookup error for PI ${paymentIntent.id}:`, mobileErr.message);
  }

  if (mobileSession) {
    sessionData = mobileSession;
  } else {
    // Web path: fall back to matching by transferGroup stored in metadata JSON.
    const transferGroup = paymentIntent.transfer_group ?? null;
    if (!transferGroup) {
      console.warn(
        `payment_intent.payment_failed: no mobile session and no transfer_group for PI ${paymentIntent.id} — cannot locate session`,
      );
      return;
    }

    const { data: webSession, error: webErr } = await sb
      .from('payment_sessions')
      .select('id, metadata')
      .eq('status', 'pending')
      .filter('metadata->>transferGroup', 'eq', transferGroup)
      .maybeSingle<{ id: string; metadata: Record<string, unknown> }>();

    if (webErr) {
      console.error(`payment_intent.payment_failed: web session lookup error for transfer_group ${transferGroup}:`, webErr.message);
      return;
    }

    sessionData = webSession;
  }

  if (!sessionData) {
    // No matching pending session — may have already been processed or cancelled.
    console.warn(`payment_intent.payment_failed: no pending session found for PI ${paymentIntent.id} — nothing to do`);
    return;
  }

  // ── 2. Mark session as failed ─────────────────────────────────────────────
  const { error: updateErr } = await sb
    .from('payment_sessions')
    .update({ status: 'failed' })
    .eq('id', sessionData.id)
    .eq('status', 'pending'); // guard against double-processing

  if (updateErr) {
    console.error(
      `payment_intent.payment_failed: failed to mark session ${sessionData.id} as failed:`,
      updateErr.message,
    );
    // Continue — still attempt to release reservations even if status update failed.
  }

  // ── 3. Release product reservations immediately ───────────────────────────
  // Without this, reserved products stay locked for up to 15 minutes until the
  // scheduled release_expired_reservations() RPC runs.
  const items = sessionData.metadata?.items as Array<{ productId?: string }> | undefined;

  if (!items?.length) {
    console.log(`payment_intent.payment_failed: session ${sessionData.id} marked failed (no items to unreserve)`);
    return;
  }

  let releasedCount = 0;
  for (const item of items) {
    if (!item.productId) continue;

    const { error: releaseErr } = await sb
      .from('products')
      .update({ listingStatus: 'active', reservedUntil: null })
      .eq('id', item.productId)
      .eq('listingStatus', 'reserved'); // only release if still reserved (idempotent)

    if (releaseErr) {
      console.warn(
        `payment_intent.payment_failed: could not release reservation for product ${item.productId} (non-fatal):`,
        releaseErr.message,
      );
    } else {
      releasedCount++;
    }
  }

  console.log(
    `payment_intent.payment_failed: session ${sessionData.id} marked failed; ` +
    `${releasedCount}/${items.length} reservation(s) released for PI ${paymentIntent.id}`,
  );
}

/**
 * Handles charge.dispute.created events (Stripe chargebacks).
 *
 * Stores a dispute record in the disputes table so admin can see the
 * chargeback and act on it manually. We do NOT auto-refund or auto-close.
 * The order is NOT status-updated because 'disputed' is not in the schema
 * check constraint — admin must update manually via the orders UI.
 *
 * Exported for unit testing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleStripeDispute(sb: import('@supabase/supabase-js').SupabaseClient<any>, dispute: Stripe.Dispute): Promise<void> {
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    console.warn('charge.dispute.created: no payment_intent on dispute', dispute.id);
    return;
  }

  // Find the payment session linked to this PaymentIntent.
  const { data: session } = await sb
    .from('payment_sessions')
    .select('orderId')
    .eq('stripePaymentIntent', paymentIntentId)
    .maybeSingle<{ orderId: string | null }>();

  if (!session?.orderId) {
    console.warn(
      `charge.dispute.created: no order found for payment_intent ${paymentIntentId} — dispute ${dispute.id} not recorded`,
    );
    return;
  }

  // Fetch buyer/seller IDs from the linked order.
  const { data: order } = await sb
    .from('orders')
    .select('id, buyerId, sellerId')
    .eq('id', session.orderId)
    .single<{ id: string; buyerId: string | null; sellerId: string | null }>();

  if (!order?.buyerId || !order?.sellerId) {
    console.warn(
      `charge.dispute.created: order ${session.orderId} missing buyer/seller ids — dispute ${dispute.id} not recorded`,
    );
    return;
  }

  const { error } = await sb.from('disputes').insert({
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    subject: `Stripe Chargeback — Dispute ID: ${dispute.id}`,
    description: [
      `A Stripe chargeback was raised. REQUIRES MANUAL REVIEW.`,
      `Stripe Dispute ID: ${dispute.id}`,
      `Reason: ${dispute.reason}`,
      `Amount: £${(dispute.amount / 100).toFixed(2)}`,
      `Status: ${dispute.status}`,
    ].join('\n'),
    protectionReason: 'other',
    status: 'in_review',
    escrowStatus: 'held',
  });

  if (error) {
    console.error(
      `charge.dispute.created: failed to insert dispute record for ${dispute.id}:`,
      error.message,
    );
  } else {
    console.log(`charge.dispute.created: dispute ${dispute.id} recorded for order ${order.id}`);
  }
}

/**
 * Handles Stripe Connect `account.updated` webhook events.
 *
 * Stripe sends this event whenever a connected Express account's state
 * changes — e.g. the seller completes onboarding, payouts become enabled,
 * or Stripe adds a restriction. We map the live account flags to our
 * three-state stripeConnectStatus and persist it so the seller dashboard
 * reflects the current state without needing a separate status-sync call.
 *
 * After updating stripeConnectStatus, we call tryAutoActivateSeller to
 * automatically activate the seller if all conditions are now met.
 *
 * When a seller first becomes fully active, we also configure a 7-day payout
 * delay on their connected account (Phase 2A owner-protection). This reduces
 * the window in which the platform could be left holding a chargeback after
 * funds have already been paid out to the seller.
 *
 * The `stripeClientOverride` parameter is accepted for unit-test injection
 * only — production calls omit it and the module-level `stripe` singleton is
 * used instead.
 *
 * Exported for unit testing.
 */
export async function handleConnectAccountUpdated(
  account: Stripe.Account,
  stripeClientOverride?: Stripe | null,
) {
  let stripeConnectStatus: 'pending' | 'restricted' | 'active';

  if (account.charges_enabled && account.payouts_enabled) {
    stripeConnectStatus = 'active';
  } else if (account.details_submitted) {
    stripeConnectStatus = 'restricted';
  } else {
    stripeConnectStatus = 'pending';
  }

  const { data: updated, error } = await supabase!
    .from('seller_profiles')
    .update({ stripeConnectStatus })
    .eq('stripeAccountId', account.id)
    .select('userId');

  if (error) {
    console.error(`account.updated: failed to update seller_profiles for ${account.id}:`, error.message);
    return;
  }

  if (!updated || updated.length === 0) {
    console.warn(`account.updated: no seller_profiles row found for stripeAccountId=${account.id} — skipping`);
    return;
  }

  console.log(`account.updated: ${account.id} → stripeConnectStatus=${stripeConnectStatus}`);

  // ── Phase 2A: Payout delay for newly-active connected accounts ────────────
  // When a seller's Connect account first becomes fully active, configure a
  // 7-day payout delay on their connected account. This means Stripe will not
  // automatically pay out their balance until 7 days after each transaction,
  // reducing the window where funds could have already been paid out before a
  // dispute or refund is raised against the platform.
  // This is a best-effort call: if Stripe rejects it (e.g. the account type
  // does not support platform-controlled payout schedules) we log the error and
  // continue — we must not block or corrupt the seller's activation state.
  if (stripeConnectStatus === 'active') {
    const stripeClient = stripeClientOverride ?? stripe!;
    try {
      await stripeClient.accounts.update(account.id, {
        settings: { payouts: { schedule: { delay_days: 7 } } },
      });
      console.log(`account.updated: 7-day payout delay set for connected account ${account.id}`);
    } catch (payoutDelayErr) {
      console.warn(
        `account.updated: failed to set payout delay for ${account.id} (non-fatal — seller activation proceeds):`,
        payoutDelayErr,
      );
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Auto-activation check ──────────────────────────────────────────────
  // Import lazily so this module stays loadable even when the helper file is
  // temporarily absent (e.g. first deploy before functions are bundled).
  try {
    const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
    const sellerId = (updated[0] as { userId: string }).userId;
    const result = await tryAutoActivateSeller(supabase!, sellerId, stripeConnectStatus);

    if (result?.firstActivation) {
      // Send notifications — fire-and-forget, non-blocking.
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
      const activatedAt = new Date().toLocaleString('en-GB');
      const internalHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      };

      // Notify admin
      if (adminEmail) {
        fetch(`${appUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({
            to: adminEmail,
            subject: 'Loadify: Seller Account Now Active',
            template: 'admin_seller_active',
            data: { activatedAt },
          }),
        }).catch((err: unknown) => console.warn('account.updated: admin notification failed (non-fatal):', err));
      }

      // Notify the seller themselves — look up their email from the users table
      const { data: userRow } = await supabase!
        .from('users')
        .select('email')
        .eq('id', sellerId)
        .single<{ email: string }>();
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
        }).catch((err: unknown) => console.warn('account.updated: seller activation email failed (non-fatal):', err));
      }
    }
  } catch (activationError) {
    // Non-fatal: the stripeConnectStatus update already succeeded above.
    // Activation will be re-evaluated next time connect-status is called.
    console.warn('account.updated: auto-activation check failed (non-fatal):', activationError);
  }
  // ──────────────────────────────────────────────────────────────────────
}

/**
 * Handles `transfer.created` events.
 *
 * Fired by Stripe when a transfer to a seller's connected Express account is
 * successfully created (immediately after stripe.transfers.create() returns).
 * We match the transfer to a payouts row by stripeTransferId and confirm the
 * status is 'paid' for the audit trail.
 * If no matching row is found the event is still acknowledged — the webhook
 * handler already inserts a payouts row synchronously during
 * checkout.session.completed processing, so misses here are harmless.
 *
 * Exported for unit testing.
 */
export async function handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
  const orderId = typeof transfer.metadata?.orderId === 'string' ? transfer.metadata.orderId : null;

  console.log(
    `transfer.created: ${transfer.id} — amount £${(transfer.amount / 100).toFixed(2)} ` +
      `→ destination ${String(transfer.destination)} | orderId=${orderId ?? 'unknown'}`,
  );

  if (!orderId) {
    // Transfer was not originated by our checkout flow (e.g. a manual transfer).
    // Log and skip — nothing to link.
    console.warn(`transfer.created: no orderId in metadata for transfer ${transfer.id} — skipping DB update`);
    return;
  }

  // Update the payout row that was inserted during checkout.session.completed.
  // stripeTransferId is already set; we confirm status is 'paid'.
  const { error } = await supabase!
    .from('payouts')
    .update({ status: 'paid', notes: `Transfer confirmed by Stripe webhook. Transfer ID: ${transfer.id}` })
    .eq('orderId', orderId)
    .eq('stripeTransferId', transfer.id);

  if (error) {
    console.error(`transfer.created: DB update failed for transfer ${transfer.id}:`, error.message);
  } else {
    console.log(`transfer.created: payout row updated for order ${orderId}`);
  }
}

/**
 * Handles `payout.paid` events.
 *
 * Fired by Stripe when funds move from a connected Express account's Stripe
 * balance to the seller's bank account. This is the final step of the payout
 * lifecycle. One Stripe payout can cover multiple transfers (multiple orders),
 * so we cannot reliably link it to a single `payouts` row without knowing the
 * underlying transfers. Instead we:
 *   1. Resolve the seller ID from `seller_profiles` via the connected account ID
 *      (`connectedAccountId`, taken from `stripeEvent.account` by the caller).
 *   2. Update all paid, unlinked `payouts` rows for that seller, recording the
 *      Stripe payout ID and bank arrival date for reconciliation.
 *
 * Exported for unit testing.
 */
export async function handlePayoutPaid(payout: Stripe.Payout, connectedAccountId: string | null): Promise<void> {
  console.log(
    `payout.paid: ${payout.id} — amount £${(payout.amount / 100).toFixed(2)} ` +
      `| arrival ${new Date((payout.arrival_date) * 1000).toISOString()} ` +
      `| account=${connectedAccountId ?? 'unknown'}`,
  );

  if (!connectedAccountId) {
    // Without the connected account ID we cannot link the payout to a seller.
    // This should not happen on a correctly configured Connect webhook.
    console.warn(`payout.paid: no connectedAccountId for payout ${payout.id} — skipping DB update`);
    return;
  }

  // Resolve sellerId from seller_profiles using the connected Stripe account ID.
  const { data: sellerProfile } = await supabase!
    .from('seller_profiles')
    .select('userId')
    .eq('stripeAccountId', connectedAccountId)
    .maybeSingle<{ userId: string }>();

  if (!sellerProfile?.userId) {
    console.warn(
      `payout.paid: no seller_profiles row found for stripeAccountId=${connectedAccountId} — skipping DB update for payout ${payout.id}`,
    );
    return;
  }

  const sellerId = sellerProfile.userId;

  // Update all paid, unlinked payout rows for this seller with the Stripe payout
  // ID and arrival date. This covers the case where one bank payout settles
  // multiple order-level transfers.
  const { error } = await supabase!
    .from('payouts')
    .update({
      stripePayoutId: payout.id,
      paidAt: new Date((payout.arrival_date) * 1000).toISOString(),
      notes: `Bank payout confirmed by Stripe. Payout ID: ${payout.id}`,
    })
    .eq('sellerId', sellerId)
    .eq('status', 'paid')
    .is('stripePayoutId', null);

  if (error) {
    console.error(`payout.paid: DB update failed for payout ${payout.id}:`, error.message);
  } else {
    console.log(`payout.paid: payout ${payout.id} recorded for seller ${sellerId}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile PaymentIntent handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles `payment_intent.succeeded` for orders originating from the mobile
 * app (create-payment-intent.ts).
 *
 * Mobile sessions are distinguished from web sessions by having
 * `stripePaymentIntent` set at insert time in payment_sessions.  Web sessions
 * only get `stripePaymentIntent` written by handleCheckoutCompleted after
 * checkout.session.completed fires (which runs before payment_intent.succeeded),
 * leaving the web session in 'completed' status — not matched here.
 *
 * Creates orders using the same logic as handleCheckoutCompleted, then:
 *   - Marks product(s) as `listingStatus = 'sold'`
 *   - Sends push notifications to buyer and seller(s)
 */
async function handleMobilePaymentIntentSucceeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: import('@supabase/supabase-js').SupabaseClient<any>,
  stripeClient: Stripe,
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  // Idempotency: only process pending sessions — completed sessions are skipped.
  const { data: pendingSession, error: sessionErr } = await sb
    .from('payment_sessions')
    .select('id, metadata')
    .eq('stripePaymentIntent', paymentIntent.id)
    .eq('status', 'pending')
    .maybeSingle<{ id: string; metadata: Record<string, unknown> }>();

  if (sessionErr) {
    console.error('handleMobilePaymentIntentSucceeded: payment_sessions query failed:', sessionErr.message);
    return;
  }
  if (!pendingSession) {
    // Not a mobile session (or already processed) — skip silently.
    return;
  }

  interface CartItem {
    productId: string;
    sellerId: string;
    quantity: number;
    price: number;
    title: string;
  }

  interface MobileOrderData {
    items: CartItem[];
    shippingAddress: Record<string, string>;
    billingAddress: Record<string, string>;
    subtotal: number;
    shippingAmount: number;
    shippingMethod: string;
    total: number;
    buyerId: string;
    transferGroup: string;
    isB2B?: boolean;
    applyReverseCharge?: boolean;
  }

  const orderData = pendingSession.metadata as MobileOrderData;
  const items: CartItem[] = orderData.items ?? [];
  if (!items.length) {
    console.error(`handleMobilePaymentIntentSucceeded: no items in session ${pendingSession.id}`);
    return;
  }

  const VAT_RATE = 0.20;
  const configuredRate = await fetchConfiguredCommissionRate(sb);
  const COMMISSION_RATE = getCommissionRate(configuredRate ?? undefined);
  const totalShipping = orderData.shippingAmount ?? 0;
  const totalSubtotal = orderData.subtotal;
  const transferGroup = orderData.transferGroup;

  // Split items by seller (matches handleCheckoutCompleted logic)
  const sellerGroups = new Map<string, CartItem[]>();
  for (const item of items) {
    const group = sellerGroups.get(item.sellerId) ?? [];
    group.push(item);
    sellerGroups.set(item.sellerId, group);
  }

  let firstOrderId: string | null = null;
  const now = new Date().toISOString();

  for (const [sellerId, sellerItems] of sellerGroups) {
    const isReverseCharge = Boolean(orderData.applyReverseCharge);
    const sellerSubtotal = sellerItems.reduce(
      (sum, i) => sum + (i.price / (1 + VAT_RATE)) * i.quantity,
      0,
    );
    const sellerVat = isReverseCharge
      ? 0
      : sellerItems.reduce(
          (sum, i) => sum + i.price * (VAT_RATE / (1 + VAT_RATE)) * i.quantity,
          0,
        );
    const sellerShipping =
      totalSubtotal > 0 ? (sellerSubtotal / totalSubtotal) * totalShipping : 0;
    const sellerGrandTotal = sellerSubtotal + sellerVat + sellerShipping;
    const sellerCommission = sellerSubtotal * COMMISSION_RATE;
    const primaryItem = sellerItems[0];

    const { data: order, error: orderError } = await sb
      .from('orders')
      .insert([
        {
          buyerId:         orderData.buyerId || null,
          sellerId,
          productId:       primaryItem.productId,
          quantity:        sellerItems.reduce((sum, i) => sum + i.quantity, 0),
          subtotal:        sellerSubtotal,
          vatAmount:       sellerVat,
          shippingAmount:  sellerShipping,
          total:           sellerGrandTotal,
          commission:      sellerCommission,
          status:          'paid',
          escrowStatus:    'held',
          shippingAddress: orderData.shippingAddress,
          billingAddress:  orderData.billingAddress,
          shippingMethod:  orderData.shippingMethod || 'Standard',
          isB2B:           Boolean(orderData.isB2B),
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error(`handleMobilePaymentIntentSucceeded: order insert failed for seller ${sellerId}:`, orderError);
      throw orderError;
    }

    if (!firstOrderId) firstOrderId = order.id;

    // Order items
    const orderItemsRows = sellerItems.map((item) => ({
      orderId:      order.id,
      productId:    item.productId,
      quantity:     item.quantity,
      pricePerUnit: item.price,
      vatRate:      VAT_RATE,
      subtotal:     (item.price / (1 + VAT_RATE)) * item.quantity,
    }));

    const { error: itemsError } = await sb.from('order_items').insert(orderItemsRows);
    if (itemsError) {
      console.error('handleMobilePaymentIntentSucceeded: order_items insert failed:', itemsError);
      await sb.from('orders').delete().eq('id', order.id)
        .catch((e: unknown) => console.error('Failed to delete orphaned mobile order:', e));
      throw itemsError;
    }

    // Decrement stock (goods only)
    for (const item of sellerItems) {
      const { data: productMeta } = await sb
        .from('products')
        .select('listingContext, stockQuantity')
        .eq('id', item.productId)
        .single<{ listingContext: string | null; stockQuantity: number }>();

      if (productMeta?.listingContext === 'service') continue;

      const { error: rpcError } = await sb.rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_qty: item.quantity,
      });

      if (rpcError) {
        const currentQty = productMeta?.stockQuantity ?? 0;
        const newQty = Math.max(0, currentQty - item.quantity);
        const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock';
        const { count } = await sb
          .from('products')
          .update({ stockQuantity: newQty, stockStatus: newStatus })
          .eq('id', item.productId)
          .eq('stockQuantity', currentQty)
          .select('id', { count: 'exact', head: true });
        if (!count || count === 0) {
          console.warn(`handleMobilePaymentIntentSucceeded: concurrent stock change for product ${item.productId}`);
        }
      }

      // Mark product as sold
      await sb
        .from('products')
        .update({ listingStatus: 'sold', reservedUntil: null })
        .eq('id', item.productId);
    }

    const confirmedOrderNumber: string =
      (order as { orderNumber?: string }).orderNumber ?? order.id;

    // Credit seller balance
    const { error: balanceError } = await sb.rpc('credit_seller_balance', {
      p_seller_id: sellerId,
      p_order_id:  order.id,
    });
    if (balanceError) {
      console.warn('handleMobilePaymentIntentSucceeded: credit_seller_balance RPC failed:', balanceError.message);
    }

    // Stripe Connect transfer
    const { data: sellerConnectProfile } = await sb
      .from('seller_profiles')
      .select('stripeAccountId, stripeConnectStatus')
      .eq('userId', sellerId)
      .single<{ stripeAccountId: string | null; stripeConnectStatus: string | null }>();

    if (
      sellerConnectProfile?.stripeAccountId &&
      sellerConnectProfile.stripeConnectStatus === 'active'
    ) {
      const netSellerAmount = sellerGrandTotal - sellerCommission;
      try {
        const transfer = await stripeClient.transfers.create({
          amount:      Math.round(netSellerAmount * 100),
          currency:    'gbp',
          destination: sellerConnectProfile.stripeAccountId,
          ...(transferGroup ? { transfer_group: transferGroup } : {}),
          metadata: { orderId: order.id, sellerId },
        });

        await sb.from('payouts').insert({
          sellerId,
          orderId:         order.id,
          amount:          netSellerAmount,
          currency:        'GBP',
          status:          'paid',
          stripeTransferId: transfer.id,
          paidAt:          now,
        });

        console.log(`handleMobilePaymentIntentSucceeded: transfer ${transfer.id} for seller ${sellerId}`);
      } catch (transferError) {
        const errMsg = transferError instanceof Error
          ? transferError.message.substring(0, 200)
          : 'Unknown transfer error';
        await sb.from('payouts').insert({
          sellerId,
          orderId:  order.id,
          amount:   netSellerAmount,
          currency: 'GBP',
          status:   'failed',
          notes:    `Automatic Stripe Connect transfer failed: ${errMsg}`,
        });
        console.error(`handleMobilePaymentIntentSucceeded: transfer failed for seller ${sellerId}:`, transferError);
      }
    }

    // Seller notifications
    sb.from('notifications').insert({
      userId:  sellerId,
      type:    'order',
      title:   'New order received',
      message: `Order ${confirmedOrderNumber} has been placed. Total: £${sellerGrandTotal.toFixed(2)}`,
      link:    '/pp/seller/orders',
    }).catch((err: unknown) => console.warn('Mobile seller notification insert failed (non-fatal):', err));

    sendPushToUser(sb, sellerId, {
      title: 'New order received',
      body:  `Order ${confirmedOrderNumber} placed. Total: £${sellerGrandTotal.toFixed(2)}`,
      data:  { type: 'new_order', orderId: order.id },
    }).catch((err: unknown) => console.warn('Mobile seller push failed (non-fatal):', err));
  }

  // Buyer notifications
  if (orderData.buyerId) {
    sb.from('notifications').insert({
      userId:  orderData.buyerId,
      type:    'order',
      title:   'Order confirmed',
      message: `Your order has been placed successfully. We'll notify you when it ships.`,
      link:    '/pp/buyer/orders',
    }).catch((err: unknown) => console.warn('Mobile buyer notification insert failed (non-fatal):', err));

    sendPushToUser(sb, orderData.buyerId, {
      title: 'Order confirmed ✓',
      body:  `Your order has been placed. We'll notify you when it ships.`,
      data:  { type: 'order_confirmed', orderId: firstOrderId ?? '' },
    }).catch((err: unknown) => console.warn('Mobile buyer push failed (non-fatal):', err));
  }

  // Mark payment_sessions as completed
  await sb
    .from('payment_sessions')
    .update({
      orderId:             firstOrderId,
      stripePaymentIntent: paymentIntent.id,
      amount:              orderData.total,
      status:              'completed',
    })
    .eq('id', pendingSession.id);

  console.log(
    `handleMobilePaymentIntentSucceeded: PI ${paymentIntent.id} processed — ` +
    `${sellerGroups.size} order(s) created; firstOrderId=${firstOrderId}`,
  );
}
