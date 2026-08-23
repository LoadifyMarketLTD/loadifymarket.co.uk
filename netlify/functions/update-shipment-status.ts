import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent } from '@netlify/functions';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UpdateStatusRequest {
  status: string;
  message?: string;
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

// Helper to send email notifications
async function sendStatusEmail(order: { buyerId: string; orderNumber: string; id: string }, shipment: { tracking_number?: string | null; courier_name?: string | null }, status: string) {
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
  if (!emailConfig) {
    return; // No email for this status
  }

  try {
    // Get buyer info
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
      headers: { 'Content-Type': 'application/json' },
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
    // Don't fail the whole request if email fails
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'PUT') {
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

    // Get shipment ID from path
    const pathParts = event.path.split('/');
    const shipmentId = pathParts[pathParts.length - 2]; // .../shipments/:id/status

    if (!shipmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Shipment ID is required' }),
      };
    }

    const body: UpdateStatusRequest = JSON.parse(event.body || '{}');
    const { status, message } = body;

    if (!status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'status is required' }),
      };
    }

    // Validate status
    const validStatuses = ['Pending', 'Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Delivery Failed'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid status' }),
      };
    }

    // Get shipment and verify authorization
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

    // Check authorization (seller or admin)
    if (user.role !== 'admin' && shipment.seller_id !== user.id) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Not authorized' }),
      };
    }

    // Update shipment status
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Insert shipment event
    await supabase
      .from('shipment_events')
      .insert({
        shipment_id: shipmentId,
        status,
        message: message || `Status updated to ${status}`,
        changed_by: user.id,
      });

    // Update order status if applicable
    if (status === 'Delivered') {
      await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        })
        .eq('id', shipment.order_id);
    } else if (status === 'Dispatched' || status === 'In Transit') {
      await supabase
        .from('orders')
        .update({ status: 'shipped' })
        .eq('id', shipment.order_id);
    }

    // Send email notification for certain statuses
    await sendStatusEmail(shipment.orders, updatedShipment, status);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        shipment: updatedShipment,
        message: 'Status updated successfully'
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
