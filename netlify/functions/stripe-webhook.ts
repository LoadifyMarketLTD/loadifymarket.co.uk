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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // ── Idempotency guard ──────────────────────────────────────────────────────
  // Stripe guarantees at-least-once webhook delivery. Check whether this
  // session has already been processed to prevent duplicate orders and
  // double stock-decrements if the webhook is retried.
  const { data: existingSession } = await supabase!
    .from('payment_sessions')
    .select('id')
    .eq('stripeSessionId', session.id)
    .maybeSingle();

  if (existingSession) {
    console.log(`Idempotency: checkout session ${session.id} already processed — skipping`);
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  const metadata = session.metadata!;

  // CartItem interface — matches what create-checkout serialises into metadata
  interface CartItem {
    productId: string;
    sellerId: string;
    quantity: number;
    price: number;
    title: string;
  }

  const items: CartItem[] = JSON.parse(metadata.items);
  const shippingAddress = JSON.parse(metadata.shippingAddress);
  const billingAddress = JSON.parse(metadata.billingAddress);

  if (items.length === 0) throw new Error('Checkout metadata contains no items');

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
  const COMMISSION_RATE = 0.07;
  const totalShipping = parseFloat(metadata.shippingAmount || '0');
  const totalSubtotal = parseFloat(metadata.subtotal);

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
          buyerId: metadata.buyerId || null,
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
          shippingMethod: metadata.shippingMethod || 'Standard',
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
      throw itemsError;
    }

    // Atomically decrement stock for each purchased product in this seller order.
    for (const item of sellerItems) {
      const { error: rpcError } = await supabase.rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_qty: item.quantity,
      });

      if (rpcError) {
        // RPC not yet deployed — fall back to two-step update
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

          await supabase
            .from('products')
            .update({ stockQuantity: newQty, stockStatus: newStatus })
            .eq('id', item.productId);
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
        const transfer = await stripe!.transfers.create({
          amount: Math.round(netSellerAmount * 100), // convert to pence
          currency: 'gbp',
          destination: sellerConnectProfile.stripeAccountId,
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
        headers: { 'Content-Type': 'application/json' },
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

  // Record ONE payment session (stripeSessionId is UNIQUE) linked to the first order.
  await supabase!.from('payment_sessions').insert([
    {
      orderId: firstOrderId,
      userId: metadata.buyerId || null,
      stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent as string,
      amount: parseFloat(metadata.total),
      currency: 'GBP',
      status: 'completed',
      metadata: session,
    },
  ]);

  // Send buyer confirmation email (async, don't wait)
  const sellerCount = sellerGroups.size;
  const subjectSuffix = sellerCount > 1 ? ` (${sellerCount} sellers)` : '';
  fetch(`${process.env.URL}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: session.customer_email,
      subject: `Order Confirmation${subjectSuffix}`,
      template: 'order_confirmation',
      data: {
        customerName: 'Customer',
        orderNumber: firstOrderId ?? 'unknown',
        orderDate: new Date().toLocaleDateString('en-GB'),
        total: parseFloat(metadata.total),
        items: (items as CartItem[]).map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    }),
  }).catch(err => console.error('Email send failed:', err));

  // Generate invoice for first order (async, don't wait)
  fetch(`${process.env.URL}/.netlify/functions/generate-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: firstOrderId }),
  }).catch(err => console.error('Invoice generation failed:', err));

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
  } else if (!updated || updated.length === 0) {
    // No row matched — the account ID is not in our DB. This can happen if
    // the webhook is received before the seller has been persisted, or for
    // Connect accounts that belong to a different platform environment.
    console.warn(`account.updated: no seller_profiles row found for stripeAccountId=${account.id} — skipping`);
  } else {
    console.log(`account.updated: ${account.id} → stripeConnectStatus=${stripeConnectStatus}`);
  }
}
