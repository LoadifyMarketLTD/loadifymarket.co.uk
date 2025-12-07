import { Handler } from '@netlify/functions';
import { createSupabaseAdmin } from './utils/supabase-admin';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const supabase = createSupabaseAdmin();
    
    // Extract query parameters
    const params = event.queryStringParameters || {};
    const orderNumber = params.orderNumber;
    const email = params.email;

    if (!orderNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'orderNumber is required' }),
      };
    }

    // Fetch order by order number
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        orderNumber,
        buyerId,
        sellerId,
        total,
        createdAt,
        status,
        users!orders_buyerId_fkey(email),
        products(title)
      `)
      .eq('orderNumber', orderNumber)
      .single();

    if (orderError || !order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Order not found',
          state: 'not_found',
        }),
      };
    }

    // If email provided, verify it matches (best-effort)
    if (email && order.users?.email) {
      if (order.users.email.toLowerCase() !== email.toLowerCase()) {
        return {
          statusCode: 403,
          body: JSON.stringify({ 
            error: 'Email does not match order',
          }),
        };
      }
    }

    // Fetch shipment for this order
    const { data: shipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', order.id)
      .single();

    let shipmentEvents = [];
    if (shipment) {
      // Fetch shipment events
      const { data: events } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });

      shipmentEvents = events || [];
    }

    // Fetch seller info
    const { data: seller } = await supabase
      .from('users')
      .select('id, firstName, lastName')
      .eq('id', order.sellerId)
      .single();

    // Construct response
    const response = {
      order: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        total: order.total,
        status: order.status,
        items: order.products ? [{ title: order.products.title }] : [],
        seller: seller ? {
          id: seller.id,
          name: `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Seller',
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
      shipment_events: shipmentEvents,
      state: shipment ? 'shipped' : 'being_prepared',
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Tracking error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch tracking information',
      }),
    };
  }
};
