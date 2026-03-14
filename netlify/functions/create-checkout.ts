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
  guestEmail?: string;
  shippingAmount?: number;
  shippingMethod?: string;
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
    const { items, buyerId, guestEmail, shippingAddress, billingAddress, shippingAmount = 0, shippingMethod = 'Standard' } = body;

    // Calculate totals
    // Note: product prices from the cart are VAT-inclusive (displayed to buyers incl. VAT)
    const VAT_RATE = 0.20; // 20% UK VAT
    const COMMISSION_RATE = 0.07; // 7% marketplace commission

    // Cart totals (VAT-inclusive)
    const cartTotalIncVat = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartSubtotalExVat = cartTotalIncVat / (1 + VAT_RATE);
    const cartVatAmount = cartTotalIncVat - cartSubtotalExVat;

    // Shipping — shippingAmount is the ex-VAT shipping cost
    const shippingVAT = shippingAmount * VAT_RATE;
    const shippingIncVat = shippingAmount + shippingVAT;

    const total = cartTotalIncVat + shippingIncVat;
    const vatAmount = cartVatAmount + shippingVAT;
    const commissionAmount = cartSubtotalExVat * COMMISSION_RATE;

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(item.price * 100), // Convert to pence
      },
      quantity: item.quantity,
    }));

    // Add shipping as a separate line item if applicable
    if (shippingAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Shipping (${shippingMethod})`,
          },
          unit_amount: Math.round((shippingAmount + shippingVAT) * 100),
        },
        quantity: 1,
      });
    }

    const customerEmail = guestEmail || event.headers['user-email'] || undefined;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.URL || process.env.VITE_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || process.env.VITE_APP_URL}/cart`,
      metadata: {
        buyerId: buyerId || '',
        subtotal: cartTotalIncVat.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        total: total.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        shippingMethod,
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: JSON.stringify(billingAddress),
        items: JSON.stringify(items),
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      }),
    };
  }
};
