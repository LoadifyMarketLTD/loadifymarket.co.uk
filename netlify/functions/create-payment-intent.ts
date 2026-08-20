/** Mobile PaymentIntent equivalent of create-checkout.ts. */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { Handler } from '@netlify/functions';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';
import { resolveMarketplaceTaxV1 } from './_shared/marketplaceTax';

interface CheckoutItem { productId: string; quantity: number; price: number; title: string; sellerId: string }
interface PaymentIntentBody {
  items: CheckoutItem[]; buyerId: string; shippingAddress?: Record<string, string>; billingAddress: Record<string, string>;
  shippingAmount?: number; shippingMethodId?: string; shippingMethod?: string;
}
interface DBProduct {
  id: string; price: number; priceExVat: number | null; vatRate: number | null;
  taxTreatmentStatus: string | null; taxTreatmentSource: string | null; taxEvidenceVersion: number | null; taxEvidenceCapturedAt: string | null;
  title: string; sellerId: string; isActive: boolean; isApproved: boolean; stockQuantity: number; listingContext: string; listingStatus: string; images: string[];
}
const DB_RESERVATION_FAILSAFE_MINUTES = 60;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeKey || !stripeKey.startsWith('sk_')) return { statusCode: 500, body: JSON.stringify({ error: 'Payment provider configuration is invalid' }) };
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceKey) return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration is missing' }) };

  let body: PaymentIntentBody;
  try { body = JSON.parse(event.body ?? '{}') as PaymentIntentBody; }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) }; }
  const { items, buyerId, shippingAddress, billingAddress, shippingMethodId, shippingMethod } = body;
  if (!Array.isArray(items) || items.length === 0 || !billingAddress) return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  if (items.some(i => !i.productId || !Number.isInteger(i.quantity) || i.quantity <= 0)) return { statusCode: 400, body: JSON.stringify({ error: 'Every payment item must have a valid product and positive whole-number quantity.' }) };
  const productIds = items.map(i => i.productId);
  if (new Set(productIds).size !== productIds.length) return { statusCode: 400, body: JSON.stringify({ error: 'Each product may appear only once in a payment. Please update the quantity instead.' }) };

  const supabase = createClient(supabaseUrl, serviceKey);
  const reservationToken = randomUUID();
  let verifiedBuyerId = '';
  const authHeader = event.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.substring(7));
    if (error || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
    if (buyerId && buyerId !== user.id) return { statusCode: 403, body: JSON.stringify({ error: 'buyerId does not match authenticated user' }) };
    verifiedBuyerId = user.id;
  }
  if (!verifiedBuyerId) return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required. Please sign in to complete your purchase.' }) };

  const rl = await checkRateLimit({ supabase, tableName: 'create_payment_intent_rate_limits', identifier: verifiedBuyerId, windowMinutes: 60, maxAttempts: 10, policy: 'fail-closed' });
  if (rl.exceeded) return { statusCode: 429, body: JSON.stringify({ error: 'Too many payment attempts. Please wait a moment and try again.' }) };
  if (await isMaintenanceMode(supabase)) {
    const { data: caller } = await supabase.from('users').select('role').eq('id', verifiedBuyerId).maybeSingle<{ role: string | null }>();
    if (caller?.role !== 'admin') return { statusCode: 503, body: JSON.stringify({ error: 'Platform is temporarily under maintenance' }) };
  }
  await supabase.rpc('release_expired_reservations').catch((e: unknown) => console.warn('create-payment-intent: release_expired_reservations failed:', e));
  await supabase.rpc('release_stale_unpaid_listing_locks').catch((e: unknown) => console.warn('create-payment-intent: release_stale_unpaid_listing_locks failed:', e));

  const { data: dbProducts, error: dbError } = await supabase.from('products')
    .select('id, price, priceExVat, vatRate, taxTreatmentStatus, taxTreatmentSource, taxEvidenceVersion, taxEvidenceCapturedAt, title, sellerId, isActive, isApproved, stockQuantity, listingContext, listingStatus, images')
    .in('id', productIds);
  if (dbError) return { statusCode: 500, body: JSON.stringify({ error: 'Database price validation failed' }) };
  const productMap = new Map((dbProducts ?? []).map((p: DBProduct) => [p.id, p]));
  for (const item of items) {
    const p = productMap.get(item.productId);
    if (!p || !p.isActive || !p.isApproved || p.listingStatus !== 'active') return { statusCode: 400, body: JSON.stringify({ error: `Item "${p?.title ?? item.title}" is no longer available` }) };
    if (!Number.isFinite(p.price) || p.price <= 0) return { statusCode: 409, body: JSON.stringify({ error: `Item "${p.title}" has an invalid price.` }) };
    if (p.listingContext !== 'service' && (p.stockQuantity <= 0 || item.quantity > p.stockQuantity)) return { statusCode: 400, body: JSON.stringify({ error: `Item "${p.title}" does not have enough stock` }) };
  }

  const isServiceOnlyCart = items.every(i => productMap.get(i.productId)?.listingContext === 'service');
  const effectiveShippingAddress = shippingAddress ?? {};
  if (!isServiceOnlyCart && Object.keys(effectiveShippingAddress).length === 0) return { statusCode: 400, body: JSON.stringify({ error: 'Shipping address is required for physical product orders.' }) };

  let shippingAmount = 0;
  let resolvedShippingMethodLabel = 'Standard';
  const uuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  if (!isServiceOnlyCart) {
    if (!shippingMethodId || !uuid(shippingMethodId)) return { statusCode: 400, body: JSON.stringify({ error: 'Please select a valid shipping method.' }) };
    const goodsIds = items.filter(i => productMap.get(i.productId)?.listingContext !== 'service').map(i => i.productId);
    const { data: rows, error } = await supabase.from('product_shipping').select('product_id, shipping_methods!method_id(id, active, name, shipping_rates(price))').eq('method_id', shippingMethodId).in('product_id', goodsIds);
    if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Unable to validate shipping method. Please try again.' }) };
    if (!rows?.length || new Set(rows.map(r => r.product_id)).size !== goodsIds.length) return { statusCode: 400, body: JSON.stringify({ error: 'The selected shipping method is not available for all products in your cart.' }) };
    type Method = { id: string; active: boolean; name?: string | null; shipping_rates: Array<{ price: number }> | null };
    const raw = (rows[0] as Record<string, unknown>)['shipping_methods'];
    const method: Method | null = Array.isArray(raw) ? (raw[0] as Method) ?? null : raw as Method | null;
    if (!method?.active) return { statusCode: 400, body: JSON.stringify({ error: 'The selected shipping method is no longer available.' }) };
    const rates = (method.shipping_rates ?? []).map(r => Number(r.price)).filter(v => Number.isFinite(v) && v >= 0);
    if (!rates.length) return { statusCode: 409, body: JSON.stringify({ error: 'The selected shipping method has no valid rate.' }) };
    shippingAmount = Math.min(...rates);
    resolvedShippingMethodLabel = method.name?.trim() || 'Standard';
  }

  const enrichedItems = items.map(item => {
    const p = productMap.get(item.productId) as DBProduct;
    return { productId: item.productId, sellerId: p.sellerId, quantity: item.quantity, price: p.price, priceExVat: p.priceExVat, vatRate: p.vatRate,
      taxTreatmentStatus: p.taxTreatmentStatus, taxTreatmentSource: p.taxTreatmentSource, taxEvidenceVersion: p.taxEvidenceVersion, taxEvidenceCapturedAt: p.taxEvidenceCapturedAt,
      title: p.title, image: p.images?.[0] ?? null, listingContext: p.listingContext === 'service' ? 'service' as const : 'product' as const };
  });
  const sellers = [...new Set(enrichedItems.map(i => i.sellerId))];
  if (sellers.length !== 1) return { statusCode: 400, body: JSON.stringify({ error: 'For now, please complete purchases from one seller at a time.' }) };
  const sellerId = sellers[0];

  const { data: seller, error: sellerError } = await supabase.from('seller_profiles')
    .select('stripeAccountId, stripeConnectStatus, sellerStatus, isPaused, businessName, fullName, country, isVatRegistered, vatNumber, businessAddress')
    .eq('userId', sellerId).maybeSingle<{ stripeAccountId: string | null; stripeConnectStatus: string | null; sellerStatus: string | null; isPaused: boolean | null; businessName: string | null; fullName: string | null; country: string | null; isVatRegistered: boolean | null; vatNumber: string | null; businessAddress: Record<string, unknown> | null }>();
  if (sellerError) return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify seller status. Please try again.' }) };
  if (!seller?.stripeAccountId || seller.stripeConnectStatus !== 'active' || seller.sellerStatus !== 'active' || seller.isPaused) return { statusCode: 400, body: JSON.stringify({ error: 'This seller is not currently available to accept payments.' }) };
  const sellerBusinessName = seller.businessName?.trim() || seller.fullName?.trim() || '';
  if (!sellerBusinessName) return { statusCode: 409, body: JSON.stringify({ error: 'Seller commercial identity is incomplete. Please try again later.' }) };

  const taxDecision = resolveMarketplaceTaxV1({
    seller: { country: seller.country, isVatRegistered: seller.isVatRegistered, vatNumber: seller.vatNumber, businessAddress: seller.businessAddress },
    products: enrichedItems.map(i => ({ id: i.productId, price: i.price, priceExVat: i.priceExVat, vatRate: i.vatRate, listingContext: i.listingContext, taxTreatmentStatus: i.taxTreatmentStatus, taxTreatmentSource: i.taxTreatmentSource, taxEvidenceVersion: i.taxEvidenceVersion, taxEvidenceCapturedAt: i.taxEvidenceCapturedAt })),
    shippingAddress: effectiveShippingAddress, billingAddress,
  });
  if (!taxDecision.ok) return { statusCode: 409, body: JSON.stringify({ error: taxDecision.message, code: taxDecision.code }) };

  const { data: buyerProfile, error: bpError } = await supabase.from('buyer_profiles').select('accountType, companyName, vatNumber').eq('userId', verifiedBuyerId).maybeSingle<{ accountType: string | null; companyName: string | null; vatNumber: string | null }>();
  if (bpError) return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify buyer identity. Please try again.' }) };
  const { data: buyerUser, error: buError } = await supabase.from('users').select('email, firstName, lastName').eq('id', verifiedBuyerId).maybeSingle<{ email: string; firstName: string | null; lastName: string | null }>();
  if (buError || !buyerUser) return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify buyer identity. Please try again.' }) };
  const buyerEmail = buyerUser.email?.trim() || '';
  if (!buyerEmail) return { statusCode: 409, body: JSON.stringify({ error: 'Buyer email identity is incomplete. Please update your account details.' }) };
  const buyerName = [buyerUser.firstName, buyerUser.lastName].map(v => v?.trim() || '').filter(Boolean).join(' ').trim() || buyerEmail;
  const isB2B = Boolean(buyerProfile?.accountType) && buyerProfile?.accountType !== 'individual';
  const applyReverseCharge = taxDecision.applyReverseCharge;
  const buyerSnapshot = { id: verifiedBuyerId, name: buyerName, email: buyerEmail, companyName: buyerProfile?.companyName?.trim() || null, vatNumber: buyerProfile?.vatNumber?.trim() || null, isB2B, reverseCharge: applyReverseCharge };
  const sellerSnapshot = { id: sellerId, businessName: sellerBusinessName };

  const subtotalPence = enrichedItems.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0);
  const shippingPence = Math.round(shippingAmount * 100);
  const totalPence = subtotalPence + shippingPence;
  shippingAmount = shippingPence / 100;

  const reservedProductIds: string[] = [];
  const reservedUntil = new Date(Date.now() + DB_RESERVATION_FAILSAFE_MINUTES * 60 * 1000).toISOString();
  for (const item of enrichedItems) {
    if (item.listingContext === 'service') continue;
    const { count } = await supabase.from('products').update({ listingStatus: 'reserved', reservedUntil, reservationToken }).eq('id', item.productId).eq('listingStatus', 'active').select('id', { count: 'exact', head: true });
    if (!count) {
      if (reservedProductIds.length) await supabase.from('products').update({ listingStatus: 'active', reservedUntil: null, reservationToken: null }).in('id', reservedProductIds).eq('reservationToken', reservationToken);
      return { statusCode: 409, body: JSON.stringify({ error: `Item "${item.title}" is no longer available` }) };
    }
    reservedProductIds.push(item.productId);
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const transferGroup = randomUUID();
    const pi = await stripe.paymentIntents.create({ amount: totalPence, currency: 'gbp', payment_method_types: ['card'], transfer_group: transferGroup,
      metadata: { buyerId: verifiedBuyerId, productIds: productIds.join(','), transferGroup, reservationToken, source: 'mobile' } });
    const subtotal = subtotalPence / 100;
    const total = totalPence / 100;
    const { error: insertError } = await supabase.from('payment_sessions').insert({
      stripeSessionId: pi.id, stripePaymentIntent: pi.id, userId: verifiedBuyerId, status: 'pending', amount: total, currency: 'GBP',
      metadata: { commercialSnapshotVersion: 1, buyerSnapshot, sellerSnapshot, taxSnapshot: taxDecision.snapshot, items: enrichedItems,
        shippingAddress: effectiveShippingAddress, billingAddress, subtotal, chargeableSubtotal: subtotal, chargeableSubtotalPence: subtotalPence,
        shippingAmount, shippingAmountPence: shippingPence, shippingMethodId: shippingMethodId ?? null,
        shippingMethod: resolvedShippingMethodLabel || shippingMethod || 'Standard', total, totalPence, catalogTotal: total,
        buyerId: verifiedBuyerId, transferGroup, reservationToken, isB2B, applyReverseCharge, source: 'mobile' },
    });
    if (insertError) {
      await stripe.paymentIntents.cancel(pi.id).catch(() => undefined);
      if (reservedProductIds.length) await supabase.from('products').update({ listingStatus: 'active', reservedUntil: null, reservationToken: null }).in('id', reservedProductIds).eq('reservationToken', reservationToken);
      return { statusCode: 500, body: JSON.stringify({ error: 'Order initialisation failed. Please try again.' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ client_secret: pi.client_secret, payment_intent_id: pi.id, amount_pence: totalPence }) };
  } catch (err: unknown) {
    if (reservedProductIds.length) await supabase.from('products').update({ listingStatus: 'active', reservedUntil: null, reservationToken: null }).in('id', reservedProductIds).eq('reservationToken', reservationToken);
    console.error('create-payment-intent: PaymentIntent creation failed:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'PaymentIntent creation failed. Please try again.' }) };
  }
};
