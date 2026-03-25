import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

interface CheckoutItem {
  productId: string;
  quantity: number;
  price: number;
  title: string;
  sellerId: string;
}

interface CheckoutBody {
  items: CheckoutItem[];
  buyerId: string;
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string>;
}

interface DBProduct {
  id: string;
  price: number;
  title: string;
  sellerId: string;
  isActive: boolean;
  isApproved: boolean;
  stockQuantity: number;
}

export const handler: Handler = async (event) => {
  // 1. Method guard
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // 2. Stripe key guard (read env inside handler so tests can override per-call)
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment provider configuration is missing' }),
    };
  }
  if (!stripeKey.startsWith('sk_')) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment provider key is invalid' }),
    };
  }

  // 3. Supabase guard
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database configuration is missing' }),
    };
  }

  // 4. Parse body
  let body: CheckoutBody;
  try {
    body = JSON.parse(event.body ?? '{}') as CheckoutBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { items, buyerId, shippingAddress, billingAddress } = body;
  if (!items?.length || !shippingAddress || !billingAddress) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // 5a. If an Authorization header is present, verify the token and ensure
  //     buyerId matches the authenticated user to prevent order spoofing.
  let verifiedBuyerId = buyerId ?? '';
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
    }
    if (buyerId && buyerId !== authUser.id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'buyerId does not match authenticated user' }) };
    }
    verifiedBuyerId = authUser.id;
  }

  // 5. Validate products from DB (price integrity + availability)
  const productIds = items.map((i) => i.productId);
  const { data: dbProducts, error: dbError } = await supabase
    .from('products')
    .select('id, price, title, sellerId, isActive, isApproved, stockQuantity')
    .in('id', productIds);

  if (dbError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database price validation failed' }) };
  }

  const productMap = new Map((dbProducts ?? []).map((p: DBProduct) => [p.id, p]));

  for (const item of items) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct || !dbProduct.isActive || !dbProduct.isApproved) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Item "${item.title}" is no longer available` }),
      };
    }
  }

  // 6. Create Stripe checkout session
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const lineItems = items.map((item) => {
      const dbProduct = productMap.get(item.productId) as DBProduct;
      const unitAmount = Math.round(dbProduct.price * 100);
      return {
        price_data: {
          currency: 'gbp',
          product_data: { name: item.title },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    // Validate the site base URL to prevent open-redirect via a tampered env var.
    // Only http:// and https:// origins are accepted; default to localhost for dev.
    const rawSiteUrl = (process.env.URL ?? '').trim();
    let siteUrl: string;
    try {
      const parsed = new URL(rawSiteUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad protocol');
      // Strip trailing slash for clean URL construction
      siteUrl = parsed.origin;
    } catch {
      siteUrl = 'http://localhost:8888';
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      metadata: {
        buyerId: verifiedBuyerId,
        productIds: productIds.join(','),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout session creation failed';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};