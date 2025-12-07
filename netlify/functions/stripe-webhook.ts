import Stripe from 'stripe';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
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
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
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
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata!;
  const items = JSON.parse(metadata.items);
  const shippingAddress = JSON.parse(metadata.shippingAddress);
  const billingAddress = JSON.parse(metadata.billingAddress);

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Create order in database
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([
      {
        orderNumber,
        buyerId: metadata.buyerId,
        sellerId: items[0].sellerId, // For now, assuming single seller per order
        subtotal: parseFloat(metadata.subtotal),
        vatAmount: parseFloat(metadata.vatAmount),
        total: parseFloat(metadata.total),
        commission: parseFloat(metadata.commissionAmount),
        stripePaymentId: session.payment_intent as string,
        status: 'paid',
        shippingAddress,
        billingAddress,
      },
    ])
    .select()
    .single();

  if (orderError) {
    console.error('Error creating order:', orderError);
    throw orderError;
  }

  // Create order items
  const orderItems = items.map((item: any) => ({
    orderId: order.id,
    productId: item.productId,
    sellerId: item.sellerId,
    quantity: item.quantity,
    unitPrice: item.price,
    vatAmount: item.price * 0.20,
    lineTotal: item.price * item.quantity * 1.20,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Error creating order items:', itemsError);
    throw itemsError;
  }

  // Create payment record
  await supabase.from('payments').insert([
    {
      orderId: order.id,
      stripePaymentId: session.payment_intent as string,
      status: 'succeeded',
      metadata: session,
    },
  ]);

  // Send confirmation email (async, don't wait)
  fetch(`${process.env.URL}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: session.customer_email,
      subject: `Order Confirmation - ${orderNumber}`,
      template: 'order_confirmation',
      data: {
        customerName: 'Customer',
        orderNumber,
        orderDate: new Date().toLocaleDateString('en-GB'),
        total: parseFloat(metadata.total),
        items: items.map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    }),
  }).catch(err => console.error('Email send failed:', err));

  // Generate invoice (async, don't wait)
  fetch(`${process.env.URL}/.netlify/functions/generate-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id }),
  }).catch(err => console.error('Invoice generation failed:', err));

  console.log(`Order ${orderNumber} created successfully`);
}

async function handleRefund(charge: Stripe.Charge) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*, orders(*)')
    .eq('stripePaymentId', charge.payment_intent)
    .single();

  if (payment) {
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', payment.orderId);

    console.log(`Order ${payment.orders.orderNumber} refunded`);
  }
}
