/**
 * generate-invoice
 *
 * Generates a printable HTML invoice for a given order and streams it
 * back to the buyer's browser.
 *
 * Security:
 *   – Requires a valid JWT.
 *   – The authenticated user must be the order's buyer OR an admin.
 *   – Service-role data access is protected by the ownership check below.
 *
 * Commercial-history rule:
 *   – Post-cutover orders with commercialSnapshotSource MUST render checkout-time
 *     buyer/seller/product identity from immutable snapshots.
 *   – Only legacy rows with no authoritative snapshot may use today's profile /
 *     product values as a display-only fallback. No fallback is ever persisted.
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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server configuration error: VITE_SUPABASE_ANON_KEY not set' }),
    };
  }

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: callerRow } = await supabase
    .from('users')
    .select('role, firstName, lastName')
    .eq('id', user.id)
    .single<{ role: string; firstName?: string; lastName?: string }>();
  const isAdmin = callerRow?.role === 'admin';

  let body: { orderId?: string };
  try {
    body = JSON.parse(event.body || '{}') as { orderId?: string };
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { orderId } = body;
  if (!orderId || typeof orderId !== 'string' || orderId.length > 100) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'orderId is required' }) };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      orderNumber,
      status,
      createdAt,
      subtotal,
      vatAmount,
      shippingAmount,
      total,
      shippingAddress,
      buyerId,
      sellerId,
      buyerNameSnapshot,
      buyerEmailSnapshot,
      buyerCompanyNameSnapshot,
      buyerVatNumberSnapshot,
      sellerBusinessNameSnapshot,
      isB2BSnapshot,
      reverseChargeSnapshot,
      commercialSnapshotSource,
      products ( title, images )
    `)
    .eq('id', orderId)
    .single<{
      id: string;
      orderNumber: string;
      status: string;
      createdAt: string;
      subtotal: number;
      vatAmount: number;
      shippingAmount: number;
      total: number;
      shippingAddress: Record<string, string>;
      buyerId: string | null;
      sellerId: string;
      buyerNameSnapshot: string | null;
      buyerEmailSnapshot: string | null;
      buyerCompanyNameSnapshot: string | null;
      buyerVatNumberSnapshot: string | null;
      sellerBusinessNameSnapshot: string | null;
      isB2BSnapshot: boolean | null;
      reverseChargeSnapshot: boolean | null;
      commercialSnapshotSource: string | null;
      products: { title?: string; images?: string[] } | null;
    }>();

  if (orderError || !order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }

  if (!isAdmin && order.buyerId !== user.id) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const { data: items, error: itemError } = await supabase
    .from('order_items')
    .select('quantity, pricePerUnit, subtotal, productTitleSnapshot, productSnapshotSource, products ( title )')
    .eq('orderId', orderId);
  if (itemError) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Unable to load invoice items' }) };
  }

  const hasCommercialSnapshot = Boolean(order.commercialSnapshotSource);

  let buyerRow: { firstName?: string; lastName?: string; email?: string } | null = null;
  let buyerProfileRow: {
    accountType?: string | null;
    companyName?: string | null;
    vatNumber?: string | null;
    isVatVerified?: boolean | null;
  } | null = null;
  let sellerRow: { businessName?: string } | null = null;

  // Never consult mutable identity for a post-cutover order. Current-state
  // lookups are strictly a legacy display fallback for rows where the snapshot
  // source itself is absent.
  if (!hasCommercialSnapshot) {
    buyerRow = order.buyerId
      ? (await supabase
          .from('users')
          .select('firstName, lastName, email')
          .eq('id', order.buyerId)
          .single<{ firstName?: string; lastName?: string; email?: string }>()
        ).data
      : null;

    buyerProfileRow = order.buyerId
      ? (await supabase
          .from('buyer_profiles')
          .select('accountType, companyName, vatNumber, isVatVerified')
          .eq('userId', order.buyerId)
          .maybeSingle<{
            accountType?: string | null;
            companyName?: string | null;
            vatNumber?: string | null;
            isVatVerified?: boolean | null;
          }>()
        ).data
      : null;

    sellerRow = (await supabase
      .from('seller_profiles')
      .select('businessName')
      .eq('userId', order.sellerId)
      .single<{ businessName?: string }>()).data;
  }

  const legacyBuyerName = [buyerRow?.firstName, buyerRow?.lastName].filter(Boolean).join(' ') || 'Customer';
  const buyerName = hasCommercialSnapshot
    ? order.buyerNameSnapshot || 'Customer'
    : legacyBuyerName;
  const buyerEmail = hasCommercialSnapshot
    ? order.buyerEmailSnapshot || ''
    : buyerRow?.email || '';
  const sellerName = hasCommercialSnapshot
    ? order.sellerBusinessNameSnapshot || 'Seller'
    : sellerRow?.businessName || 'Seller';
  const isB2B = hasCommercialSnapshot
    ? order.isB2BSnapshot === true
    : Boolean(buyerProfileRow?.accountType) && buyerProfileRow?.accountType !== 'individual';
  const isReverseCharge = hasCommercialSnapshot
    ? order.reverseChargeSnapshot === true
    : isB2B && Boolean(buyerProfileRow?.isVatVerified);
  const buyerCompanyName = hasCommercialSnapshot
    ? order.buyerCompanyNameSnapshot
    : buyerProfileRow?.companyName ?? null;
  const buyerVatNumber = hasCommercialSnapshot
    ? order.buyerVatNumberSnapshot
    : buyerProfileRow?.vatNumber ?? null;

  const addr = order.shippingAddress ?? {};
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const orderNum = order.orderNumber || order.id.slice(0, 8).toUpperCase();

  const billToName = isB2B && buyerCompanyName ? buyerCompanyName : buyerName;
  const billToContact = isB2B && buyerCompanyName ? buyerName : null;
  const formatGBP = (v: number) => `£${(v ?? 0).toFixed(2)}`;

  const itemRows = (items ?? [])
    .map((item) => {
      const productObj = Array.isArray(item.products) ? item.products[0] : item.products;
      const liveTitle = (productObj as { title?: string } | null)?.title ?? 'Product';
      const title = item.productSnapshotSource
        ? item.productTitleSnapshot || 'Product'
        : liveTitle;
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(title)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatGBP(item.pricePerUnit)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatGBP(item.subtotal)}</td>
        </tr>`;
    })
    .join('');

  const addrLine = [addr.address1, addr.address2, addr.city, addr.county, addr.postcode, addr.country]
    .filter(Boolean)
    .join(', ');

  const vatNumber = process.env.VITE_VAT_NUMBER || '';
  const companyName = process.env.VITE_COMPANY_NAME || 'Loadify Market';
  const companyAddress = process.env.VITE_COMPANY_ADDRESS || 'United Kingdom';
  const supportEmail = process.env.VITE_SUPPORT_EMAIL || 'contact@loadifymarket.co.uk';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(orderNum)} — Loadify Market</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #121A2B; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 14px; }
    h1 { font-size: 28px; font-weight: 700; color: #0A1930; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { color: #0A1930; }
    .brand span { display: block; font-size: 11px; color: #6b7280; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 20px; font-weight: 600; color: #121A2B; margin-bottom: 6px; }
    .invoice-meta p { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
    .party h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 8px; }
    .party p { font-size: 13px; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    thead th:not(:first-child) { text-align: right; }
    .totals { margin-left: auto; width: 280px; }
    .totals table { margin-bottom: 0; }
    .totals td { padding: 6px 12px; font-size: 13px; }
    .totals td:last-child { text-align: right; }
    .totals .grand-total td { font-weight: 700; font-size: 15px; border-top: 2px solid #121A2B; padding-top: 10px; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.8; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; background: #dcfce7; color: #166534; }
    @media print { body { padding: 20px; } @page { margin: 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>Loadify Market</h1>
      <span>${escapeHtml(companyName)}</span>
      <span>${escapeHtml(companyAddress)}</span>
      ${vatNumber ? `<span>VAT: ${escapeHtml(vatNumber)}</span>` : ''}
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>
        Order: <strong>${escapeHtml(orderNum)}</strong><br />
        Date: ${escapeHtml(orderDate)}<br />
        Status: <span class="status-badge">${escapeHtml(order.status)}</span><br />
        Seller: ${escapeHtml(sellerName)}
      </p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p>
        <strong>${escapeHtml(billToName)}</strong><br />
        ${billToContact ? `${escapeHtml(billToContact)}<br />` : ''}
        ${buyerEmail ? `${escapeHtml(buyerEmail)}<br />` : ''}
        ${isB2B && buyerVatNumber ? `VAT: ${escapeHtml(buyerVatNumber)}<br />` : ''}
        ${addrLine ? escapeHtml(addrLine) : ''}
      </p>
      ${isB2B ? `<p style="margin-top:6px;font-size:11px;color:#374151;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Business Account</p>` : ''}
    </div>
    <div class="party">
      <h3>Sold By</h3>
      <p>
        <strong>${escapeHtml(sellerName)}</strong><br />
        via Loadify Market<br />
        ${escapeHtml(supportEmail)}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="4" style="padding:12px;color:#6b7280;">No items found</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal (ex VAT)</td><td>${formatGBP(order.subtotal)}</td></tr>
      ${isReverseCharge
        ? `<tr><td>VAT — Reverse Charge (Customer Accounts for VAT)</td><td>${formatGBP(0)}</td></tr>`
        : `<tr><td>VAT (20%)</td><td>${formatGBP(order.vatAmount)}</td></tr>`
      }
      <tr><td>Shipping</td><td>${formatGBP(order.shippingAmount)}</td></tr>
      <tr class="grand-total"><td>Total</td><td>${formatGBP(order.total)}</td></tr>
    </table>
  </div>

  ${isReverseCharge ? `
  <div style="margin:12px 0;padding:10px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#713f12;">
    <strong>VAT Reverse Charge:</strong> As a VAT-registered business customer, you are liable to account for VAT on this supply under the reverse charge mechanism. The seller has not charged VAT.
  </div>` : ''}

  <div class="footer">
    <p>This invoice was generated by Loadify Market · ${escapeHtml(supportEmail)}</p>
    <p>For queries about this order, please contact us quoting order number <strong>${escapeHtml(orderNum)}</strong>.</p>
    ${vatNumber ? `<p>VAT Registration Number: ${escapeHtml(vatNumber)}</p>` : ''}
    <p style="margin-top:12px;"><button onclick="window.print()" style="background:#0A1930;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;">🖨 Print / Save as PDF</button></p>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="invoice-${orderNum}.html"`,
      'Cache-Control': 'no-store',
    },
    body: html,
  };
};

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
