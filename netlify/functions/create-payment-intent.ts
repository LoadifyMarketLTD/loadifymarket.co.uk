/**
 * create-payment-intent
 *
 * Mobile-app equivalent of create-checkout.ts.
 * Returns a Stripe PaymentIntent client_secret for use with the Stripe
 * Payment Sheet SDK (React Native / Expo).
 *
 * Reuses all validation logic from create-checkout.ts:
 *   - JWT verification + buyerId guard
 *   - Maintenance-mode gate
 *   - DB price integrity (price never trusted from client)
 *   - Stock validation (goods only)
 *   - Single-seller enforcement
 *   - Seller Stripe-readiness check
 *   - B2B reverse-charge VAT
 *   - payment_sessions pre-population for webhook idempotency
 *
 * Additional mobile-only behaviour:
 *   - Releases expired product reservations before validating (lazy cleanup)
 *   - Reserves the product (listingStatus → 'reserved', reservedUntil = +15 min)
 *     using a compare-and-swap UPDATE so two concurrent buyers can't both reserve
 *   - Returns { client_secret, payment_intent_id, amount_pence } — no redirect URL
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Handler } from '@netlify/functions';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';

interface CheckoutItem {
  productId: string;
  quantity: number;
  price: number;
  title: string;
  sellerId: string;
}

interface PaymentIntentBody {
  items: CheckoutItem[];
  buyerId: string;
  shippingAddress?: Record<string, string>;
  billingAddress: Record<string, string>;
  /** Client-provided shipping amount is intentionally ignored. */
  shippingAmount?: number;
  /** UUID of the selected shipping method (required for goods carts). */
  shippingMethodId?: string;
  shippingMethod?: string;
}

interface DBProduct {
  id: string;
  price: number;
  title: string;
  sellerId: string;
  isActive: boolean;
  isApproved: boolean;
  stockQuantity: number;
  listingContext: string;
  listingStatus: string;
}

