import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { enforcePaymentBackedTransition } from './_shared/orderTransitionGuards';

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
  // Legacy fields are accepted only so the endpoint can reject attempts to
  // mutate paid commercial terms explicitly instead of silently ignoring them.
  shipping_method?: unknown;
  shipping_cost?: unknown;
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
    const { order_id, courier_name, tracking_number, dispatched_at } = body;

    if (!order_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'order_id is required' }),
      };
    }

    // Shipping method/amount are commercial terms fixed by the verified checkout
    // and Stripe payment evidence. Fulfilment must never rewrite them. Reject
    // legacy/forged attempts explicitly so no caller can mistake the request for
    // a successful commercial-term update.
    if (
      Object.prototype.hasOwnProperty.call(body, 'shipping_method') ||
      Object.prototype.hasOwnProperty.call(body, 'shipping_cost')
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: 'Shipping method and amount are fixed at checkout and cannot be changed during fulfilment.',
        }),
      };
    }

    // Verify the order exists and user is the seller (or admin).
    // Shipment creation is an order-lifecycle operation: terminal/cancelled
    // orders must never be turned back into fulfilment work.
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, orderNumber, status, productId, sellerId, buyerId, stripePaymentIntentId, rfqId, rfqResponseId, escrowStatus')
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

    if (['cancelled', 'refunded', 'disputed', 'completed'].includes(order.status)) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: `A shipment cannot be created or changed for an order in '${order.status}' status.` }),
      };
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, listingContext')
      .eq('id', order.productId)
      .maybeSingle<{ id: string; listingContext: 'product' | 'service' | null }>();

    if (productError || !product) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'The order product could not be verified for fulfilment.' }),
      };
    }

    // A physical order must have valid completed Stripe evidence before a
    // shipment can be created at all. This closes the create-shipment bypass
    // around the guarded status-update endpoint.
    const paymentGuard = await enforcePaymentBackedTransition({
      supabase,
      order,
      product,
      nextStatus: 'shipped',
      actorRole: user.role === 'admin' ? 'admin' : 'seller',
    });

    if (!paymentGuard.ok) {
      return {
        statusCode: paymentGuard.statusCode,
        body: JSON.stringify({ error: paymentGuard.error }),
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