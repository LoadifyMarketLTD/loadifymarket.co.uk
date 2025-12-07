import Stripe from 'stripe';
import { Handler } from '@netlify/functions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  title: string;
  sellerId: string;
}

interface CheckoutRequest {
  items: CartItem[];
  buyerId: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body: CheckoutRequest = JSON.parse(event.body || '{}');
    const { items, buyerId, shippingAddress, billingAddress } = body;

    // Calculate totals
    const VAT_RATE = 0.20; // 20% UK VAT
    const COMMISSION_RATE = 0.07; // 7% marketplace commission

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vatAmount = subtotal * VAT_RATE;
    const total = subtotal + vatAmount;
    const commissionAmount = subtotal * COMMISSION_RATE;

    // Group items by seller for split payments
    const itemsBySeller = items.reduce((acc, item) => {
      if (!acc[item.sellerId]) {
        acc[item.sellerId] = [];
      }
      acc[item.sellerId].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);

    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(item.price * 100), // Convert to pence
      },
      quantity: item.quantity,
    }));

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/cart`,
      metadata: {
        buyerId,
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: JSON.stringify(billingAddress),
        items: JSON.stringify(items),
      },
      customer_email: event.headers['user-email'] || undefined,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    };
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to create checkout session',
      }),
    };
  }
};
