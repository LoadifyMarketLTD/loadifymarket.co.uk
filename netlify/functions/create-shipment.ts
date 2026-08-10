import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('create-shipment: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
);

interface CreateShipmentRequest {
  order_id: string;
  courier_name?: string;
  tracking_number?: string;
  dispatched_at?: string | null;
  shipping_method?: string;
  shipping_cost?: number;
}

// Helper to get user from Authorization header
async function getAuthUser(event: HandlerEvent) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return userData;
}

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

  try {
    // Authenticate user
    const user = await getAuthUser(event);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Only sellers and admins can create shipments
    if (user.role !== 'seller' && user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden - seller role required' }),
      };
    }

    // Rate-limit: 30 shipment creates/updates per user per 60-minute window.
    const shipRl = await checkRateLimit({
      supabase,
      tableName: 'create_shipment_rate_limits',
      identifier: user.id as string,
      windowMinutes: 60,
      maxAttempts: 30,
    });
    if (shipRl.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many shipment requests. Please wait and try again.' }),
      };
    }

    let body: CreateShipmentRequest;
    try {
      body = JSON.parse(event.body || '{}') as CreateShipmentRequest;
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    const { order_id, courier_name, tracking_number, dispatched_at, shipping_method, shipping_cost } = body;

    if (!order_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'order_id is required' }),
      };
    }

    if (shipping_cost !== undefined && (!Number.isFinite(shipping_cost) || shipping_cost < 0)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'shipping_cost must be a non-negative number' }),
      };
    }

    // Verify the order exists and user is the seller (or admin)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, products(sellerId)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    // Check authorization
    if (user.role !== 'admin' && order.sellerId !== user.id) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Not authorized for this order' }),
      };
    }

    // Check if shipment already exists for this order
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', order_id)
      .single();

    let shipment;
    let isNew = false;

    if (existingShipment) {
      // Update existing shipment
      const { data, error } = await supabase
        .from('shipments')
        .update({
          courier_name,
          tracking_number,
          ...(dispatched_at !== undefined ? { dispatched_at } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingShipment.id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      shipment = data;
    } else {
      // Create new shipment
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          order_id,
          seller_id: order.sellerId,
          buyer_id: order.buyerId,
          courier_name,
          tracking_number,
          dispatched_at: dispatched_at || null,
          status: dispatched_at ? 'Dispatched' : 'Pending',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      shipment = data;
      isNew = true;

      // Create initial shipment event
      await supabase
        .from('shipment_events')
        .insert({
          shipment_id: shipment.id,
          status: dispatched_at ? 'Dispatched' : 'Pending',
          message: dispatched_at ? `Shipment dispatched on ${new Date(dispatched_at).toLocaleDateString('en-GB')}` : 'Shipment created',
          changed_by: user.id,
        });
    }

    // The API payload keeps snake_case for backwards compatibility, but the
    // canonical orders schema uses camelCase column names.
    if (shipping_method || shipping_cost !== undefined) {
      const updateData: { shippingMethod?: string; shippingAmount?: number } = {};
      if (shipping_method) updateData.shippingMethod = shipping_method;
      if (shipping_cost !== undefined) updateData.shippingAmount = shipping_cost;

      const { error: orderShippingError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order_id);

      if (orderShippingError) {
        throw new Error(`Failed to persist order shipping details: ${orderShippingError.message}`);
      }
    }

    return {
      statusCode: isNew ? 201 : 200,
      body: JSON.stringify({ 
        success: true, 
        shipment,
        message: isNew ? 'Shipment created' : 'Shipment updated'
      }),
    };
  } catch (error) {
    console.error('Error creating/updating shipment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create/update shipment',
      }),
    };
  }
};
