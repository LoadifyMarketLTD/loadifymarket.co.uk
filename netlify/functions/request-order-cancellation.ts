import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveCapability } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const REASONS = new Set(['accidental_purchase', 'duplicate_order', 'wrong_delivery_details', 'other']);

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveCapability(event, admin, 'buyer');
  if (!auth.ok) return jsonResponse(auth.status, { error: auth.status === 401 ? 'Unauthorized' : 'Buyer access required' }, METHODS);

  let body: { orderId?: unknown; reason?: unknown; details?: unknown };
  try { body = JSON.parse(event.body || '{}') as typeof body; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const details = typeof body.details === 'string' ? body.details.trim() : '';
  if (!orderId || !REASONS.has(reason)) return jsonResponse(400, { error: 'A valid orderId and cancellation reason are required' }, METHODS);
  if (details.length > 1000) return jsonResponse(400, { error: 'Cancellation details must not exceed 1000 characters' }, METHODS);

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, orderNumber, buyerId, sellerId, status')
    .eq('id', orderId)
    .eq('buyerId', auth.actor.id)
    .maybeSingle<{ id: string; orderNumber: string; buyerId: string; sellerId: string | null; status: string }>();
  if (orderError || !order) return jsonResponse(404, { error: 'Order not found' }, METHODS);
  if (!order.sellerId) return jsonResponse(409, { error: 'Seller information is unavailable. Please contact support.' }, METHODS);
  if (order.status !== 'paid') {
    return jsonResponse(409, { error: 'Cancellation can only be requested after payment and before the seller packs the order.' }, METHODS);
  }

  const { data: existing, error: existingError } = await admin
    .from('order_cancellation_requests')
    .select('id, status, reason, details, createdAt')
    .eq('orderId', order.id)
    .eq('status', 'requested')
    .maybeSingle();
  if (existingError) return jsonResponse(500, { error: 'Cancellation request could not be checked' }, METHODS);
  if (existing) return jsonResponse(200, { success: true, alreadyRequested: true, request: existing }, METHODS);

  const { data: created, error: createError } = await admin
    .from('order_cancellation_requests')
    .insert({ orderId: order.id, buyerId: auth.actor.id, sellerId: order.sellerId, reason, details: details || null })
    .select('id, status, reason, details, createdAt')
    .single();
  if (createError) {
    if (createError.code === '23505') return jsonResponse(409, { error: 'A cancellation request is already open for this order.' }, METHODS);
    return jsonResponse(500, { error: 'Cancellation request could not be created' }, METHODS);
  }

  await admin.from('notifications').insert({
    userId: order.sellerId,
    type: 'order',
    title: 'Cancellation requested',
    message: `The buyer requested cancellation of order ${order.orderNumber}. Do not dispatch it while the request is reviewed.`,
    isRead: false,
    link: `/orders?mode=sell&orderId=${encodeURIComponent(order.id)}`,
  }).catch((error: unknown) => console.warn('request-order-cancellation: seller notification failed:', error));

  return jsonResponse(201, {
    success: true,
    request: created,
    message: 'Cancellation requested. The order is not cancelled until the refund is confirmed through Stripe.',
  }, METHODS);
};
