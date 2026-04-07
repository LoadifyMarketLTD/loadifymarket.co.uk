import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
// 31 August 2026 23:59:59 BST (= 22:59:59 UTC). After that date the normal
// 7% commission rate resumes automatically without any manual intervention.
//
// Exported so the unit test can reference the exact deadline value.
export const ZERO_COMMISSION_PROMO_END_UTC = new Date('2026-08-31T22:59:59Z').getTime();

/**
 * Returns the effective commission rate for the current moment.
 *   - 0    during the promotion  (now < ZERO_COMMISSION_PROMO_END_UTC)
 *   - 0.07 once the promotion ends (now >= ZERO_COMMISSION_PROMO_END_UTC)
 *
 * Exported for unit testing — use vi.useFakeTimers / vi.setSystemTime to
 * pin Date.now() to a specific point in time when testing.
 */
export function getCommissionRate(): number {
  return Date.now() < ZERO_COMMISSION_PROMO_END_UTC ? 0 : 0.07;
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
        console.log('PaymentIntent succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        console.error('PaymentIntent failed:', paymentIntent.id);
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

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
  // Dynamic commission rate: 0% during the promo period, 7% after 31 August 2026.
  const COMMISSION_RATE = getCommissionRate();
  const totalShipping = orderData.shippingAmount ?? 0;
  const totalSubtotal = orderData.subtotal;

  let firstOrderId: string | null = null;

  for (const [sellerId, sellerItems] of sellerGroups) {
    // Calculate ex-VAT amounts for this seller's portion of the order.
    // item.price is VAT-inclusive; ex-VAT = price / (1 + VAT_RATE).
    const sellerSubtotal = sellerItems.reduce(
      (sum, i) => sum + (i.price / (1 + VAT_RATE)) * i.quantity,
      0
    );
    const sellerVat = sellerItems.reduce(
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
          shippingAddress,
          billingAddress,
          shippingMethod: orderData.shippingMethod || 'Standard',
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

    // Atomically decrement stock for each purchased product in this seller order.
    for (const item of sellerItems) {
      const { error: rpcError } = await supabase.rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_qty: item.quantity,
      });

      if (rpcError) {
        // RPC not yet deployed — fall back to a conditional (CAS) update that
        // only writes if the stock value has not changed since we read it,
        // preventing a race condition between two concurrent orders.
        console.warn('decrement_product_stock RPC failed, using fallback:', rpcError.message);
        const { data: productRow } = await supabase
          .from('products')
          .select('stockQuantity')
          .eq('id', item.productId)
          .single<{ stockQuantity: number }>();

        if (productRow !== null) {
          const currentQty = productRow?.stockQuantity ?? 0;
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
      }
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
      console.warn('credit_seller_balance RPC failed:', balanceError.message);
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
      fetch(`${process.env.URL}/.netlify/functions/send-email`, {
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
  fetch(`${process.env.URL}/.netlify/functions/send-email`, {
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
 */
async function handleConnectAccountUpdated(account: Stripe.Account) {
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

  // ── Auto-activation check ──────────────────────────────────────────────
  // Import lazily so this module stays loadable even when the helper file is
  // temporarily absent (e.g. first deploy before functions are bundled).
  try {
    const { tryAutoActivateSeller } = await import('./_shared/sellerActivation');
    const sellerId = (updated[0] as { userId: string }).userId;
    const result = await tryAutoActivateSeller(supabase!, sellerId);

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
