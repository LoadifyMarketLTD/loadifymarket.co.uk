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

function jsonResponse(statusCode: number, payload: Record<string, unknown>) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function isCheckoutFromOfferDebugEnabled(): boolean {
  const raw = (process.env.CHECKOUT_FROM_OFFER_DEBUG ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function tryGetOrigin(value: string | undefined | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function resolveAppUrl(rawUrl?: string): string {
  return (
    tryGetOrigin(process.env.URL)
    ?? tryGetOrigin(process.env.VITE_APP_URL)
    ?? tryGetOrigin(rawUrl)
    ?? 'https://loadifymarket.co.uk'
  );
}

function getServerConfig():
  | { stripeKey: string; supabaseUrl: string; serviceRoleKey: string }
  | { errorResponse: { statusCode: number; headers: Record<string, string>; body: string } } {
  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!stripeKey) {
    return { errorResponse: jsonResponse(500, { error: 'Payment provider configuration is missing' }) };
  }
  if (!stripeKey.startsWith('sk_')) {
    return { errorResponse: jsonResponse(500, { error: 'Payment provider key is invalid' }) };
  }

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return { errorResponse: jsonResponse(500, { error: 'Database configuration is missing' }) };
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:') {
      return { errorResponse: jsonResponse(500, { error: 'Database URL must use https' }) };
    }
  } catch {
    return { errorResponse: jsonResponse(500, { error: 'Database URL is invalid' }) };
  }

  if (serviceRoleKey.length < 20 || /\s/.test(serviceRoleKey)) {
    return { errorResponse: jsonResponse(500, { error: 'Database service role key is invalid' }) };
  }

  return { stripeKey, supabaseUrl, serviceRoleKey };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    const config = getServerConfig();
    if ('errorResponse' in config) {
      return config.errorResponse;
    }

    const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false },
    });

    // ── Auth ──────────────────────────────────────────────────────────────────
    const headers = event.headers ?? {};
    const authHeader = headers.authorization ?? headers.Authorization ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Authentication required' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return jsonResponse(401, { error: 'Authentication required' });
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return jsonResponse(401, { error: 'Invalid authentication token' });
    }
    const callerId = authUser.id;

    // ── Rate limiting — 10 checkout initiations per hour per user ───────────
    const rl = await checkRateLimit({
      supabase,
      tableName:     'checkout_offer_rate_limits',
      identifier:    callerId,
      windowMinutes: 60,
      maxAttempts:   10,
    });
    if (rl.exceeded) {
      return jsonResponse(429, { error: 'Too many checkout attempts. Please try again later.' });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: RequestBody;
    try {
      body = JSON.parse(event.body ?? '{}') as RequestBody;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const { orderId } = body;
    if (!orderId || typeof orderId !== 'string') {
      return jsonResponse(400, { error: 'orderId is required' });
    }

    // ── Maintenance mode ──────────────────────────────────────────────────────
    const maintenance = await isMaintenanceMode(supabase);
    if (maintenance) {
      const { data: callerRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', callerId)
        .maybeSingle<{ role: string | null }>();
      const isAdmin = callerRow?.role === 'admin';
      if (!isAdmin) {
        return jsonResponse(503, { error: 'Platform is temporarily under maintenance' });
      }
    }

    const { data, error } = await supabase.rpc('release_stale_unpaid_listing_locks');
    if (error) {
      console.error('checkout-from-offer RPC error', error);
      return jsonResponse(500, {
        error: 'RPC failed',
        details: `${error.code ?? 'rpc_error'}: ${error.message ?? 'Unknown RPC error'}`,
      });
    }
    void data;

    // ── Validate order ────────────────────────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyerId, sellerId, productId, total, status, offerId')
      .eq('id', orderId)
      .maybeSingle<OrderRow>();

    if (orderError) {
      console.error('checkout-from-offer: order lookup failed:', {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        orderId,
      });
    }
    if (!order) {
      return jsonResponse(404, { error: 'Order not found' });
    }

    if (order.buyerId !== callerId) {
      return jsonResponse(403, { error: 'This order does not belong to you' });
    }

    if (order.status !== 'awaiting_payment') {
      return jsonResponse(409, { error: `Order cannot be checked out (current status: ${order.status})` });
    }

    // ── Validate listing ──────────────────────────────────────────────────────
    const { data: listing, error: listingError } = await supabase
      .from('products')
      .select('id, title, sellerId, listingContext')
      .eq('id', order.productId)
      .maybeSingle<ProductRow>();

    if (listingError) {
      console.error('checkout-from-offer: listing lookup failed:', {
        code: listingError.code,
        message: listingError.message,
        details: listingError.details,
        orderId,
        productId: order.productId,
      });
    }
    if (!listing) {
      return jsonResponse(404, { error: 'Listing not found' });
    }

    // ── Seller Stripe-readiness check ─────────────────────────────────────────
    const { data: sellerProfile, error: sellerProfileError } = await supabase
      .from('seller_profiles')
      .select('stripeAccountId, stripeConnectStatus, sellerStatus')
      .eq('userId', order.sellerId)
      .maybeSingle<SellerProfileRow>();

    if (sellerProfileError) {
      console.error('checkout-from-offer: seller profile query failed:', sellerProfileError.message);
      return jsonResponse(500, { error: 'Unable to verify seller status. Please try again.' });
    }

    if (sellerProfile?.sellerStatus === 'suspended') {
      return jsonResponse(400, { error: 'This seller is currently unavailable.' });
    }

    if (!sellerProfile?.stripeAccountId || sellerProfile.stripeConnectStatus !== 'active') {
      return jsonResponse(400, { error: 'This seller is not ready to accept payments yet. Please try again later.' });
    }

    // ── Create Stripe Checkout Session ───────────────────────────────────────
    const appUrl = resolveAppUrl(event.rawUrl);
    const transferGroup = randomUUID();
    const amountPence = Math.round(order.total * 100);
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      console.error('checkout-from-offer: invalid order total for checkout session', {
        orderId,
        total: order.total,
        amountPence,
      });
      return jsonResponse(409, { error: 'Order total is invalid for checkout' });
    }
    const stripe = new Stripe(config.stripeKey, { apiVersion: '2025-08-27.basil' });

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
    if (!session.url) {
      console.error('checkout-from-offer: Stripe Checkout Session missing URL', {
        orderId,
        sessionId: session.id,
      });
      await stripe.checkout.sessions.expire(session.id).catch((e: unknown) =>
        console.error('checkout-from-offer: failed to expire url-less session:', e),
      );
      return jsonResponse(500, { error: 'Checkout initialisation failed. Please try again.' });
    }

    // ── Insert payment_sessions row ───────────────────────────────────────────
    const { error: sessionInsertError } = await supabase
      .from('payment_sessions')
      .insert({
        stripeSessionId:     session.id,
        stripePaymentIntent: null, // set by handleCheckoutCompleted
        userId:              callerId,
        orderId,
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
      return jsonResponse(500, { error: 'Checkout initialisation failed. Please try again.' });
    }

    return jsonResponse(200, { checkoutUrl: session.url });
  } catch (error) {
    const stack = error instanceof Error ? error.stack ?? 'stack_unavailable' : 'stack_unavailable';
    console.error('checkout-from-offer unhandled error:', error, stack);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Checkout session creation failed',
      ...(isCheckoutFromOfferDebugEnabled()
        ? {
            debug: {
              stack,
            },
          }
        : {}),
    });
  }
};
