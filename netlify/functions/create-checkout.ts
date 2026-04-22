import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
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
  shippingAmount?: number;
  shippingMethod?: string;
  guestEmail?: string;
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

  const {
    items,
    buyerId,
    shippingAddress,
    billingAddress,
    shippingAmount: rawShippingAmount,
    shippingMethod,
  } = body;
  if (!items?.length || !shippingAddress || !billingAddress) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  const shippingAmount = typeof rawShippingAmount === 'number' ? rawShippingAmount : 0;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // 5a. If an Authorization header is present, verify the token and ensure
  //     buyerId matches the authenticated user to prevent order spoofing.
  //     When no token is provided the buyerId from the request body is NOT
  //     trusted — we set it to '' so unauthenticated callers cannot claim
  //     ownership of any user account.
  let verifiedBuyerId = '';
  const authHeader = event.headers['authorization'];
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

  // P1: Require authenticated buyer — guest checkout is not supported.
  // verifiedBuyerId is set only when a valid Bearer token was provided above.
  // Without it we cannot create an order record, so we must reject here to
  // prevent charging a buyer whose payment cannot be tracked or refunded.
  if (!verifiedBuyerId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required. Please sign in to complete your purchase.' }),
    };
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
    if (typeof dbProduct.stockQuantity === 'number' && dbProduct.stockQuantity <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Item "${item.title}" is out of stock` }),
      };
    }
    if (typeof dbProduct.stockQuantity === 'number' && item.quantity > dbProduct.stockQuantity) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Only ${dbProduct.stockQuantity} unit(s) of "${item.title}" are available` }),
      };
    }
  }

  // Build enriched items — sellerId and price come from the DB to prevent
  // client-side price/seller tampering. These are stored in payment_sessions
  // metadata so the webhook can create orders without relying on Stripe's 500-
  // character-per-value metadata limit.
  const enrichedItems = items.map((item) => {
    const dbProduct = productMap.get(item.productId) as DBProduct;
    return {
      productId: item.productId,
      sellerId: dbProduct.sellerId,
      quantity: item.quantity,
      price: dbProduct.price,
      title: item.title,
    };
  });

  // P3: Single-seller enforcement — multi-seller checkout is temporarily
  // disabled because order reconciliation and refund mapping across sellers
  // is not yet fully implemented. Block at the backend (the Checkout UI also
  // guards this so the error is rarely user-facing, but this is the real gate).
  const uniqueSellerIds = [...new Set(enrichedItems.map((i) => i.sellerId))];
  if (uniqueSellerIds.length > 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'For now, please complete purchases from one seller at a time.',
      }),
    };
  }

  // P2 + P5: Validate seller Stripe-readiness and suspension status.
  // The seller ID is authoritative (from the DB enrichedItems, not the client
  // request) so this check cannot be bypassed by a crafted request body.
  const checkoutSellerId = uniqueSellerIds[0];
  const { data: sellerProfile, error: sellerProfileError } = await supabase
    .from('seller_profiles')
    .select('stripeAccountId, stripeConnectStatus, sellerStatus')
    .eq('userId', checkoutSellerId)
    .maybeSingle<{
      stripeAccountId: string | null;
      stripeConnectStatus: string | null;
      sellerStatus: string | null;
    }>();

  if (sellerProfileError) {
    console.error('create-checkout: seller profile query failed:', sellerProfileError.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unable to verify seller status. Please try again.' }),
    };
  }

  // P5: Suspended sellers cannot accept new payments.
  if (sellerProfile?.sellerStatus === 'suspended') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'This seller is currently unavailable.' }),
    };
  }

  // P2: Seller must have a connected, fully-active Stripe account.
  // stripeConnectStatus === 'active' means charges_enabled AND payouts_enabled
  // are both true (set by the account.updated webhook handler in stripe-webhook.ts).
  if (
    !sellerProfile?.stripeAccountId ||
    sellerProfile.stripeConnectStatus !== 'active'
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'This seller is not ready to accept payments yet. Please try again later or contact support.',
      }),
    };
  }

  const subtotal = enrichedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + shippingAmount;

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

    // Generate a transferGroup identifier before creating the session so it
    // can be stored in session metadata. The webhook (stripe-webhook.ts) reads
    // metadata.transferGroup to set transfer_group on Connect transfers,
    // linking all seller payouts from this checkout back to one originating
    // payment for Stripe compliance auditing.
    const transferGroup = randomUUID();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      payment_intent_data: {
        // Associate the payment intent with the same transferGroup so all
        // Connect transfers for this order are grouped in the Stripe Dashboard.
        transfer_group: transferGroup,
      },
      metadata: {
        buyerId: verifiedBuyerId,
        productIds: productIds.join(','),
        transferGroup,
      },
    });

    // Pre-populate payment_sessions with all order details so the webhook can
    // create orders without parsing Stripe session metadata (which is capped at
    // 500 characters per value and cannot hold a full items JSON for larger carts).
    // The webhook reads this record by stripeSessionId and updates status to
    // 'completed' once orders are created.
    const { error: sessionInsertError } = await supabase
      .from('payment_sessions')
      .insert({
        stripeSessionId: session.id,
        userId: verifiedBuyerId || null,
        status: 'pending',
        amount: total,
        currency: 'GBP',
        metadata: {
          items: enrichedItems,
          shippingAddress,
          billingAddress,
          subtotal,
          shippingAmount,
          shippingMethod: shippingMethod ?? 'Standard',
          total,
          buyerId: verifiedBuyerId,
          transferGroup,
        },
      });

    if (sessionInsertError) {
      // If we cannot persist the order data the webhook will have nothing to
      // work with — abort so the customer is not charged for an unrecoverable
      // order. Stripe will not charge until the browser completes the redirect.
      console.error('Failed to pre-insert payment_sessions record:', sessionInsertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Order initialisation failed. Please try again.' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout session creation failed';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};