export const handler: Handler = async (event) => {
  // 1. Method guard
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // 2. Stripe key guard
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider configuration is missing' }) };
  }
  if (!stripeKey.startsWith('sk_')) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider key is invalid' }) };
  }

  // 3. Supabase guard
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration is missing' }) };
  }

  // 4. Parse body
  let body: PaymentIntentBody;
  try {
    body = JSON.parse(event.body ?? '{}') as PaymentIntentBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const {
    items,
    buyerId,
    shippingAddress,
    billingAddress,
    shippingMethodId,
    shippingMethod,
  } = body;

  if (!items?.length || !billingAddress) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // 5a. JWT verification — authentication is required for mobile payments.
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

  if (!verifiedBuyerId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required. Please sign in to complete your purchase.' }),
    };
  }

  // Rate-limit: 10 payment-intent attempts per buyer per 60-minute window.
  const piRl = await checkRateLimit({
    supabase,
    tableName: 'create_payment_intent_rate_limits',
    identifier: verifiedBuyerId,
    windowMinutes: 60,
    maxAttempts: 10,
  });
  if (piRl.exceeded) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many payment attempts. Please wait a moment and try again.' }),
    };
  }

  // 5b. Maintenance mode guard
  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance) {
    const { data: callerRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', verifiedBuyerId)
      .maybeSingle<{ role: string | null }>();
    const isAdmin = callerRow?.role === 'admin';
    if (!isAdmin) {
      return { statusCode: 503, body: JSON.stringify({ error: 'Platform is temporarily under maintenance' }) };
    }
  }

  // 5c. Release any expired product reservations before validating availability.
  // This is a lazy-cleanup: reservations older than 15 min are freed so other
  // buyers can purchase. Non-fatal if the RPC is not yet deployed.
  await supabase.rpc('release_expired_reservations').catch((err: unknown) => {
    console.warn('create-payment-intent: release_expired_reservations RPC failed (non-fatal):', err);
  });

  // 6. Validate products from DB (price integrity + availability)
  const productIds = items.map((i) => i.productId);
  const { data: dbProducts, error: dbError } = await supabase
    .from('products')
    .select('id, price, title, sellerId, isActive, isApproved, stockQuantity, listingContext, listingStatus')
    .in('id', productIds);

  if (dbError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database price validation failed' }) };
  }

  const productMap = new Map((dbProducts ?? []).map((p: DBProduct) => [p.id, p]));

  for (const item of items) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct || !dbProduct.isActive || !dbProduct.isApproved) {
      return { statusCode: 400, body: JSON.stringify({ error: `Item "${item.title}" is no longer available` }) };
    }
    // Reject products already reserved or sold
    if (dbProduct.listingStatus === 'reserved' || dbProduct.listingStatus === 'sold') {
      return { statusCode: 400, body: JSON.stringify({ error: `Item "${item.title}" is no longer available` }) };
    }
    if (dbProduct.listingContext !== 'service') {
      if (typeof dbProduct.stockQuantity === 'number' && dbProduct.stockQuantity <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Item "${item.title}" is out of stock` }) };
      }
      if (typeof dbProduct.stockQuantity === 'number' && item.quantity > dbProduct.stockQuantity) {
        return { statusCode: 400, body: JSON.stringify({ error: `Only ${dbProduct.stockQuantity} unit(s) of "${item.title}" are available` }) };
      }
    }
  }

  // Determine if every item in the cart is a service listing.
  const isServiceOnlyCart = items.every((item) => {
    const dbProduct = productMap.get(item.productId);
    return dbProduct?.listingContext === 'service';
  });

  const effectiveShippingAddress = shippingAddress ?? {};
  if (!isServiceOnlyCart && (!shippingAddress || Object.keys(shippingAddress).length === 0)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Shipping address is required for physical product orders.' }),
    };
  }

  // Resolve shipping cost server-side from DB only (never trust client pricing).
  // Physical-goods carts must provide a selected shipping method UUID.
  let shippingAmount = 0;
  let resolvedShippingMethodLabel = 'Standard';
  const hasUUIDFormat = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  if (!isServiceOnlyCart) {
    if (!shippingMethodId || !hasUUIDFormat(shippingMethodId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Please select a valid shipping method.' }),
      };
    }

    const goodsProductIds = items
      .filter((item) => productMap.get(item.productId)?.listingContext !== 'service')
      .map((item) => item.productId);

    const { data: productShippingRows, error: psError } = await supabase
      .from('product_shipping')
      .select('product_id, shipping_methods!method_id(id, active, name, shipping_rates(price))')
      .eq('method_id', shippingMethodId)
      .in('product_id', goodsProductIds);

    if (psError) {
      console.error('create-payment-intent: shipping method validation failed:', psError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Unable to validate shipping method. Please try again.' }),
      };
    }

    if (!productShippingRows || productShippingRows.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'The selected shipping method is not available for these products.' }),
      };
    }

    const matchedGoodsProducts = new Set(productShippingRows.map((row) => row.product_id));
    if (matchedGoodsProducts.size !== goodsProductIds.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'The selected shipping method is not available for all products in your cart.' }),
      };
    }

    type ShippingMethodRow = {
      id: string;
      active: boolean;
      name?: string | null;
      shipping_rates: Array<{ price: number }> | null;
    };
    const rawMethod = (productShippingRows[0] as Record<string, unknown>)['shipping_methods'];
    const method: ShippingMethodRow | null = Array.isArray(rawMethod)
      ? (rawMethod[0] as ShippingMethodRow) ?? null
      : (rawMethod as ShippingMethodRow | null);

    if (!method || !method.active) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'The selected shipping method is no longer available.' }),
      };
    }

    const rates = Array.isArray(method.shipping_rates) ? method.shipping_rates : [];
    shippingAmount = rates.length > 0
      ? Math.min(...rates.map((r) => Number(r.price)))
      : 0;
    resolvedShippingMethodLabel = method.name?.trim() || 'Standard';
  }

  // Build enriched items — price and sellerId come from the DB only.
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

  // Single-seller enforcement (same as create-checkout.ts)
  const uniqueSellerIds = [...new Set(enrichedItems.map((i) => i.sellerId))];
  if (uniqueSellerIds.length > 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'For now, please complete purchases from one seller at a time.' }),
    };
  }

  // Seller Stripe-readiness check
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
    console.error('create-payment-intent: seller profile query failed:', sellerProfileError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify seller status. Please try again.' }) };
  }

  if (sellerProfile?.sellerStatus === 'suspended') {
    return { statusCode: 400, body: JSON.stringify({ error: 'This seller is currently unavailable.' }) };
  }

  if (!sellerProfile?.stripeAccountId || sellerProfile.stripeConnectStatus !== 'active') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'This seller is not ready to accept payments yet. Please try again later or contact support.' }),
    };
  }

  const subtotal = enrichedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + shippingAmount;

  // B2B reverse-charge VAT check
  const VAT_RATE = 0.20;
  const { data: buyerProfile } = await supabase
    .from('buyer_profiles')
    .select('accountType, isVatVerified')
    .eq('userId', verifiedBuyerId)
    .maybeSingle<{ accountType: string | null; isVatVerified: boolean | null }>();

  const isB2BBuyer =
    Boolean(buyerProfile?.accountType) && buyerProfile?.accountType !== 'individual';
  const applyReverseCharge = isB2BBuyer && Boolean(buyerProfile?.isVatVerified);

  // Stripe-charged amount respects reverse charge
  const chargeableTotal = applyReverseCharge
    ? enrichedItems.reduce((sum, i) => sum + (i.price / (1 + VAT_RATE)) * i.quantity, 0) + shippingAmount
    : total;

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // transferGroup links all Connect transfers to this payment for audit purposes.
    const transferGroup = randomUUID();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeableTotal * 100), // pence
      currency: 'gbp',
      payment_method_types: ['card'],
      transfer_group: transferGroup,
      metadata: {
        buyerId: verifiedBuyerId,
        productIds: productIds.join(','),
        transferGroup,
        source: 'mobile',
      },
    });

    // Pre-populate payment_sessions so the webhook (payment_intent.succeeded)
    // can create orders without re-querying Stripe.
    // stripeSessionId is set to the PaymentIntent ID (no Checkout Session exists
    // in the mobile flow). stripePaymentIntent is also set at insert time so the
    // webhook can look up this record by PaymentIntent ID.
    const { error: sessionInsertError } = await supabase
      .from('payment_sessions')
      .insert({
        stripeSessionId:     paymentIntent.id,   // PI id as session identifier
        stripePaymentIntent: paymentIntent.id,   // also set here for webhook lookup
        userId:   verifiedBuyerId || null,
        status:   'pending',
        amount:   total,
        currency: 'GBP',
        metadata: {
          items: enrichedItems,
          shippingAddress: effectiveShippingAddress,
          billingAddress,
          subtotal,
          shippingAmount,
          shippingMethodId: shippingMethodId ?? null,
          shippingMethod: resolvedShippingMethodLabel || shippingMethod || 'Standard',
          total,
          buyerId: verifiedBuyerId,
          transferGroup,
          isB2B: isB2BBuyer,
          applyReverseCharge,
          source: 'mobile',
        },
      });

    if (sessionInsertError) {
      // If we cannot persist the session the webhook has nothing to work with —
      // cancel the PaymentIntent so the customer is not charged.
      console.error('create-payment-intent: failed to insert payment_sessions record:', sessionInsertError);
      await stripe.paymentIntents.cancel(paymentIntent.id).catch((e: unknown) =>
        console.error('create-payment-intent: failed to cancel orphaned PaymentIntent:', e),
      );
      return { statusCode: 500, body: JSON.stringify({ error: 'Order initialisation failed. Please try again.' }) };
    }

    // Reserve the product (CAS update — only writes if still 'active').
    // This prevents two concurrent buyers from both seeing the item as available.
    // Only applied to goods listings (service listings have no inventory to reserve).
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    for (const item of enrichedItems) {
      const dbProduct = productMap.get(item.productId) as DBProduct;
      if (dbProduct?.listingContext !== 'service') {
        const { count } = await supabase
          .from('products')
          .update({ listingStatus: 'reserved', reservedUntil })
          .eq('id', item.productId)
          .eq('listingStatus', 'active') // CAS: only if still active
          .select('id', { count: 'exact', head: true });

        if (!count || count === 0) {
          // Another buyer reserved it between our read and this write — abort.
          await stripe.paymentIntents.cancel(paymentIntent.id).catch((e: unknown) =>
            console.error('create-payment-intent: failed to cancel PaymentIntent after reservation race:', e),
          );
          await supabase
            .from('payment_sessions')
            .update({ status: 'cancelled' })
            .eq('stripeSessionId', paymentIntent.id);
          return { statusCode: 409, body: JSON.stringify({ error: `Item "${item.title}" is no longer available` }) };
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        client_secret:      paymentIntent.client_secret,
        payment_intent_id:  paymentIntent.id,
        amount_pence:       Math.round(chargeableTotal * 100),
      }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PaymentIntent creation failed';
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};
