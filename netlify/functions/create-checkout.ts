import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';

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
  /** Client-provided shipping amount is intentionally ignored. */
  shippingAmount?: number;
  shippingMethodId?: string;
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
  listingContext: string;
  listingStatus: string;
}

const STRIPE_CHECKOUT_WINDOW_MINUTES = 30;
const DB_RESERVATION_FAILSAFE_MINUTES = 60;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeKey || !stripeKey.startsWith('sk_')) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider configuration is invalid' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration is missing' }) };
  }

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
    shippingMethodId,
    shippingMethod,
  } = body;

  if (!Array.isArray(items) || items.length === 0 || !billingAddress) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Every checkout item must have a valid product and positive whole-number quantity.' }) };
  }

  const submittedProductIds = items.map((item) => item.productId);
  if (new Set(submittedProductIds).size !== submittedProductIds.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Each product may appear only once in a checkout. Please update the quantity instead of adding a duplicate line.' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Checkout uses service_role for reservations and payment-session materialisation.
  // A stale but valid access token from a suspended account must stop before any
  // reservation, rate-limit write, Stripe creation, or payment-session write.
  const auth = await authenticateActiveAccount(event, supabase);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({
        error: auth.status === 401
          ? 'Authentication required. Please sign in to complete your purchase.'
          : 'This account is not active and cannot place orders.',
      }),
    };
  }

  const verifiedBuyerId = auth.actor.id;
  if (buyerId && buyerId !== verifiedBuyerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'buyerId does not match authenticated user' }) };
  }

  const reservationToken = randomUUID();
  let reservedProductIds: string[] = [];
  const releaseReservedProducts = async () => {
    if (reservedProductIds.length === 0) return;
    await supabase
      .from('products')
      .update({ listingStatus: 'active', reservedUntil: null, reservationToken: null })
      .in('id', reservedProductIds)
      .eq('listingStatus', 'reserved')
      .eq('reservationToken', reservationToken)
      .catch((err: unknown) => {
        console.error('create-checkout: failed to release product reservations:', err);
      });
    reservedProductIds = [];
  };

  const checkoutRl = await checkRateLimit({
    supabase,
    tableName: 'create_checkout_rate_limits',
    identifier: verifiedBuyerId,
    windowMinutes: 60,
    maxAttempts: 10,
    policy: 'fail-closed',
  });
  if (checkoutRl.exceeded) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many checkout attempts. Please wait a moment and try again.' }),
    };
  }

  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance && auth.actor.role !== 'admin') {
    return { statusCode: 503, body: JSON.stringify({ error: 'Platform is temporarily under maintenance' }) };
  }

  const maybeRpc = (supabase as typeof supabase & { rpc?: (fn: string) => Promise<unknown> }).rpc;
  if (typeof maybeRpc === 'function') {
    await maybeRpc.call(supabase, 'release_expired_reservations').catch((err: unknown) => {
      console.warn('create-checkout: release_expired_reservations RPC failed (non-fatal):', err);
    });
    await maybeRpc.call(supabase, 'release_stale_unpaid_listing_locks').catch((err: unknown) => {
      console.warn('create-checkout: release_stale_unpaid_listing_locks RPC failed (non-fatal):', err);
    });
  }

  const productIds = submittedProductIds;
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
    if (
      !dbProduct ||
      !dbProduct.isActive ||
      !dbProduct.isApproved ||
      dbProduct.listingStatus !== 'active'
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Item "${dbProduct?.title ?? item.title}" is no longer available` }),
      };
    }
    if (!Number.isFinite(dbProduct.price) || dbProduct.price <= 0) {
      return { statusCode: 409, body: JSON.stringify({ error: `Item "${dbProduct.title}" has an invalid price.` }) };
    }
    if (dbProduct.listingContext !== 'service') {
      if (typeof dbProduct.stockQuantity !== 'number' || dbProduct.stockQuantity <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Item "${dbProduct.title}" is out of stock` }) };
      }
      if (item.quantity > dbProduct.stockQuantity) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Only ${dbProduct.stockQuantity} unit(s) of "${dbProduct.title}" are available` }),
        };
      }
    }
  }

  const isServiceOnlyCart = items.every((item) => productMap.get(item.productId)?.listingContext === 'service');
  const effectiveShippingAddress = shippingAddress ?? {};
  if (!isServiceOnlyCart && (!shippingAddress || Object.keys(shippingAddress).length === 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Shipping address is required for physical product orders.' }) };
  }

  const enrichedItems = items.map((item) => {
    const dbProduct = productMap.get(item.productId) as DBProduct;
    return {
      productId: item.productId,
      sellerId: dbProduct.sellerId,
      quantity: item.quantity,
      price: dbProduct.price,
      title: dbProduct.title,
    };
  });

  const uniqueSellerIds = [...new Set(enrichedItems.map((i) => i.sellerId))];
  if (uniqueSellerIds.length !== 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'For now, please complete purchases from one seller at a time.' }),
    };
  }

  const checkoutSellerId = uniqueSellerIds[0];
  const { data: sellerProfile, error: sellerProfileError } = await supabase
    .from('seller_profiles')
    .select('stripeAccountId, stripeConnectStatus, sellerStatus, isPaused')
    .eq('userId', checkoutSellerId)
    .maybeSingle<{
      stripeAccountId: string | null;
      stripeConnectStatus: string | null;
      sellerStatus: string | null;
      isPaused: boolean | null;
    }>();

  if (sellerProfileError) {
    console.error('create-checkout: seller profile query failed:', sellerProfileError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify seller status. Please try again.' }) };
  }

  if (
    !sellerProfile?.stripeAccountId ||
    sellerProfile.stripeConnectStatus !== 'active' ||
    sellerProfile.sellerStatus !== 'active' ||
    sellerProfile.isPaused === true
  ) {
    return { statusCode: 400, body: JSON.stringify({ error: 'This seller is not currently available to accept payments.' }) };
  }

  let shippingAmount = 0;
  let resolvedShippingMethodLabel = 'Standard';
  const hasUUIDFormat = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  if (!isServiceOnlyCart) {
    if (!shippingMethodId || !hasUUIDFormat(shippingMethodId)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Please select a valid shipping method.' }) };
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
      console.error('create-checkout: shipping method validation failed:', psError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to validate shipping method. Please try again.' }) };
    }

    if (!productShippingRows || productShippingRows.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'The selected shipping method is not available for these products.' }) };
    }

    const matchedGoodsProducts = new Set(productShippingRows.map((row) => row.product_id));
    if (matchedGoodsProducts.size !== goodsProductIds.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'The selected shipping method is not available for all products in your cart.' }) };
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
      return { statusCode: 400, body: JSON.stringify({ error: 'The selected shipping method is no longer available.' }) };
    }

    const validRates = (Array.isArray(method.shipping_rates) ? method.shipping_rates : [])
      .map((rate) => Number(rate.price))
      .filter((price) => Number.isFinite(price) && price >= 0);
    if (validRates.length === 0) {
      return { statusCode: 409, body: JSON.stringify({ error: 'The selected shipping method has no valid rate.' }) };
    }
    shippingAmount = Math.min(...validRates);
    resolvedShippingMethodLabel = method.name?.trim() || 'Standard';
  }

  const VAT_RATE = 0.20;
  const { data: buyerProfile } = await supabase
    .from('buyer_profiles')
    .select('accountType, isVatVerified')
    .eq('userId', verifiedBuyerId)
    .maybeSingle<{ accountType: string | null; isVatVerified: boolean | null }>();

  const isB2BBuyer = Boolean(buyerProfile?.accountType) && buyerProfile?.accountType !== 'individual';
  const applyReverseCharge = isB2BBuyer && Boolean(buyerProfile?.isVatVerified);

  const catalogSubtotalPence = enrichedItems.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );
  const chargeableSubtotalPence = enrichedItems.reduce((sum, item) => {
    const unitPrice = applyReverseCharge ? item.price / (1 + VAT_RATE) : item.price;
    return sum + Math.round(unitPrice * 100) * item.quantity;
  }, 0);
  const shippingAmountPence = Math.round(shippingAmount * 100);
  shippingAmount = shippingAmountPence / 100;
  const totalPence = chargeableSubtotalPence + shippingAmountPence;
  const subtotal = catalogSubtotalPence / 100;
  const total = (catalogSubtotalPence + shippingAmountPence) / 100;
  const chargeableSubtotal = chargeableSubtotalPence / 100;
  const chargeableTotal = totalPence / 100;

  const reservableProductIds = enrichedItems
    .filter((item) => productMap.get(item.productId)?.listingContext !== 'service')
    .map((item) => item.productId);
  const reservedUntil = new Date(
    Date.now() + DB_RESERVATION_FAILSAFE_MINUTES * 60 * 1000,
  ).toISOString();
  for (const productId of reservableProductIds) {
    const { count } = await supabase
      .from('products')
      .update({ listingStatus: 'reserved', reservedUntil, reservationToken })
      .eq('id', productId)
      .eq('listingStatus', 'active')
      .select('id', { count: 'exact', head: true });

    if (!count || count === 0) {
      await releaseReservedProducts();
      const item = enrichedItems.find((i) => i.productId === productId);
      return { statusCode: 409, body: JSON.stringify({ error: `Item "${item?.title ?? 'selected item'}" is no longer available` }) };
    }
    reservedProductIds.push(productId);
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = enrichedItems.map((item) => {
      const unitPrice = applyReverseCharge ? item.price / (1 + VAT_RATE) : item.price;
      return {
        price_data: {
          currency: 'gbp',
          product_data: { name: item.title },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: item.quantity,
      };
    });

    if (shippingAmountPence > 0) {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: `Shipping — ${resolvedShippingMethodLabel}` },
          unit_amount: shippingAmountPence,
        },
        quantity: 1,
      });
    }

    const rawSiteUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').trim();
    let siteUrl: string;
    try {
      const parsed = new URL(rawSiteUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad protocol');
      siteUrl = parsed.origin;
    } catch {
      await releaseReservedProducts();
      return { statusCode: 500, body: JSON.stringify({ error: 'Application URL configuration is invalid' }) };
    }

    const transferGroup = randomUUID();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_CHECKOUT_WINDOW_MINUTES * 60,
      success_url: `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      payment_intent_data: { transfer_group: transferGroup },
      metadata: {
        buyerId: verifiedBuyerId,
        productIds: productIds.join(','),
        transferGroup,
        reservationToken,
      },
    });

    const { error: sessionInsertError } = await supabase
      .from('payment_sessions')
      .insert({
        stripeSessionId: session.id,
        userId: verifiedBuyerId,
        status: 'pending',
        amount: chargeableTotal,
        currency: 'GBP',
        metadata: {
          items: enrichedItems,
          shippingAddress: effectiveShippingAddress,
          billingAddress,
          subtotal,
          chargeableSubtotal,
          chargeableSubtotalPence,
          shippingAmount,
          shippingAmountPence,
          shippingMethodId: shippingMethodId ?? null,
          shippingMethod: resolvedShippingMethodLabel || shippingMethod || 'Standard',
          total: chargeableTotal,
          totalPence,
          catalogTotal: total,
          buyerId: verifiedBuyerId,
          transferGroup,
          reservationToken,
          isB2B: isB2BBuyer,
          applyReverseCharge,
        },
      });

    if (sessionInsertError) {
      console.error('Failed to pre-insert payment_sessions record:', sessionInsertError);
      await stripe.checkout.sessions.expire(session.id).catch((expireError: unknown) => {
        console.error('Failed to expire orphaned Stripe Checkout Session:', expireError);
      });
      await releaseReservedProducts();
      return { statusCode: 500, body: JSON.stringify({ error: 'Order initialisation failed. Please try again.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: session.url, sessionId: session.id }) };
  } catch (err: unknown) {
    await releaseReservedProducts();
    console.error('create-checkout: checkout session creation failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Checkout session creation failed. Please try again.' }) };
  }
};
