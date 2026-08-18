import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { enforcePaymentBackedTransition, type GuardedOrderStatus } from './_shared/orderTransitionGuards';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('update-shipment-status: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!,
);

interface UpdateStatusRequest {
  status: string;
  message?: string;
}

const VALID_STATUSES = [
  'Pending',
  'Processing',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Returned',
  'Delivery Failed',
] as const;

const NORMAL_PROGRESS: Record<string, number> = {
  Pending: 0,
  Processing: 1,
  Dispatched: 2,
  'In Transit': 3,
  'Out for Delivery': 4,
  Delivered: 5,
};

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

async function sendStatusEmail(
  order: { buyerId: string; orderNumber: string; id: string },
  shipment: { tracking_number?: string | null; courier_name?: string | null },
  status: string,
) {
  const emailTemplates: Record<string, { subject: string; template: string }> = {
    Dispatched: { subject: 'Your order has been dispatched', template: 'order_shipped' },
    'Out for Delivery': { subject: 'Your order is out for delivery', template: 'order_shipped' },
    Delivered: { subject: 'Your order has been delivered', template: 'order_delivered' },
  };

  const emailConfig = emailTemplates[status];
  if (!emailConfig) return;

  try {
    const { data: buyer } = await supabase
      .from('users')
      .select('email, firstName')
      .eq('id', order.buyerId)
      .single();
    if (!buyer?.email) return;

    const appUrl = (process.env.VITE_APP_URL || process.env.URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
    const trackingUrl = shipment.tracking_number
      ? `${appUrl}/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`
      : null;

    await fetch(`${appUrl}/.netlify/functions/send-email`, {
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
        },
      }),
    });
  } catch (error) {
    console.error('update-shipment-status: failed to send email:', error);
  }
}

function validateOrderStateForShipmentStatus(orderStatus: string, shipmentStatus: string): string | null {
  if (shipmentStatus === 'Pending' || shipmentStatus === 'Processing') {
    return ['paid', 'packed'].includes(orderStatus)
      ? null
      : `Shipment cannot move to ${shipmentStatus} while the order is ${orderStatus}.`;
  }

  if (shipmentStatus === 'Dispatched' || shipmentStatus === 'In Transit') {
    return ['paid', 'packed', 'shipped'].includes(orderStatus)
      ? null
      : `Shipment cannot move to ${shipmentStatus} while the order is ${orderStatus}.`;
  }

  if (shipmentStatus === 'Out for Delivery') {
    return orderStatus === 'shipped'
      ? null
      : `Shipment cannot move to Out for Delivery while the order is ${orderStatus}.`;
  }

  if (shipmentStatus === 'Delivered') {
    return ['shipped', 'delivered'].includes(orderStatus)
      ? null
      : `Shipment cannot be marked Delivered while the order is ${orderStatus}.`;
  }

  if (shipmentStatus === 'Delivery Failed') {
    return ['paid', 'packed', 'shipped'].includes(orderStatus)
      ? null
      : `Shipment cannot be marked Delivery Failed while the order is ${orderStatus}.`;
  }

  if (shipmentStatus === 'Returned') {
    return ['delivered', 'completed'].includes(orderStatus)
      ? null
      : `Shipment cannot be marked Returned while the order is ${orderStatus}.`;
  }

  return null;
}

