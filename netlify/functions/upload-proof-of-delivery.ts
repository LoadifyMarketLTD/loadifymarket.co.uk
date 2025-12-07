import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent } from '@netlify/functions';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'proof-of-delivery';

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
    const shipmentId = pathParts[pathParts.length - 2]; // .../shipments/:id/proof

    if (!shipmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Shipment ID is required' }),
      };
    }

    // Get shipment and verify authorization
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
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

    if (event.httpMethod === 'POST') {
      // Generate signed upload URL
      const fileName = `${shipmentId}-${Date.now()}.jpg`;
      const filePath = `${shipmentId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(filePath);

      if (uploadError) {
        throw uploadError;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          uploadUrl: uploadData.signedUrl,
          path: uploadData.path,
          token: uploadData.token,
        }),
      };
    } else if (event.httpMethod === 'PUT') {
      // Confirm upload and save public URL
      const body = JSON.parse(event.body || '{}');
      const { filePath } = body;

      if (!filePath) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'filePath is required' }),
        };
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update shipment with proof of delivery URL
      const { data: updatedShipment, error: updateError } = await supabase
        .from('shipments')
        .update({
          proof_of_delivery_url: publicUrl,
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
          status: shipment.status,
          message: 'Proof of delivery uploaded',
          changed_by: user.id,
        });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          shipment: updatedShipment,
          message: 'Proof of delivery uploaded successfully',
        }),
      };
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('Error handling proof of delivery:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to handle proof of delivery',
      }),
    };
  }
};
