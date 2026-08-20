/**
 * generate-invoice
 *
 * Authenticated buyer/admin printable order document.
 * Post-cutover commerce renders immutable checkout-time commercial + tax
 * snapshots only. Legacy rows may use current identity as a display fallback,
 * but legacy tax treatment is never re-derived from today's buyer VAT profile.
 */
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

type TaxSnapshot = {
  version?: number;
  jurisdiction?: string;
  destinationCountry?: string;
  treatment?: string;
  sellerVatRegistered?: boolean;
  sellerVatNumber?: string | null;
  reverseCharge?: boolean;
  vatAmountPence?: number;
  evidenceSource?: string;
  evidenceVersion?: number;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!supabaseUrl || !supabaseServiceRoleKey) return json(500, { error: 'Server configuration error' });

  const token = (event.headers['authorization'] || event.headers['Authorization'])?.replace(/^Bearer\s+/i, '').trim();
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!token) return json(401, { error: 'Unauthorized' });
  if (!anonKey) return json(500, { error: 'Server configuration error' });

  const anon = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await anon.auth.getUser(token);
  if (authError || !user) return json(401, { error: 'Invalid or expired token' });

  let body: { orderId?: string };
  try { body = JSON.parse(event.body || '{}') as { orderId?: string }; }
  catch { return json(400, { error: 'Invalid JSON' }); }
  if (!body.orderId || typeof body.orderId !== 'string' || body.orderId.length > 100) {
    return json(400, { error: 'orderId is required' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle<{ role: string | null }>();
  const isAdmin = caller?.role === 'admin';

  const { data: order, error: orderError } = await supabase.from('orders').select(`
    id, orderNumber, status, createdAt, subtotal, vatAmount, shippingAmount, total,
    shippingAddress, buyerId, sellerId,
    buyerNameSnapshot, buyerEmailSnapshot, buyerCompanyNameSnapshot, buyerVatNumberSnapshot,
    sellerBusinessNameSnapshot, isB2BSnapshot, reverseChargeSnapshot, commercialSnapshotSource,
    taxDecisionSnapshot, taxDecisionSource, taxDecisionCapturedAt
  `).eq('id', body.orderId).single<{
    id: string; orderNumber: string; status: string; createdAt: string;
    subtotal: number; vatAmount: number; shippingAmount: number; total: number;
    shippingAddress: Record<string, string>; buyerId: string | null; sellerId: string;
    buyerNameSnapshot: string | null; buyerEmailSnapshot: string | null;
    buyerCompanyNameSnapshot: string | null; buyerVatNumberSnapshot: string | null;
    sellerBusinessNameSnapshot: string | null; isB2BSnapshot: boolean | null;
    reverseChargeSnapshot: boolean | null; commercialSnapshotSource: string | null;
    taxDecisionSnapshot: TaxSnapshot | null; taxDecisionSource: string | null; taxDecisionCapturedAt: string | null;
  }>();
  if (orderError || !order) return json(404, { error: 'Order not found' });
  if (!isAdmin && order.buyerId !== user.id) return json(403, { error: 'Forbidden' });

  const { data: items, error: itemError } = await supabase.from('order_items').select(`
    quantity, pricePerUnit, vatRate, subtotal,
    productTitleSnapshot, productSnapshotSource,
    taxTreatmentSnapshot, taxTreatmentSource,
    products ( title )
  `).eq('orderId', order.id);
  if (itemError) return json(500, { error: 'Unable to load invoice items' });

  const hasCommercialSnapshot = Boolean(order.commercialSnapshotSource);
  const hasTaxSnapshot = order.taxDecisionSource === 'checkout_verified_tax_v1' && Boolean(order.taxDecisionSnapshot);

  let buyerRow: { firstName?: string | null; lastName?: string | null; email?: string | null } | null = null;
  let sellerRow: { businessName?: string | null } | null = null;
  if (!hasCommercialSnapshot) {
    buyerRow = order.buyerId ? (await supabase.from('users').select('firstName, lastName, email').eq('id', order.buyerId).maybeSingle()).data : null;
    sellerRow = (await supabase.from('seller_profiles').select('businessName').eq('userId', order.sellerId).maybeSingle()).data;
  }

  const legacyBuyerName = [buyerRow?.firstName, buyerRow?.lastName].filter(Boolean).join(' ') || 'Customer';
  const buyerName = hasCommercialSnapshot ? order.buyerNameSnapshot || 'Customer' : legacyBuyerName;
  const buyerEmail = hasCommercialSnapshot ? order.buyerEmailSnapshot || '' : buyerRow?.email || '';
  const sellerName = hasCommercialSnapshot ? order.sellerBusinessNameSnapshot || 'Seller' : sellerRow?.businessName || 'Seller';
  const buyerCompany = hasCommercialSnapshot ? order.buyerCompanyNameSnapshot : null;
  const buyerVat = hasCommercialSnapshot ? order.buyerVatNumberSnapshot : null;
  const isB2B = hasCommercialSnapshot ? order.isB2BSnapshot === true : false;
  const reverseCharge = hasTaxSnapshot ? order.taxDecisionSnapshot?.reverseCharge === true : false;
  const treatment = hasTaxSnapshot ? order.taxDecisionSnapshot?.treatment ?? null : null;

  // Post-cutover tax evidence must be internally coherent. Never render a tax
  // conclusion from a partial snapshot.
  if (order.taxDecisionSource && !hasTaxSnapshot) {
    return json(409, { error: 'This order has incomplete immutable tax evidence. Please contact support.' });
  }
  if (hasTaxSnapshot && (
    order.taxDecisionSnapshot?.version !== 1 ||
    order.taxDecisionSnapshot?.jurisdiction !== 'GB' ||
    order.taxDecisionSnapshot?.destinationCountry !== 'GB' ||
    order.taxDecisionSnapshot?.treatment !== 'seller_non_vat_declared' ||
    order.taxDecisionSnapshot?.sellerVatRegistered !== false ||
    order.taxDecisionSnapshot?.reverseCharge !== false ||
    order.taxDecisionSnapshot?.vatAmountPence !== 0 ||
    Number(order.vatAmount) !== 0
  )) {
    return json(409, { error: 'This order tax evidence conflicts with the stored financial totals. Please contact support.' });
  }

  const addr = order.shippingAddress ?? {};
  const address = [addr.address1, addr.address2, addr.city, addr.county, addr.postcode, addr.country].filter(Boolean).join(', ');
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const orderNum = order.orderNumber || order.id.slice(0, 8).toUpperCase();
  const billToName = isB2B && buyerCompany ? buyerCompany : buyerName;
  const billToContact = isB2B && buyerCompany ? buyerName : null;
  const money = (v: number) => `£${Number(v ?? 0).toFixed(2)}`;

  const itemRows = (items ?? []).map((item) => {
    const productObj = Array.isArray(item.products) ? item.products[0] : item.products;
    const liveTitle = (productObj as { title?: string } | null)?.title ?? 'Product';
    const title = item.productSnapshotSource ? item.productTitleSnapshot || 'Product' : liveTitle;
    const lineTax = item.taxTreatmentSource === 'checkout_verified_tax_v1' ? item.taxTreatmentSnapshot as Record<string, unknown> | null : null;
    if (hasTaxSnapshot && (!lineTax || lineTax.treatment !== 'seller_non_vat_declared' || Number(lineTax.vatRate) !== 0 || Number(item.vatRate) !== 0)) {
      throw new Error('Order item tax evidence conflicts with the order tax snapshot');
    }
    return `<tr><td>${escapeHtml(title)}</td><td class="num">${item.quantity}</td><td class="num">${money(item.pricePerUnit)}</td><td class="num">${money(item.subtotal)}</td></tr>`;
  }).join('');

  const taxRow = hasTaxSnapshot && treatment === 'seller_non_vat_declared'
    ? `<tr><td>VAT — not charged by seller</td><td>${money(0)}</td></tr>`
    : reverseCharge
      ? `<tr><td>VAT — reverse charge</td><td>${money(0)}</td></tr>`
      : `<tr><td>VAT (stored order amount)</td><td>${money(order.vatAmount)}</td></tr>`;

  const companyName = process.env.VITE_COMPANY_NAME || 'Loadify Market';
  const companyAddress = process.env.VITE_COMPANY_ADDRESS || 'United Kingdom';
  const supportEmail = process.env.VITE_SUPPORT_EMAIL || 'contact@loadifymarket.co.uk';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Order ${escapeHtml(orderNum)} — Loadify Market</title><style>
  *{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;color:#121A2B;background:#fff;padding:40px;max-width:820px;margin:auto;font-size:14px}
  h1{font-size:28px;margin:0;color:#0A1930}.muted{color:#6b7280;font-size:12px}.header,.parties{display:grid;grid-template-columns:1fr 1fr;gap:36px}.header{margin-bottom:36px}.right{text-align:right}.parties{margin-bottom:28px}
  h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:0 0 8px}p{line-height:1.65;margin:0}table{width:100%;border-collapse:collapse;margin:0 0 22px}th{background:#f3f4f6;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;padding:10px 12px}td{padding:9px 12px;border-bottom:1px solid #e5e7eb}.num{text-align:right}.totals{width:310px;margin-left:auto}.totals td:last-child{text-align:right}.grand td{font-weight:700;border-top:2px solid #121A2B}.notice{margin-top:16px;padding:12px 14px;border:1px solid #dbe3ee;border-radius:8px;background:#f8fafc;font-size:12px}.footer{margin-top:42px;padding-top:18px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:11px}@media(max-width:640px){body{padding:20px}.header,.parties{grid-template-columns:1fr}.right{text-align:left}.totals{width:100%}}@media print{body{padding:15px}@page{margin:12mm}}
  </style></head><body>
  <div class="header"><div><h1>Loadify Market</h1><p class="muted">${escapeHtml(companyName)}<br>${escapeHtml(companyAddress)}</p></div><div class="right"><strong>ORDER DOCUMENT</strong><p class="muted">Order: ${escapeHtml(orderNum)}<br>Date: ${escapeHtml(orderDate)}<br>Status: ${escapeHtml(order.status)}</p></div></div>
  <div class="parties"><div><h3>Bill to</h3><p><strong>${escapeHtml(billToName)}</strong><br>${billToContact ? `${escapeHtml(billToContact)}<br>` : ''}${buyerEmail ? `${escapeHtml(buyerEmail)}<br>` : ''}${isB2B && buyerVat ? `Buyer VAT: ${escapeHtml(buyerVat)}<br>` : ''}${escapeHtml(address)}</p></div><div><h3>Sold by</h3><p><strong>${escapeHtml(sellerName)}</strong><br>Marketplace transaction via Loadify Market<br>${escapeHtml(supportEmail)}</p></div></div>
  <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Subtotal</th></tr></thead><tbody>${itemRows || '<tr><td colspan="4">No items found</td></tr>'}</tbody></table>
  <div class="totals"><table><tr><td>Subtotal</td><td>${money(order.subtotal)}</td></tr>${taxRow}<tr><td>Shipping</td><td>${money(order.shippingAmount)}</td></tr><tr class="grand"><td>Total</td><td>${money(order.total)}</td></tr></table></div>
  ${hasTaxSnapshot && treatment === 'seller_non_vat_declared' ? '<div class="notice"><strong>Tax treatment:</strong> The seller is recorded for this transaction as not VAT registered. VAT was not charged. This conclusion comes from the immutable checkout-time tax evidence stored for the order.</div>' : ''}
  <div class="footer">This document records a Loadify Market order and its stored transaction evidence. For queries quote order <strong>${escapeHtml(orderNum)}</strong>.<br><button onclick="window.print()">Print / Save as PDF</button></div>
  </body></html>`;

  return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="order-${orderNum}.html"`, 'Cache-Control': 'no-store' }, body: html };
};

function json(statusCode: number, body: unknown) {
  return { statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
function escapeHtml(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
