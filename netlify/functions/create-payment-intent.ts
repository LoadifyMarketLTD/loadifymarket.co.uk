/**
 * create-payment-intent
 * Mobile PaymentIntent equivalent of create-checkout.ts.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';
import { resolveMarketplaceTaxV1 } from './_shared/marketplaceTax';

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
  shippingAmount?: number;
  shippingMethodId?: string;
  shippingMethod?: string;
}

interface DBProduct {
  id: string;
  price: number;
  priceExVat: number | null;
  vatRate: number | null;
  taxTreatmentStatus: string | null;
  taxTreatmentSource: string | null;
  taxEvidenceVersion: number | null;
  taxEvidenceCapturedAt: string | null;
  title: string;
  sellerId: string;
  isActive: boolean;
  isApproved: boolean;
  stockQuantity: number;
  listingContext: string;
  listingStatus: string;
  images: string[];
}

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

  let body: PaymentIntentBody;
  try {
    body = JSON.parse(event.body ?? '{}') as PaymentIntentBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { items, buyerId, shippingAddress, billingAddress, shippingMethodId, shippingMethod } = body;
  if (!Array.isArray(items) || items.length === 0 || !billingAddress) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
  if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Every payment item must have a valid product and positive whole-number quantity.' }) };
  }

  const submittedProductIds = items.map((item) => item.productId);
  if (new Set(submittedProductIds).size !== submittedProductIds.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Each product may appear only once in a payment. Please update the quantity instead of adding a duplicate line.' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const reservationToken = randomUUID();

  // Mobile payment creation also runs with service_role. Enforce current account
  // state before product reservations or Stripe side effects so a stale JWT from
  // a suspended account cannot cross the trusted server boundary.
  const buyerAuth = await authenticateActiveAccount(event, supabase);
  if (!buyerAuth.ok) {
    return {
      statusCode: buyerAuth.status,
      body: JSON.stringify({
        error: buyerAuth.status === 401
          ? 'Authentication required. Please sign in to complete your purchase.'
          : 'This account is not active and cannot complete checkout.',
      }),
    };
  }

  const verifiedBuyerId = buyerAuth.actor.id;
  if (buyerId && buyerId !== verifiedBuyerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'buyerId does not match authenticated user' }) };
  }

  const piRl = await checkRateLimit({
    supabase,
    tableName: 'create_payment_intent_rate_limits',
    identifier: verifiedBuyerId,
    windowMinutes: 60,
    maxAttempts: 10,
    policy: 'fail-closed',
  });
  if (piRl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many payment attempts. Please wait a moment and try again.' }) };
  }

  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance && buyerAuth.actor.role !== 'admin') {
    return { statusCode: 503, body: JSON.stringify({ error: 'Platform is temporarily under maintenance' }) };
  }

  await supabase.rpc('release_expired_reservations').catch((err: unknown) => {
    console.warn('create-payment-intent: release_expired_reservations RPC failed (non-fatal):', err);
  });
  await supabase.rpc('release_stale_unpaid_listing_locks').catch((err: unknown) => {
    console.warn('create-payment-intent: release_stale_unpaid_listing_locks RPC failed (non-fatal):', err);
  });

  const productIds = submittedProductIds;
  const { data: dbProducts, error: dbError } = await supabase
    .from('products')
    .select('id, price, priceExVat, vatRate, taxTreatmentStatus, taxTreatmentSource, taxEvidenceVersion, taxEvidenceCapturedAt, title, sellerId, isActive, isApproved, stockQuantity, listingContext, listingStatus, images')
    .in('id', productIds);

  if (dbError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database price validation failed' }) };
  }

  const productMap = new Map((dbProducts ?? []).map((p: DBProduct) => [p.id, p]));
  for (const item of items) {
    const dbProduct = productMap.get(item.productId);
    if (!dbProduct || !dbProduct.isActive || !dbProduct.isApproved || dbProduct.listingStatus !== 'active') {
      return { statusCode: 400, body: JSON.stringify({ error: `Item "${dbProduct?.title ?? item.title}" is no longer available` }) };
    }
    if (!Number.isFinite(dbProduct.price) || dbProduct.price <= 0) {
      return { statusCode: 409, body: JSON.stringify({ error: `Item "${dbProduct.title}" has an invalid price.` }) };
    }
    if (dbProduct.listingContext !== 'service') {
      if (typeof dbProduct.stockQuantity !== 'number' || dbProduct.stockQuantity <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: `Item "${dbProduct.title}" is out of stock` }) };
      }
      if (item.quantity > dbProduct.stockQuantity) {
        return { statusCode: 400, body: JSON.stringify({ error: `Only ${dbProduct.stockQuantity} unit(s) of "${dbProduct.title}" are available` }) };
      }
    }
  }

  const isServiceOnlyCart = items.every((item) => productMap.get(item.productId)?.listingContext === 'service');
  const effectiveShippingAddress = shippingAddress ?? {};
  if (!isServiceOnlyCart && (!shippingAddress || Object.keys(shippingAddress).length === 0)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Shipping address is required for physical product orders.' }) };
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
      console.error('create-payment-intent: shipping method validation failed:', psError.message);
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

  const enrichedItems = items.map((item) => {
    const dbProduct = productMap.get(item.productId) as DBProduct;
    return {
      productId: item.productId,
      sellerId: dbProduct.sellerId,
      quantity: item.quantity,
      price: dbProduct.price,
      priceExVat: dbProduct.priceExVat,
      vatRate: dbProduct.vatRate,
      taxTreatmentStatus: dbProduct.taxTreatmentStatus,
      taxTreatmentSource: dbProduct.taxTreatmentSource,
      taxEvidenceVersion: dbProduct.taxEvidenceVersion,
      taxEvidenceCapturedAt: dbProduct.taxEvidenceCapturedAt,
      title: dbProduct.title,
      image: Array.isArray(dbProduct.images) && dbProduct.images.length > 0 ? dbProduct.images[0] : null,
      listingContext: dbProduct.listingContext === 'service' ? 'service' as const : 'product' as const,
    };
  });

  const uniqueSellerIds = [...new Set(enrichedItems.map((i) => i.sellerId))];
  if (uniqueSellerIds.length !== 1) {
    return { statusCode: 400, body: JSON.stringify({ error: 'For now, please complete purchases from one seller at a time.' }) };
  }

  const checkoutSellerId = uniqueSellerIds[0];
  const { data: sellerAccount, error: sellerAccountError } = await supabase
    .from('users')
    .select('id, role, isActive')
    .eq('id', checkoutSellerId)
    .maybeSingle<{ id: string; role: string; isActive: boolean }>();

  if (sellerAccountError) {
    console.error('create-payment-intent: seller account query failed:', sellerAccountError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify seller account. Please try again.' }) };
  }
  if (!sellerAccount || sellerAccount.role !== 'seller' || sellerAccount.isActive !== true) {
    return { statusCode: 400, body: JSON.stringify({ error: 'This seller is not currently available to accept payments.' }) };
  }

  const { data: sellerProfile, error: sellerProfileError } = await supabase
    .from('seller_profiles')
    .select('stripeAccountId, stripeConnectStatus, sellerStatus, isPaused, businessName, fullName, country, isVatRegistered, vatNumber, businessAddress, taxDeclarationConfirmed, taxDeclarationVersion, taxDeclarationSource, taxDeclarationCapturedAt')
    .eq('userId', checkoutSellerId)
    .maybeSingle<{
      stripeAccountId: string | null;
      stripeConnectStatus: string | null;
      sellerStatus: string | null;
      isPaused: boolean | null;
      businessName: string | null;
      fullName: string | null;
      country: string | null;
      isVatRegistered: boolean | null;
      vatNumber: string | null;
      businessAddress: Record<string, unknown> | null;
      taxDeclarationConfirmed: boolean | null;
      taxDeclarationVersion: number | null;
      taxDeclarationSource: string | null;
      taxDeclarationCapturedAt: string | null;
    }>();

  if (sellerProfileError) {
    console.error('create-payment-intent: seller profile query failed:', sellerProfileError.message);
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

  const sellerBusinessName = sellerProfile.businessName?.trim() || sellerProfile.fullName?.trim() || '';
  if (!sellerBusinessName) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Seller commercial identity is incomplete. Please try again later.' }) };
  }

  const taxDecision = resolveMarketplaceTaxV1({
    seller: {
      country: sellerProfile.country,
      isVatRegistered: sellerProfile.isVatRegistered,
      vatNumber: sellerProfile.vatNumber,
      businessAddress: sellerProfile.businessAddress,
      taxDeclarationConfirmed: sellerProfile.taxDeclarationConfirmed,
      taxDeclarationVersion: sellerProfile.taxDeclarationVersion,
      taxDeclarationSource: sellerProfile.taxDeclarationSource,
      taxDeclarationCapturedAt: sellerProfile.taxDeclarationCapturedAt,
    },
    products: enrichedItems.map((item) => ({
      id: item.productId,
      price: item.price,
      priceExVat: item.priceExVat,
      vatRate: item.vatRate,
      listingContext: item.listingContext,
      taxTreatmentStatus: item.taxTreatmentStatus,
      taxTreatmentSource: item.taxTreatmentSource,
      taxEvidenceVersion: item.taxEvidenceVersion,
      taxEvidenceCapturedAt: item.taxEvidenceCapturedAt,
    })),
    shippingAddress: effectiveShippingAddress,
    billingAddress,
  });
  if (!taxDecision.ok) {
    return { statusCode: 409, body: JSON.stringify({ error: taxDecision.message, code: taxDecision.code }) };
  }

  const { data: buyerProfile, error: buyerProfileError } = await supabase
    .from('buyer_profiles')
    .select('accountType, companyName, vatNumber')
    .eq('userId', verifiedBuyerId)
    .maybeSingle<{
      accountType: string | null;
      companyName: string | null;
      vatNumber: string | null;
    }>();

  if (buyerProfileError) {
    console.error('create-payment-intent: buyer profile query failed:', buyerProfileError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify buyer identity. Please try again.' }) };
  }

  const { data: buyerUser, error: buyerUserError } = await supabase
    .from('users')
    .select('email, firstName, lastName')
    .eq('id', verifiedBuyerId)
    .maybeSingle<{ email: string; firstName: string | null; lastName: string | null }>();

  if (buyerUserError || !buyerUser) {
    console.error('create-payment-intent: buyer user query failed:', buyerUserError?.message ?? 'buyer row missing');
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify buyer identity. Please try again.' }) };
  }

  const buyerEmail = buyerUser.email?.trim() || '';
  if (!buyerEmail) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Buyer email identity is incomplete. Please update your account details.' }) };
  }
  const buyerName = [buyerUser.firstName, buyerUser.lastName]
    .map((part) => part?.trim() || '')
    .filter(Boolean)
    .join(' ')
    .trim() || buyerEmail;

  const isB2BBuyer = Boolean(buyerProfile?.accountType) && buyerProfile?.accountType !== 'individual';
  const applyReverseCharge = taxDecision.applyReverseCharge;
  const buyerSnapshot = {
    id: verifiedBuyerId,
    name: buyerName,
    email: buyerEmail,
    companyName: buyerProfile?.companyName?.trim() || null,
    vatNumber: buyerProfile?.vatNumber?.trim() || null,
    isB2B: isB2BBuyer,
    reverseCharge: applyReverseCharge,
  };
  const sellerSnapshot = {
    id: checkoutSellerId,
    businessName: sellerBusinessName,
  };

  const catalogSubtotalPence = enrichedItems.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );
  const chargeableSubtotalPence = catalogSubtotalPence;
  const shippingAmountPence = Math.round(shippingAmount * 100);
  shippingAmount = shippingAmountPence / 100;
  const totalPence = chargeableSubtotalPence + shippingAmountPence;
  const subtotal = catalogSubtotalPence / 100;
  const total = (catalogSubtotalPence + shippingAmountPence) / 100;
  const chargeableSubtotal = chargeableSubtotalPence / 100;
  const chargeableTotal = totalPence / 100;

  const reservedProductIds: string[] = [];
  const reservedUntil = new Date(
    Date.now() + DB_RESERVATION_FAILSAFE_MINUTES * 60 * 1000,
  ).toISOString();
  for (const item of enrichedItems) {
    const dbProduct = productMap.get(item.productId) as DBProduct;
    if (dbProduct.listingContext === 'service') continue;

    const { count } = await supabase
      .from('products')
      .update({ listingStatus: 'reserved', reservedUntil, reservationToken })
      .eq('id', item.productId)
      .eq('listingStatus', 'active')
      .select('id', { count: 'exact', head: true });

    if (!count || count === 0) {
      if (reservedProductIds.length > 0) {
        await supabase
          .from('products')
          .update({ listingStatus: 'active', reservedUntil: null, reservationToken: null })
          .in('id', reservedProductIds)
          .eq('listingStatus', 'reserved')
          .eq('reservationToken', reservationToken);
      }
      return { statusCode: 409, body: JSON.stringify({ error: `Item "${item.title}" is no longer available` }) };
    }
    reservedProductIds.push(item.productId);
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const transferGroup = randomUUID();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalPence,
      currency: 'gbp',
      payment_method_types: ['card'],
      transfer_group: transferGroup,
      metadata: {
        buyerId: verifiedBuyerId,
        productIds: productIds.join(','),
        transferGroup,
        reservationToken,
        source: 'mobile',
      },
    });

    const { error: sessionInsertError } = await supabase
      .from('payment_sessions')
      .insert({
        stripeSessionId: paymentIntent.id,
        stripePaymentIntent: paymentIntent.id,
        userId: verifiedBuyerId,
        status: 'pending',
        amount: chargeableTotal,
        currency: 'GBP',
        metadata: {
          commercialSnapshotVersion: 1,
          buyerSnapshot,
          sellerSnapshot,
          taxSnapshot: taxDecision.snapshot,
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
          source: 'mobile',
        },
      });

    if (sessionInsertError) {
      console.error('create-payment-intent: failed to insert payment_sessions record:', sessionInsertError);
      await stripe.paymentIntents.cancel(paymentIntent.id).catch((e: unknown) =>
        console.error('create-payment-intent: failed to cancel orphaned PaymentIntent:', e),
      );
      if (reservedProductIds.length > 0) {
        await supabase
          .from('products')
          .update({ listingStatus: 'active', reservedUntil: null, reservationToken: null })
          .in('id', reservedProductIds)
          .eq('listingStatus', 'reserved')
          .eq('reservationToken', reservationToken);
      }
      return { statusCode: 500, body: JSON.stringify({ error: 'Order initialisation failed. Please try again.' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount_pence: totalPence,
      }),
    };
  } catch (err: unknown) {
    if (reservedProductIds.length > 0) {
      await supabase
        .from('products')
        .update({ listingStatus: 'active', reservedUntil: null, reservationToken: null })
        .in('id', reservedProductIds)
        .eq('listingStatus', 'reserved')
        .eq('reservationToken', reservationToken);
    }
    console.error('create-payment-intent: PaymentIntent creation failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'PaymentIntent creation failed. Please try again.' }) };
  }
};
