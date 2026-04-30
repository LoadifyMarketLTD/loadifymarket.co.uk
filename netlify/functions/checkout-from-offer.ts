/**
 * checkout-from-offer
 *
 * Phase 4: Creates a Stripe Checkout Session for an offer-based order that is
 * already in `awaiting_payment` status (created by the accept_offer() RPC).
 *
 * Flow:
 *   1. JWT auth (must be the order's buyerId)
 *   2. Validate order exists, belongs to buyer, status = awaiting_payment
 *   3. Verify seller Stripe readiness
 *   4. Create Stripe Checkout Session with the agreed offer amount
 *   5. Insert payment_sessions row (source='offer', orderId stored in metadata)
 *   6. Update order with stripePaymentIntentId will happen after checkout
 *      completes via the webhook's handleCheckoutCompleted branch
 *   7. Return { checkout_url }
 *
 * Body: { orderId: string }
 * Returns: { checkoutUrl: string }
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Handler } from '@netlify/functions';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';

interface RequestBody {
  orderId?: string;
}

interface OrderRow {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  total: number;
  status: string;
  offerId: string | null;
}

interface ProductRow {
  id: string;
  title: string;
  sellerId: string;
  listingContext: string;
}

interface SellerProfileRow {
  stripeAccountId: string | null;
  stripeConnectStatus: string | null;
  sellerStatus: string | null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Environment guards ──────────────────────────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider configuration is missing' }) };
  }
  if (!stripeKey.startsWith('sk_')) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider key is invalid' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration is missing' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }
  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }
  const callerId = authUser.id;

  // ── Rate limiting — 10 checkout initiations per hour per user ───────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'checkout_offer_rate_limits',
    identifier:    callerId,
    windowMinutes: 60,
    maxAttempts:   10,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many checkout attempts. Please try again later.' }) };
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { orderId } = body;
  if (!orderId || typeof orderId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'orderId is required' }) };
  }

  // ── Maintenance mode ────────────────────────────────────────────────────────
  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance) {
    const { data: callerRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', callerId)
      .maybeSingle<{ role: string | null }>();
    const isAdmin = callerRow?.role === 'admin' || callerRow?.role === 'owner';
    if (!isAdmin) {
      return { statusCode: 503, body: JSON.stringify({ error: 'Platform is temporarily under maintenance' }) };
    }
  }

  // ── Validate order ──────────────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, buyerId, sellerId, productId, total, status, offerId')
    .eq('id', orderId)
    .maybeSingle<OrderRow>();

  if (orderError || !order) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (order.buyerId !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This order does not belong to you' }) };
  }

  if (order.status !== 'awaiting_payment') {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: `Order cannot be checked out (current status: ${order.status})` }),
    };
  }

  // ── Validate listing ────────────────────────────────────────────────────────
  const { data: listing, error: listingError } = await supabase
    .from('products')
    .select('id, title, sellerId, listingContext')
    .eq('id', order.productId)
    .maybeSingle<ProductRow>();

  if (listingError || !listing) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
  }

  // ── Seller Stripe-readiness check ───────────────────────────────────────────
  const { data: sellerProfile, error: sellerProfileError } = await supabase
    .from('seller_profiles')
    .select('stripeAccountId, stripeConnectStatus, sellerStatus')
    .eq('userId', order.sellerId)
    .maybeSingle<SellerProfileRow>();

  if (sellerProfileError) {
    console.error('checkout-from-offer: seller profile query failed:', sellerProfileError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify seller status. Please try again.' }) };
  }

  if (sellerProfile?.sellerStatus === 'suspended') {
    return { statusCode: 400, body: JSON.stringify({ error: 'This seller is currently unavailable.' }) };
  }

  if (!sellerProfile?.stripeAccountId || sellerProfile.stripeConnectStatus !== 'active') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'This seller is not ready to accept payments yet. Please try again later.' }),
    };
  }

  // ── Create Stripe Checkout Session ─────────────────────────────────────────
  const appUrl = (process.env.URL ?? process.env.VITE_APP_URL ?? 'https://loadifymarket.co.uk').replace(/\/$/, '');
  const transferGroup = randomUUID();
  const amountPence = Math.round(order.total * 100);

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:     'gbp',
            unit_amount:  amountPence,
            product_data: { name: listing.title },
          },
        },
      ],
      success_url: `${appUrl}/order-success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/inbox`,
      metadata: {
        source:        'offer',
        orderId,
        buyerId:       callerId,
        sellerId:      order.sellerId,
        productId:     order.productId,
        transferGroup,
      },
      payment_intent_data: {
        transfer_group: transferGroup,
      },
    });

    // ── Insert payment_sessions row ─────────────────────────────────────────
    const { error: sessionInsertError } = await supabase
      .from('payment_sessions')
      .insert({
        stripeSessionId:     session.id,
        stripePaymentIntent: null,           // set by handleCheckoutCompleted
        userId:              callerId,
        orderId,                             // pre-link to the existing order
        status:              'pending',
        amount:              order.total,
        currency:            'GBP',
        metadata: {
          source:        'offer',
          orderId,
          buyerId:       callerId,
          sellerId:      order.sellerId,
          productId:     order.productId,
          transferGroup,
          total:         order.total,
          listingTitle:  listing.title,
        },
      });

    if (sessionInsertError) {
      console.error('checkout-from-offer: payment_sessions insert failed:', sessionInsertError.message);
      await stripe.checkout.sessions.expire(session.id).catch((e: unknown) =>
        console.error('checkout-from-offer: failed to expire orphaned session:', e),
      );
      return { statusCode: 500, body: JSON.stringify({ error: 'Checkout initialisation failed. Please try again.' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl: session.url }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout session creation failed';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