export const handler: Handler = async (event) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const user = await getAuthUser(event);
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (user.role !== 'seller' && user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden – seller or admin role required' }) };
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
      return { statusCode: 400, body: JSON.stringify({ error: 'Shipment ID is required' }) };
    }

    let body: UpdateStatusRequest;
    try {
      body = JSON.parse(event.body || '{}') as UpdateStatusRequest;
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }

    const status = typeof body.status === 'string' ? body.status.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid status' }) };
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*, orders(*)')
      .eq('id', shipmentId)
      .single();
    if (shipmentError || !shipment) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Shipment not found' }) };
    }

    if (user.role !== 'admin' && shipment.seller_id !== user.id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized' }) };
    }

    if (!shipment.orders?.id || !shipment.orders?.productId) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Shipment is not linked to a valid order.' }) };
    }

    if (status === shipment.status) {
      return { statusCode: 200, body: JSON.stringify({ success: true, shipment, message: 'Status unchanged' }) };
    }

    const currentRank = NORMAL_PROGRESS[String(shipment.status)];
    const nextRank = NORMAL_PROGRESS[status];
    if (currentRank != null && nextRank != null && nextRank < currentRank) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: `Shipment cannot move backwards from ${shipment.status} to ${status}.` }),
      };
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, listingContext')
      .eq('id', shipment.orders.productId)
      .maybeSingle<{ id: string; listingContext: 'product' | 'service' | null }>();
    if (productError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to verify order product.' }) };
    }
    if (!product || product.listingContext === 'service') {
      return { statusCode: 409, body: JSON.stringify({ error: 'Service orders do not use shipment tracking.' }) };
    }

    const orderStateError = validateOrderStateForShipmentStatus(shipment.orders.status, status);
    if (orderStateError) {
      return { statusCode: 409, body: JSON.stringify({ error: orderStateError }) };
    }

    let targetOrderStatus: GuardedOrderStatus | null = null;
    if (status === 'Delivered') {
      targetOrderStatus = 'delivered';
    } else if (status === 'Dispatched' || status === 'In Transit') {
      targetOrderStatus = 'shipped';
    }

    if (targetOrderStatus) {
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
        product: { id: product.id, listingContext: product.listingContext },
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

    const now = new Date().toISOString();
    const previousShipmentStatus = shipment.status;
    const previousDispatchedAt = shipment.dispatched_at ?? null;
    const shipmentUpdate: Record<string, unknown> = {
      status,
      updated_at: now,
    };
    if (
      !previousDispatchedAt &&
      ['Dispatched', 'In Transit', 'Out for Delivery', 'Delivered'].includes(status)
    ) {
      shipmentUpdate.dispatched_at = now;
    }

    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update(shipmentUpdate)
      .eq('id', shipmentId)
      .select()
      .single();
    if (updateError) throw updateError;

    if (targetOrderStatus && shipment.orders.status !== targetOrderStatus) {
      const orderUpdate: Record<string, unknown> = { status: targetOrderStatus };
      if (targetOrderStatus === 'delivered') orderUpdate.deliveredAt = now;

      const { data: synchronizedOrder, error: orderUpdateError } = await supabase
        .from('orders')
        .update(orderUpdate)
        .eq('id', shipment.order_id)
        .eq('status', shipment.orders.status)
        .select('id')
        .maybeSingle<{ id: string }>();

      if (orderUpdateError || !synchronizedOrder) {
        const { error: rollbackError } = await supabase
          .from('shipments')
          .update({
            status: previousShipmentStatus,
            dispatched_at: previousDispatchedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipmentId);
        if (rollbackError) {
          console.error('update-shipment-status: shipment rollback failed:', rollbackError.message);
          throw new Error('Order status changed concurrently and shipment rollback failed. Manual review required.');
        }
        if (orderUpdateError) {
          throw new Error(`Failed to synchronize order status: ${orderUpdateError.message}`);
        }
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'Order status changed while the shipment was being updated. Please refresh and try again.' }),
        };
      }
    }

    const { error: eventError } = await supabase
      .from('shipment_events')
      .insert({
        shipment_id: shipmentId,
        status,
        message: message || `Status updated to ${status}`,
        changed_by: user.id,
      });
    if (eventError) {
      console.error('update-shipment-status: shipment event write failed:', eventError.message);
    }

    const notificationTitle = status === 'Delivered'
      ? 'Order delivered — please confirm'
      : 'Shipment update';
    const notificationMessage = status === 'Delivered'
      ? `Order ${shipment.orders.orderNumber} has been marked delivered. Please confirm receipt from your orders page.`
      : `Order ${shipment.orders.orderNumber} shipment status: ${status}.`;

    await supabase.from('notifications').insert({
      userId: shipment.orders.buyerId,
      type: status === 'Delivered' ? 'delivery' : 'shipment',
      title: notificationTitle,
      message: notificationMessage,
      link: '/buyer/orders',
    }).catch((err: unknown) => console.warn('update-shipment-status: buyer notification failed:', err));

    await sendStatusEmail(shipment.orders, updatedShipment, status);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, shipment: updatedShipment, message: 'Status updated successfully' }),
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
