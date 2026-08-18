import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { enforcePaymentBackedTransition } from './_shared/orderTransitionGuards';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('create-shipment: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!,
);

interface CreateShipmentRequest {
  order_id: string;
  courier_name?: string;
  tracking_number?: string;
}

interface ShipmentOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  status: string;
  productId: string;
  stripePaymentIntentId?: string | null;
  rfqId?: string | null;
  rfqResponseId?: string | null;
}

async function getAuthUser(event: HandlerEvent) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  return userData;
}

export const handler: Handler = async (event) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const user = await getAuthUser(event);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (user.role !== 'seller' && user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden - seller role required' }) };
    }

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

    let rawBody: Record<string, unknown>;
    try {
      rawBody = JSON.parse(event.body || '{}') as Record<string, unknown>;
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }

    // Shipping price/method are fixed by the server-authoritative checkout. A
    // shipment record may never rewrite paid order money or commercial terms.
    if ('shipping_cost' in rawBody || 'shipping_method' in rawBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Shipping price and method cannot be changed after checkout.' }),
      };
    }

    // Dispatch is a status transition, not shipment metadata. It must go through
    // update-shipment-status so payment evidence and order lifecycle stay aligned.
    if ('dispatched_at' in rawBody) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Set dispatch through the shipment status workflow.' }),
      };
    }

    const body = rawBody as unknown as CreateShipmentRequest;
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    if (!orderId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'order_id is required' }) };
    }

    const courierName = typeof body.courier_name === 'string' ? body.courier_name.trim() : '';
    const trackingNumber = typeof body.tracking_number === 'string' ? body.tracking_number.trim() : '';

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, orderNumber, buyerId, sellerId, status, productId, stripePaymentIntentId, rfqId, rfqResponseId')
      .eq('id', orderId)
      .maybeSingle<ShipmentOrder>();

    if (orderError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load order' }) };
    }
    if (!order) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
    }

    if (user.role !== 'admin' && order.sellerId !== user.id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized for this order' }) };
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, listingContext')
      .eq('id', order.productId)
      .maybeSingle<{ id: string; listingContext: 'product' | 'service' | null }>();

    if (productError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load order product' }) };
    }
    if (!product || product.listingContext === 'service') {
      return { statusCode: 409, body: JSON.stringify({ error: 'Service orders do not use shipment tracking.' }) };
    }

    if (!['paid', 'packed', 'shipped'].includes(order.status)) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: `A shipment cannot be logged for an order with status '${order.status}'.` }),
      };
    }

    const paymentGuard = await enforcePaymentBackedTransition({
      supabase,
      order,
      product: { id: product.id, listingContext: product.listingContext },
      nextStatus: 'shipped',
      actorRole: user.role === 'admin' ? 'admin' : 'seller',
    });
    if (!paymentGuard.ok) {
      return {
        statusCode: paymentGuard.statusCode,
        body: JSON.stringify({ error: paymentGuard.error }),
      };
    }

    const { data: existingShipment, error: existingError } = await supabase
      .from('shipments')
      .select('id, status')
      .eq('order_id', orderId)
      .maybeSingle<{ id: string; status: string }>();
    if (existingError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to inspect existing shipment' }) };
    }

    if (existingShipment) {
      const { data, error } = await supabase
        .from('shipments')
        .update({
          courier_name: courierName || null,
          tracking_number: trackingNumber || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingShipment.id)
        .select()
        .single();
      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, shipment: data, message: 'Shipment updated' }),
      };
    }

    const { data: shipment, error: insertError } = await supabase
      .from('shipments')
      .insert({
        order_id: order.id,
        seller_id: order.sellerId,
        buyer_id: order.buyerId,
        courier_name: courierName || null,
        tracking_number: trackingNumber || null,
        dispatched_at: null,
        status: 'Pending',
      })
      .select()
      .single();
    if (insertError) throw insertError;

    const { error: eventError } = await supabase
      .from('shipment_events')
      .insert({
        shipment_id: shipment.id,
        status: 'Pending',
        message: 'Shipment created',
        changed_by: user.id,
      });
    if (eventError) {
      console.error('create-shipment: initial shipment event failed:', eventError.message);
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, shipment, message: 'Shipment created' }),
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
