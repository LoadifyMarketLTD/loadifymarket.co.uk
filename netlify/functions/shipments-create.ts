import { Handler } from '@netlify/functions';
import { createSupabaseAdmin, verifyAuth } from './utils/supabase-admin';

interface CreateShipmentRequest {
  order_id: string;
  courier_name?: string;
  tracking_number?: string;
  shipping_method?: string;
  shipping_cost?: number;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(event.headers.authorization);
    if (!auth.authenticated || !auth.userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const supabase = createSupabaseAdmin();
    const body: CreateShipmentRequest = JSON.parse(event.body || '{}');
    const { order_id, courier_name, tracking_number, shipping_method, shipping_cost } = body;

    if (!order_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'order_id is required' }),
      };
    }

    // Fetch the order and verify user is the seller
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, sellerId, buyerId')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    if (order.sellerId !== auth.userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Only the seller can create shipments for this order' }),
      };
    }

    // Check if shipment already exists
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', order_id)
      .single();

    let shipment;
    
    if (existingShipment) {
      // Update existing shipment
      const { data: updatedShipment, error: updateError } = await supabase
        .from('shipments')
        .update({
          courier_name,
          tracking_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingShipment.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      shipment = updatedShipment;
    } else {
      // Create new shipment
      const { data: newShipment, error: insertError } = await supabase
        .from('shipments')
        .insert({
          order_id,
          seller_id: order.sellerId,
          buyer_id: order.buyerId,
          courier_name,
          tracking_number,
          status: 'Pending',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      shipment = newShipment;

      // Create initial shipment event
      await supabase
        .from('shipment_events')
        .insert({
          shipment_id: shipment.id,
          status: 'Pending',
          message: 'Shipment created',
          changed_by: auth.userId,
        });
    }

    // Update order with shipping details if provided
    if (shipping_method || shipping_cost !== undefined) {
      const updateData: Record<string, unknown> = {};
      if (shipping_method) updateData.shipping_method = shipping_method;
      if (shipping_cost !== undefined) updateData.shipping_cost = shipping_cost;

      await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order_id);
    }

    console.log(`Shipment ${existingShipment ? 'updated' : 'created'} for order ${order_id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        shipment,
      }),
    };
  } catch (error) {
    console.error('Shipment creation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create shipment',
      }),
    };
  }
};
