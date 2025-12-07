import { Handler } from '@netlify/functions';
import { createSupabaseAdmin, verifyAuth } from './utils/supabase-admin';

interface ConfirmProofRequest {
  shipment_id: string;
  file_path: string;
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
    const body: ConfirmProofRequest = JSON.parse(event.body || '{}');
    const { shipment_id, file_path } = body;

    if (!shipment_id || !file_path) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'shipment_id and file_path are required' }),
      };
    }

    // Fetch shipment and verify permissions
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipment_id)
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

    // Get public URL for the uploaded file
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'proof-of-delivery';
    const { data: urlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(file_path);

    const publicUrl = urlData.publicUrl;

    // Update shipment with proof of delivery URL
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        proof_of_delivery_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipment_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create shipment event
    await supabase
      .from('shipment_events')
      .insert({
        shipment_id,
        status: shipment.status,
        message: 'Proof of delivery uploaded',
        changed_by: auth.userId,
      });

    console.log(`Proof of delivery confirmed for shipment ${shipment_id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        shipment: updatedShipment,
        proof_url: publicUrl,
      }),
    };
  } catch (error) {
    console.error('Confirm proof error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to confirm proof of delivery',
      }),
    };
  }
};
