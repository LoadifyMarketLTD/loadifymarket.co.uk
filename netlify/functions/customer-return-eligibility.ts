import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { evaluateCustomerReturnAutomation } from './_shared/customerReturnAutomation';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

interface RequestBody {
  orderId?: string;
  orderItemId?: string;
  quantity?: number;
  reasonCode?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const orderItemId = typeof body.orderItemId === 'string' ? body.orderItemId.trim() : '';
  const reasonCode = typeof body.reasonCode === 'string' ? body.reasonCode.trim() : '';
  const quantity = typeof body.quantity === 'number' ? body.quantity : Number.NaN;
  if (!orderId || !orderItemId || !Number.isSafeInteger(quantity) || quantity <= 0 || !reasonCode) {
    return jsonResponse(400, { error: 'orderId, orderItemId, positive integer quantity and reasonCode are required' }, METHODS);
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, status, buyerId')
    .eq('id', orderId)
    .eq('buyerId', auth.actor.id)
    .maybeSingle<{ id: string; status: string; buyerId: string }>();
  if (orderError || !order) return jsonResponse(404, { error: 'Order not found' }, METHODS);

  const { data: item, error: itemError } = await admin
    .from('order_items')
    .select('id, quantity')
    .eq('id', orderItemId)
    .eq('orderId', order.id)
    .maybeSingle<{ id: string; quantity: number }>();
  if (itemError || !item) return jsonResponse(404, { error: 'Order item not found' }, METHODS);

  const { data: shipment } = await admin
    .from('shipments')
    .select('status, updated_at')
    .eq('order_id', order.id)
    .maybeSingle<{ status: string; updated_at: string }>();

  const delivered = shipment?.status?.trim().toLowerCase() === 'delivered';
  const result = evaluateCustomerReturnAutomation({
    orderStatus: order.status,
    deliveredAt: delivered ? shipment?.updated_at : null,
    purchasedQuantity: item.quantity,
    requestedQuantity: quantity,
    reasonCode,
    // Provider-side return/label execution remains capability-gated. The
    // current Avasam pilot and BigBuy scaffold do not verify these capabilities.
    supplierReturnCapability: false,
    carrierLabelCapability: false,
  });

  return jsonResponse(200, {
    ok: true,
    orderId: order.id,
    orderItemId: item.id,
    result,
  }, METHODS);
};
