import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { enforcePaymentBackedTransition, type GuardedOrderStatus } from './_shared/orderTransitionGuards';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('update-shipment-status: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
);

interface UpdateStatusRequest {
  status: string;
  message?: string;
}

type ShipmentTransitionResult = {
  shipment?: {
    tracking_number?: string | null;
    courier_name?: string | null;
    [key: string]: unknown;
  };
  changed?: boolean;
};

type ShipmentActor = {
  id: string;
  role: string;
  isActive: boolean;
};

// Helper to get user from Authorization header and resolve current platform state.
async function getAuthUser(event: HandlerEvent): Promise<ShipmentActor | null> {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, isActive')
    .eq('id', user.id)
    .single<ShipmentActor>();

  if (userError || !userData) return null;
  return userData;
}

async function sendStatusEmail(
  order: { buyerId: string; orderNumber: string; id: string },
  shipment: { tracking_number?: string | null; courier_name?: string | null },
  status: string,
) {
  const emailTemplates: Record<string, { subject: string; template: string }> = {
    'Dispatched': {
      subject: 'Your order has been dispatched',
      template: 'order_shipped'
    },
    'Out for Delivery': {
      subject: 'Your order is out for delivery',
      template: 'order_shipped'
    },
    'Delivered': {
      subject: 'Your order has been delivered',
      template: 'order_delivered'
    }
  };

  const emailConfig = emailTemplates[status];
  if (!emailConfig) return;

  try {
    const { data: buyer } = await supabase
      .from('users')
      .select('email, firstName, lastName')
      .eq('id', order.buyerId)
      .single();

    if (!buyer) return;

    const trackingUrl = shipment.tracking_number 
      ? `${process.env.VITE_APP_URL || process.env.URL}/track-order?orderNumber=${order.orderNumber}`
      : null;

    await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
      },
      body: JSON.stringify({
        to: buyer.email,
        subject: emailConfig.subject,
        template: emailConfig.template,
        data: {
          customerName: buyer.firstName || 'Customer',
          orderNumber: order.orderNumber,
          orderId: order.id,
          trackingNumber: shipment.tracking_number,
          carrier: shipment.courier_name || 'Standard Delivery',
          trackingUrl,
        }
      })
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    // Post-commit notification failure must not roll back canonical shipment state.
  }
}

export const handler: Handler = async (event) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const user = await getAuthUser(event);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // #520 is intentionally the pre-608 runtime. A stale but otherwise valid
    // token for a suspended actor must stop here before any service-role access.
    if (user.isActive !== true) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Account is suspended' }),
      };
    }

    if (user.role !== 'seller' && user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden – seller or admin role required' }),
      };
    }

    const statusRl = await checkRateLimit({
      supabase,
      tableName: 'update_shipment_status_rate_limits',
      identifier: user.id as string,
      windowMinutes: 60,
      maxAttempts: 60,
    });
    if (statusRl.exceeded) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Too many status update requests. Please wait and try again.' }),
      };
    }

    const pathParts = event.path.split('/');
    const shipmentId = pathParts[pathParts.length - 2];

    if (!shipmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Shipment ID is required' }),
      };
    }

    let body: UpdateStatusRequest;
    try {
      body = JSON.parse(event.body || '{}') as UpdateStatusRequest;
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    const { status, message } = body;

    if (!status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'status is required' }),
      };
    }

    const validStatuses = ['Pending', 'Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Delivery Failed'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid status' }),
      };
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*, orders(*)')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Shipment not found' }),
      };
    }

    if (user.role !== 'admin' && shipment.seller_id !== user.id) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Not authorized' }),
      };
    }

    let targetOrderStatus: GuardedOrderStatus | null = null;
    if (status === 'Delivered') {
      targetOrderStatus = 'delivered';
    } else if (status === 'Dispatched' || status === 'In Transit' || status === 'Out for Delivery') {
      targetOrderStatus = 'shipped';
    }

    if (targetOrderStatus && shipment.orders?.id && shipment.orders?.productId) {
      const { data: product } = await supabase
        .from('products')
        .select('id, listingContext')
        .eq('id', shipment.orders.productId)
        .maybeSingle<{ id: string; listingContext: 'product' | 'service' | null }>();

      const paymentGuard = await enforcePaymentBackedTransition({
        supabase,
        order: {
          id: shipment.orders.id,
          orderNumber: shipment.orders.orderNumber,
          status: shipment.orders.status,
          productId: shipment.orders.productId,
          stripePaymentIntentId: shipment.orders.stripePaymentIntentId ?? null,
          rfqId: shipment.orders.rfqId ?? null,
          rfqResponseId: shipment.orders.rfqResponseId ?? null,
        },
        product: {
          id: shipment.orders.productId,
          listingContext: product?.listingContext ?? null,
        },
        nextStatus: targetOrderStatus,
        actorRole: user.role === 'admin' ? 'admin' : 'seller',
      });

      if (!paymentGuard.ok) {
        return {
          statusCode: paymentGuard.statusCode,
          body: JSON.stringify({ error: paymentGuard.error }),
        };
      }
    }

    const { data: transition, error: transitionError } = await supabase.rpc('server_transition_shipment', {
      p_shipment_id: shipmentId,
      p_actor_id: user.id,
      p_status: status,
      p_message: typeof message === 'string' ? message : null,
    });

    if (transitionError) {
      if (transitionError.code === '42501') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized' }) };
      }
      if (transitionError.code === 'P0002') {
        return { statusCode: 404, body: JSON.stringify({ error: 'Shipment or order not found' }) };
      }
      if (transitionError.code === '22023') {
        return { statusCode: 400, body: JSON.stringify({ error: transitionError.message }) };
      }
      if (transitionError.code === 'P0001') {
        return { statusCode: 409, body: JSON.stringify({ error: transitionError.message }) };
      }
      throw new Error(`Atomic shipment transition failed: ${transitionError.message}`);
    }

    const result = transition as ShipmentTransitionResult | null;
    if (!result?.shipment) {
      throw new Error('Atomic shipment transition returned no shipment');
    }
    const updatedShipment = result.shipment;
    const changed = result.changed === true;

    // Idempotent retries return success but must not duplicate user-facing side
    // effects. Only a material canonical state change emits notification/email.
    if (changed) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          userId: shipment.buyer_id,
          type: 'shipment',
          title: 'Shipment update',
          message: `Your order ${shipment.orders?.orderNumber ?? shipment.order_id} shipment status is now: ${status}.`,
          link: '/buyer/orders',
        });
      if (notificationError) {
        console.error('Failed to create shipment notification:', notificationError.message);
      }

      await sendStatusEmail(shipment.orders, updatedShipment, status);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        shipment: updatedShipment,
        changed,
        message: changed ? 'Status updated successfully' : 'Shipment already has the requested status'
      }),
    };
  } catch (error) {
    console.error('Error updating shipment status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update status',
      }),
    };
  }
};
