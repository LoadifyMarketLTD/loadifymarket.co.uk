import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { buildCustomerOrderSupportAnswer, type CustomerOrderSupportEvent } from './_shared/customerOrderSupport';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

interface RequestBody {
  orderId?: string;
  orderNumber?: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}') as RequestBody; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : '';
  if (!orderId && !orderNumber) return jsonResponse(400, { error: 'orderId or orderNumber is required' }, METHODS);

  let query = admin
    .from('orders')
    .select('id, orderNumber, status, createdAt, buyerId')
    .eq('buyerId', auth.actor.id);
  query = orderId ? query.eq('id', orderId) : query.eq('orderNumber', orderNumber);
  const { data: order, error: orderError } = await query.maybeSingle<{
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    buyerId: string;
  }>();
  if (orderError || !order) return jsonResponse(404, { error: 'Order not found' }, METHODS);

  const { data: shipment } = await admin
    .from('shipments')
    .select('id, status, courier_name, tracking_number, created_at, updated_at')
    .eq('order_id', order.id)
    .maybeSingle<{
      id: string;
      status: string;
      courier_name: string | null;
      tracking_number: string | null;
      created_at: string;
      updated_at: string;
    }>();

  let events: CustomerOrderSupportEvent[] = [];
  if (shipment) {
    const { data: eventRows } = await admin
      .from('shipment_events')
      .select('status, created_at, occurred_at, description, location')
      .eq('shipment_id', shipment.id)
      .order('created_at', { ascending: true });
    events = (eventRows ?? []) as CustomerOrderSupportEvent[];
  }

  const answer = buildCustomerOrderSupportAnswer({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
    },
    shipment: shipment ? {
      status: shipment.status,
      courierName: shipment.courier_name,
      trackingNumber: shipment.tracking_number,
      createdAt: shipment.created_at,
      updatedAt: shipment.updated_at,
    } : null,
    events,
  });

  return jsonResponse(200, {
    ok: true,
    grounded: true,
    orderId: order.id,
    result: answer,
  }, METHODS);
};
