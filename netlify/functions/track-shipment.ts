import { createClient } from '@supabase/supabase-js';
import { Handler } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('track-shipment: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
);

export const handler: Handler = async (event) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Rate limiting: 20 tracking requests per IP per 15 minutes ────────────
  const ip = getClientIp(event);
  if (ip) {
    const rl = await checkRateLimit({
      supabase,
      tableName: 'track_shipment_rate_limits',
      identifier: ip,
      windowMinutes: 15,
      maxAttempts: 20,
    });
    if (rl.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      };
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const genericLookupFailure = {
      statusCode: 404,
      body: JSON.stringify({ error: 'Order not found for the provided details' }),
    };

    let body: { orderNumber?: string; order_id?: string; email?: string };
    try {
      body = JSON.parse(event.body || '{}') as { orderNumber?: string; order_id?: string; email?: string };
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body' }),
      };
    }

    const { orderNumber, order_id, email } = body;

    if (!orderNumber && !order_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'orderNumber or order_id is required' }),
      };
    }

    // Email is required to prevent order enumeration attacks.
    // Without this check any caller with a valid order number could read
    // shipping details for orders that are not theirs.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'A valid email is required to look up an order' }),
      };
    }

    // Build query
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
        shippingAddress,
        products (
          id,
          title,
          images
        ),
        users!orders_sellerId_fkey (
          id,
          firstName,
          lastName,
          email
        )
      `);

    if (orderNumber) {
      query = query.eq('orderNumber', orderNumber);
    } else if (order_id) {
      query = query.eq('id', order_id);
    }

    const { data: order, error: orderError } = await query.single();

    if (orderError || !order) {
      return genericLookupFailure;
    }

    // Mandatory email verification — email is required by the handler above.
    // Verifies the caller owns the order before exposing any shipping data.
    {
      const { data: buyer } = await supabase
        .from('users')
        .select('email')
        .eq('id', order.buyerId)
        .single();

      if (!buyer || buyer.email.toLowerCase() !== email.toLowerCase()) {
        return genericLookupFailure;
      }
    }

    // Get shipment data
    const { data: shipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', order.id)
      .single();

    // Get shipment events if shipment exists
    let shipmentEvents = [];
    if (shipment) {
      const { data: events } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });

      shipmentEvents = events || [];
    }

    // Build response
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
        proof_of_delivery_url: shipment.proof_of_delivery_url,
        created_at: shipment.created_at,
        updated_at: shipment.updated_at,
      } : null,
      events: shipmentEvents,
      state: shipment ? 'tracked' : 'being_prepared',
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error tracking shipment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to track shipment',
      }),
    };
  }
};
