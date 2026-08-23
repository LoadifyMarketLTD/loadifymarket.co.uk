import { createClient } from '@supabase/supabase-js';
import { Handler } from '@netlify/functions';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { orderNumber, order_id, email } = params;

    if (!orderNumber && !order_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'orderNumber or order_id is required' }),
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
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    // Optional email verification for additional security
    if (email) {
      const { data: buyer } = await supabase
        .from('users')
        .select('email')
        .eq('id', order.buyerId)
        .single();

      if (!buyer || buyer.email.toLowerCase() !== email.toLowerCase()) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Email does not match order' }),
        };
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
        'Cache-Control': 'no-cache',
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
