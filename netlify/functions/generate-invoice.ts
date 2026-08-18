/**
 * generate-invoice
 *
 * Generates a printable HTML invoice for a paid marketplace order.
 * Monetary totals come from the immutable order snapshot written after Stripe
 * confirms payment; current buyer-profile VAT verification never changes the
 * tax treatment of an historical order.
 */

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALLOWED_ORIGIN = process.env.VITE_APP_URL || 'https://loadifymarket.co.uk';
const VAT_DIVISOR = 1.2;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function pence(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

function formatGBP(value: number): string {
  return `£${(value / 100).toFixed(2)}`;
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null }>();
  const isAdmin = caller?.role === 'admin';

  let body: { orderId?: string };
  try {
    body = JSON.parse(event.body || '{}') as { orderId?: string };
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!orderId || orderId.length > 100) {
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
      billingAddress,
      buyerId,
      sellerId,
      isB2B
    `)
    .eq('id', orderId)
    .maybeSingle<{
      id: string;
      orderNumber: string;
      status: string;
      createdAt: string;
      subtotal: number;
      vatAmount: number;
      shippingAmount: number;
      total: number;
      shippingAddress: Record<string, string> | null;
      billingAddress: Record<string, string> | null;
      buyerId: string | null;
      sellerId: string;
      isB2B: boolean | null;
    }>();

  if (orderError || !order) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
  }
  if (!isAdmin && order.buyerId !== user.id) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const [itemsResult, buyerResult, buyerProfileResult, sellerResult] = await Promise.all([
    supabase
      .from('order_items')
      .select('quantity, pricePerUnit, products(title)')
      .eq('orderId', order.id),
    order.buyerId
      ? supabase
          .from('users')
          .select('firstName, lastName, email')
          .eq('id', order.buyerId)
          .maybeSingle<{ firstName?: string; lastName?: string; email?: string }>()
      : Promise.resolve({ data: null, error: null }),
    order.buyerId
      ? supabase
          .from('buyer_profiles')
          .select('companyName, vatNumber')
          .eq('userId', order.buyerId)
          .maybeSingle<{ companyName?: string | null; vatNumber?: string | null }>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('seller_profiles')
      .select('businessName')
      .eq('userId', order.sellerId)
      .maybeSingle<{ businessName?: string | null }>(),
  ]);

  if (itemsResult.error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to load invoice items' }) };
  }

  const buyer = buyerResult.data;
  const buyerProfile = buyerProfileResult.data;
  const seller = sellerResult.data;

  // The payment webhook persists isB2B and vatAmount at the moment the Stripe
  // payment is fulfilled. That order snapshot is the authority for historical
  // invoices; a later buyer-profile VAT change must not rewrite old tax treatment.
  const isB2B = Boolean(order.isB2B);
  const isReverseCharge = isB2B && pence(order.vatAmount) === 0;

  const buyerName = [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ').trim() || 'Customer';
  const billToName = isB2B && buyerProfile?.companyName ? buyerProfile.companyName : buyerName;
  const billToContact = isB2B && buyerProfile?.companyName ? buyerName : null;
  const sellerName = seller?.businessName || 'Seller';
  const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase();
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const billingAddress = order.billingAddress && Object.keys(order.billingAddress).length > 0
    ? order.billingAddress
    : order.shippingAddress ?? {};
  const addressLine = [
    billingAddress.line1 ?? billingAddress.address1,
    billingAddress.line2 ?? billingAddress.address2,
    billingAddress.city,
    billingAddress.county,
    billingAddress.postal_code ?? billingAddress.postcode,
    billingAddress.country,
  ].filter(Boolean).join(', ');

  const itemRows = (itemsResult.data ?? []).map((item) => {
    const productRelation = Array.isArray(item.products) ? item.products[0] : item.products;
    const title = (productRelation as { title?: string } | null)?.title ?? 'Product';
    const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
    const catalogUnitPence = pence(item.pricePerUnit);
    const chargedUnitPence = isReverseCharge
      ? Math.round((catalogUnitPence / 100 / VAT_DIVISOR) * 100)
      : catalogUnitPence;
    const lineTotalPence = chargedUnitPence * quantity;

    return `
      <tr>
        <td>${escapeHtml(title)}</td>
        <td class="number">${quantity}</td>
        <td class="number">${formatGBP(chargedUnitPence)}</td>
        <td class="number">${formatGBP(lineTotalPence)}</td>
      </tr>`;
  }).join('');

  const subtotalPence = pence(order.subtotal);
  const vatPence = pence(order.vatAmount);
  const shippingPence = pence(order.shippingAmount);
  const totalPence = pence(order.total);
  const reconstructedTotal = subtotalPence + vatPence + shippingPence;
  if (Math.abs(reconstructedTotal - totalPence) > 1) {
    console.warn(
      `generate-invoice: order ${order.id} monetary snapshot differs by ${reconstructedTotal - totalPence}p; displaying stored order total`,
    );
  }

  const companyName = process.env.VITE_COMPANY_NAME || 'Loadify Market';
  const companyAddress = process.env.VITE_COMPANY_ADDRESS || 'United Kingdom';
  const platformVatNumber = process.env.VITE_VAT_NUMBER || '';
  const supportEmail = process.env.VITE_SUPPORT_EMAIL || 'contact@loadifymarket.co.uk';
  const unitHeading = isReverseCharge ? 'Unit Price (ex VAT)' : 'Unit Price (VAT incl.)';
  const lineHeading = isReverseCharge ? 'Line Total (ex VAT)' : 'Line Total (VAT incl.)';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(orderNumber)} — Loadify Market</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #121A2B; background: #fff; margin: 0 auto; padding: 40px; max-width: 820px; font-size: 14px; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 4px; font-size: 28px; color: #0A1930; }
    .muted { color: #6b7280; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 36px; }
    .meta { text-align: right; line-height: 1.7; font-size: 12px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 28px; }
    .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 8px; }
    .party p { line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f3f4f6; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; text-align: left; padding: 10px 12px; }
    td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
    .number { text-align: right; white-space: nowrap; }
    .totals { width: 320px; margin-left: auto; }
    .totals td { border: 0; padding: 6px 10px; }
    .totals .grand td { border-top: 2px solid #121A2B; padding-top: 10px; font-weight: 700; font-size: 15px; }
    .notice { margin: 16px 0; padding: 11px 14px; border-radius: 7px; background: #fefce8; border: 1px solid #fde68a; color: #713f12; font-size: 12px; line-height: 1.5; }
    .footer { margin-top: 44px; padding-top: 18px; border-top: 1px solid #e5e7eb; color: #9ca3af; text-align: center; font-size: 11px; line-height: 1.7; }
    .print { margin-top: 12px; background: #0A1930; color: #fff; border: 0; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
    @media print { body { padding: 20px; } .print { display: none; } @page { margin: 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Loadify Market</h1>
      <div class="muted">${escapeHtml(companyName)}</div>
      <div class="muted">${escapeHtml(companyAddress)}</div>
      ${platformVatNumber ? `<div class="muted">VAT: ${escapeHtml(platformVatNumber)}</div>` : ''}
    </div>
    <div class="meta">
      <h2>INVOICE</h2>
      <div>Order: <strong>${escapeHtml(orderNumber)}</strong></div>
      <div>Date: ${escapeHtml(orderDate)}</div>
      <div>Status: ${escapeHtml(order.status)}</div>
      <div>Seller: ${escapeHtml(sellerName)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p>
        <strong>${escapeHtml(billToName)}</strong><br />
        ${billToContact ? `${escapeHtml(billToContact)}<br />` : ''}
        ${buyer?.email ? `${escapeHtml(buyer.email)}<br />` : ''}
        ${isB2B && buyerProfile?.vatNumber ? `VAT: ${escapeHtml(buyerProfile.vatNumber)}<br />` : ''}
        ${addressLine ? escapeHtml(addressLine) : ''}
      </p>
      ${isB2B ? '<div class="muted">Business Account</div>' : ''}
    </div>
    <div class="party">
      <h3>Sold By</h3>
      <p><strong>${escapeHtml(sellerName)}</strong><br />via Loadify Market<br />${escapeHtml(supportEmail)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="number">Qty</th>
        <th class="number">${unitHeading}</th>
        <th class="number">${lineHeading}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4" class="muted">No items found</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Items subtotal (ex VAT)</td><td class="number">${formatGBP(subtotalPence)}</td></tr>
      ${isReverseCharge
        ? '<tr><td>VAT — Reverse Charge</td><td class="number">£0.00</td></tr>'
        : `<tr><td>VAT (20%)</td><td class="number">${formatGBP(vatPence)}</td></tr>`}
      <tr><td>Shipping</td><td class="number">${formatGBP(shippingPence)}</td></tr>
      <tr class="grand"><td>Total paid</td><td class="number">${formatGBP(totalPence)}</td></tr>
    </table>
  </div>

  ${isReverseCharge ? `
    <div class="notice">
      <strong>VAT Reverse Charge:</strong> This order was completed as a VAT-verified business reverse-charge purchase. The seller did not charge VAT on the item prices; the customer is responsible for accounting for VAT where applicable.
    </div>` : ''}

  <div class="footer">
    <div>This invoice was generated by Loadify Market · ${escapeHtml(supportEmail)}</div>
    <div>For queries, quote order number <strong>${escapeHtml(orderNumber)}</strong>.</div>
    ${platformVatNumber ? `<div>VAT Registration Number: ${escapeHtml(platformVatNumber)}</div>` : ''}
    <button class="print" onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="invoice-${orderNumber}.html"`,
      'Cache-Control': 'no-store',
    },
    body: html,
  };
};
