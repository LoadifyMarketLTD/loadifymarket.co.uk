import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveCapability } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const TERMINAL_BLOCKED = new Set(['cancelled', 'refunded']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrderRow = {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string | null;
  status: string;
  marketCode: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function withinWithdrawalWindow(order: OrderRow, now = new Date()): boolean {
  if (order.marketCode !== 'RO' || TERMINAL_BLOCKED.has(order.status)) return false;

  // Before delivery, the consumer may already communicate withdrawal from the
  // distance contract. After delivery, keep the online function available for
  // 14 calendar days from physical delivery.
  if (!order.deliveredAt) {
    return ['paid', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'completed', 'processing'].includes(order.status);
  }

  const deliveredAt = new Date(order.deliveredAt);
  if (Number.isNaN(deliveredAt.getTime())) return false;
  const deadline = new Date(deliveredAt.getTime() + 14 * 24 * 60 * 60 * 1000);
  return now.getTime() <= deadline.getTime();
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendWithdrawalConfirmation(args: {
  to: string;
  consumerName: string;
  orderNumber: string;
  submittedAt: string;
  statement: string;
}): Promise<{ ok: true; id: string } | { ok: false }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('request-order-withdrawal: RESEND_API_KEY is not set');
    return { ok: false };
  }

  const from = (process.env.RESEND_FROM_EMAIL || 'contact@loadifymarket.co.uk').trim();
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1f2937">
      <h1 style="color:#0A234F">Confirmare retragere din contract</h1>
      <p>Bună ${escapeHtml(args.consumerName)},</p>
      <p>Am primit declarația dvs. online de retragere pentru comanda <strong>${escapeHtml(args.orderNumber)}</strong>.</p>
      <div style="background:#f4f6f8;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Declarație:</strong> ${escapeHtml(args.statement)}</p>
        <p style="margin:0"><strong>Data și ora transmiterii:</strong> ${escapeHtml(args.submittedAt)}</p>
      </div>
      <p>Această confirmare dovedește primirea declarației de retragere. Procesarea rambursării și a returului, acolo unde sunt aplicabile, urmează fluxurile separate ale comenzii și drepturile legale aplicabile.</p>
      <p>Păstrați acest e-mail pentru evidența dvs.</p>
      <p style="margin-top:24px">Loadify Market / XDrive Logistics Ltd<br>contact@loadifymarket.co.uk</p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [args.to],
      from,
      reply_to: from,
      subject: `Confirmare retragere - comanda ${args.orderNumber}`,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('request-order-withdrawal: Resend failed:', response.status, body.slice(0, 500));
    return { ok: false };
  }

  const payload = await response.json().catch(() => ({})) as { id?: string };
  return payload.id ? { ok: true, id: payload.id } : { ok: false };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveCapability(event, admin, 'buyer');
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);
  if (!auth.actor.email) return jsonResponse(409, { error: 'A verified account email is required for withdrawal confirmation' }, METHODS);

  let body: { orderId?: unknown; consumerName?: unknown; confirmationEmail?: unknown; confirm?: unknown };
  try { body = JSON.parse(event.body || '{}') as typeof body; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const consumerName = typeof body.consumerName === 'string' ? body.consumerName.trim() : '';
  const confirmationEmail = normalizeEmail(body.confirmationEmail);
  const confirmed = body.confirm === true;

  if (!orderId || consumerName.length < 2 || consumerName.length > 200) {
    return jsonResponse(400, { error: 'Order and consumer name are required' }, METHODS);
  }
  if (!EMAIL_RE.test(confirmationEmail) || confirmationEmail !== auth.actor.email) {
    return jsonResponse(400, { error: 'Confirmation email must match the authenticated buyer account' }, METHODS);
  }
  if (!confirmed) {
    return jsonResponse(400, { error: 'Explicit withdrawal confirmation is required' }, METHODS);
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, orderNumber, buyerId, sellerId, status, marketCode, createdAt, deliveredAt')
    .eq('id', orderId)
    .eq('buyerId', auth.actor.id)
    .maybeSingle<OrderRow>();

  if (orderError || !order) return jsonResponse(404, { error: 'Order not found' }, METHODS);
  if (order.marketCode !== 'RO') {
    return jsonResponse(409, { error: 'The statutory online withdrawal function is currently enabled for Romania-market orders only' }, METHODS);
  }
  if (!withinWithdrawalWindow(order)) {
    return jsonResponse(409, { error: 'This order is outside the online withdrawal window' }, METHODS);
  }

  const { data: existing, error: existingError } = await admin
    .from('order_withdrawal_requests')
    .select('id, status, submittedAt, confirmationSentAt')
    .eq('orderId', order.id)
    .maybeSingle();

  if (existingError) return jsonResponse(500, { error: 'Withdrawal request could not be checked' }, METHODS);
  if (existing) {
    return jsonResponse(200, { success: true, alreadySubmitted: true, request: existing }, METHODS);
  }

  const submittedAt = new Date().toISOString();
  const statement = 'Mă retrag din acest contract la distanță.';
  const { data: created, error: createError } = await admin
    .from('order_withdrawal_requests')
    .insert({
      orderId: order.id,
      buyerId: auth.actor.id,
      sellerId: order.sellerId,
      marketCode: 'RO',
      consumerName,
      confirmationEmail,
      statement,
      status: 'received',
      submittedAt,
    })
    .select('id, status, submittedAt, confirmationSentAt')
    .single();

  if (createError || !created) {
    if (createError?.code === '23505') {
      return jsonResponse(409, { error: 'A withdrawal declaration already exists for this order' }, METHODS);
    }
    console.error('request-order-withdrawal: insert failed:', createError?.message);
    return jsonResponse(500, { error: 'Withdrawal declaration could not be recorded' }, METHODS);
  }

  const email = await sendWithdrawalConfirmation({
    to: confirmationEmail,
    consumerName,
    orderNumber: order.orderNumber,
    submittedAt,
    statement,
  });

  if (!email.ok) {
    // Fail closed: the declaration remains recorded, but the API explicitly
    // reports that durable-medium confirmation still requires operational retry.
    return jsonResponse(503, {
      success: false,
      declarationRecorded: true,
      request: created,
      error: 'Withdrawal was recorded but email confirmation could not be sent. Support has been notified for retry.',
    }, METHODS);
  }

  const confirmedAt = new Date().toISOString();
  await admin
    .from('order_withdrawal_requests')
    .update({ confirmationSentAt: confirmedAt, confirmationProviderId: email.id, updatedAt: confirmedAt })
    .eq('id', created.id);

  if (order.sellerId) {
    await admin.from('notifications').insert({
      userId: order.sellerId,
      type: 'order',
      title: 'Withdrawal declaration received',
      message: `The buyer submitted an online withdrawal declaration for order ${order.orderNumber}. Do not treat this as an automatic refund; follow the governed return/refund workflow.`,
      isRead: false,
      link: `/orders?mode=sell&orderId=${encodeURIComponent(order.id)}`,
    }).catch((error: unknown) => console.warn('request-order-withdrawal: seller notification failed:', error));
  }

  return jsonResponse(201, {
    success: true,
    request: { ...created, confirmationSentAt: confirmedAt },
    message: 'Declarația de retragere a fost primită. Confirmarea a fost trimisă prin e-mail.',
  }, METHODS);
};

export { withinWithdrawalWindow };
