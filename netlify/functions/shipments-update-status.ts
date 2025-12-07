import { Handler } from '@netlify/functions';
import { createSupabaseAdmin, verifyAuth } from './utils/supabase-admin';

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
];

const EMAIL_TRIGGER_STATUSES = ['Dispatched', 'Out for Delivery', 'Delivered'];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'PUT') {
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
    
    // Extract shipment ID from path
    const pathParts = event.path.split('/');
    const shipmentId = pathParts[pathParts.length - 1];

    if (!shipmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Shipment ID is required' }),
      };
    }

    const body: UpdateStatusRequest = JSON.parse(event.body || '{}');
    const { status, message } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid status',
          validStatuses: VALID_STATUSES,
        }),
      };
    }

    // Fetch shipment and verify permissions
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*, orders(orderNumber, buyerId)')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Shipment not found' }),
      };
    }

    // Check if user is seller or admin
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', auth.userId)
      .single();

    const isAdmin = user?.role === 'admin';
    const isSeller = shipment.seller_id === auth.userId;

    if (!isAdmin && !isSeller) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Insufficient permissions' }),
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

    // Create shipment event
    await supabase
      .from('shipment_events')
      .insert({
        shipment_id: shipmentId,
        status,
        message: message || `Status updated to ${status}`,
        changed_by: auth.userId,
      });

    // Send email notification for specific statuses
    if (EMAIL_TRIGGER_STATUSES.includes(status)) {
      try {
        // Fetch buyer information
        const { data: buyer } = await supabase
          .from('users')
          .select('email, firstName')
          .eq('id', shipment.orders.buyerId)
          .single();

        if (buyer) {
          const trackingUrl = shipment.tracking_number 
            ? `https://track.example.com/${shipment.tracking_number}`
            : undefined;

          // Determine email template based on status
          let emailTemplate = 'order_shipped';
          if (status === 'Delivered') {
            emailTemplate = 'order_delivered';
          }

          const emailPayload = {
            to: buyer.email,
            subject: `Order ${shipment.orders.orderNumber} - ${status}`,
            template: emailTemplate,
            data: {
              customerName: buyer.firstName || 'Customer',
              orderNumber: shipment.orders.orderNumber,
              courier_name: shipment.courier_name || 'Standard Delivery',
              tracking_number: shipment.tracking_number,
              tracking_url: trackingUrl,
              status,
            },
          };

          // Call send-email function
          await fetch(`${process.env.URL}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload),
          });
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`Shipment ${shipmentId} status updated to ${status}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        shipment: updatedShipment,
      }),
    };
  } catch (error) {
    console.error('Shipment status update error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to update shipment status',
      }),
    };
  }
};
