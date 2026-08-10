import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POD_BUCKET = process.env.SUPABASE_BUCKET_NAME || 'proof-of-delivery';
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

export const handler: Handler = async (event) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = getClientIp(event);
  if (!ip) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unable to validate request origin' }) };
  }

  const rl = await checkRateLimit({
    supabase,
    tableName: 'track_shipment_rate_limits',
    identifier: ip,
    windowMinutes: 15,
    maxAttempts: 20,
    policy: 'fail-closed',
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };
  }

  const genericLookupFailure = {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ error: 'Order not found for the provided details' }),
  };

  try {
    let body: { orderNumber?: string; order_id?: string; email?: string };
    try {
      body = JSON.parse(event.body || '{}') as { orderNumber?: string; order_id?: string; email?: string };
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const { orderNumber, order_id, email } = body;
    if (!orderNumber && !order_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'orderNumber or order_id is required' }) };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'A valid email is required to look up an order' }) };
    }

    let query = supabase
      .from('orders')
      .select(`
        id,
        orderNumber,
        buyerId,
        sellerId,
        status,
        total,
        createdAt,
        products (id, title, images),
        users!orders_sellerId_fkey (id, firstName, lastName)
      `);

    query = orderNumber ? query.eq('orderNumber', orderNumber) : query.eq('id', order_id!);
    const { data: order, error: orderError } = await query.maybeSingle();
    if (orderError || !order) return genericLookupFailure;

    const { data: buyer } = await supabase
      .from('users')
      .select('email')
      .eq('id', order.buyerId)
      .maybeSingle<{ email: string }>();
    if (!buyer || buyer.email.toLowerCase() !== email.toLowerCase()) return genericLookupFailure;

    const { data: shipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    let shipmentEvents: unknown[] = [];
    let signedProofUrl: string | null = null;
    if (shipment) {
      const { data: events } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });
      shipmentEvents = events || [];

      if (shipment.proof_of_delivery_url) {
        const proofPath = String(shipment.proof_of_delivery_url);
        // Private proof paths are stored as <shipmentId>/<file>. If the value is
        // not scoped to this shipment, do not expose it.
        if (proofPath.startsWith(`${shipment.id}/`) && !proofPath.includes('..')) {
          const { data: signed } = await supabase.storage
            .from(POD_BUCKET)
            .createSignedUrl(proofPath, 10 * 60);
          signedProofUrl = signed?.signedUrl ?? null;
        }
      }
    }

    const response = {
      order: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        total: order.total,
        status: order.status,
        product: order.products ? {
          title: order.products.title,
          image: order.products.images?.[0] || null,
        } : null,
        seller: order.users ? {
          name: `${order.users.firstName || ''} ${order.users.lastName || ''}`.trim() || 'Seller',
        } : null,
      },
      shipment: shipment ? {
        id: shipment.id,
        status: shipment.status,
        courier_name: shipment.courier_name,
        tracking_number: shipment.tracking_number,
        proof_of_delivery_url: signedProofUrl,
        created_at: shipment.created_at,
        updated_at: shipment.updated_at,
      } : null,
      events: shipmentEvents,
      state: shipment ? 'tracked' : 'being_prepared',
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('track-shipment failed:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: 'Failed to track shipment. Please try again.' }),
    };
  }
};
