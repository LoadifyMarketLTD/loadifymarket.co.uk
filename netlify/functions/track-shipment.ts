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

    const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim() : '';
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!orderNumber && !orderId) {
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
        status,
        total,
        createdAt,
        products (title, images),
        users!orders_sellerId_fkey (firstName, lastName)
      `);

    query = orderNumber ? query.eq('orderNumber', orderNumber) : query.eq('id', orderId);
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
      .select('id, status, courier_name, tracking_number, proof_of_delivery_url, created_at, updated_at')
      .eq('order_id', order.id)
      .maybeSingle<{
        id: string;
        status: string;
        courier_name: string | null;
        tracking_number: string | null;
        proof_of_delivery_url: string | null;
        created_at: string;
        updated_at: string;
      }>();

    let shipmentEvents: Array<{
      id: string;
      status: string;
      location: string | null;
      message: string | null;
      created_at: string;
    }> = [];
    let signedProofUrl: string | null = null;

    if (shipment) {
      const { data: events } = await supabase
        .from('shipment_events')
        .select('id, status, location, message, created_at')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });
      shipmentEvents = events ?? [];

      if (shipment.proof_of_delivery_url) {
        const proofPath = String(shipment.proof_of_delivery_url);
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
