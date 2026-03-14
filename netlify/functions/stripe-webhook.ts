import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Fail gracefully if env vars not configured
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('Stripe webhook not configured - missing environment variables');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

const supabase = process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export const handler: Handler = async (event) => {
  // Return 501 if not configured
  if (!stripe || !supabase || !process.env.STRIPE_WEBHOOK_SECRET) {
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

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` }),
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
  }

  // Record ONE payment session (stripeSessionId is UNIQUE) linked to the first order.
  await supabase.from('payment_sessions').insert([
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

  // Send confirmation email (async, don't wait)
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
  const { data: payment } = await supabase
    .from('payment_sessions')
    .select('orderId, orders(orderNumber)')
    .eq('stripePaymentIntent', charge.payment_intent)
    .single<PaymentSessionWithOrder>();

  if (payment?.orderId) {
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', payment.orderId);

    const orderNumber = payment.orders?.orderNumber ?? payment.orderId;
    console.log(`Order ${orderNumber} refunded`);
  }
}
