import { Handler } from '@netlify/functions';
import { createSupabaseAdmin, verifyAuth } from './utils/supabase-admin';

interface UploadProofRequest {
  shipment_id: string;
  file_name: string;
  content_type: string;
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
    const body: UploadProofRequest = JSON.parse(event.body || '{}');
    const { shipment_id, file_name, content_type } = body;

    if (!shipment_id || !file_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'shipment_id and file_name are required' }),
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

    // Generate a unique file path
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'proof-of-delivery';
    const timestamp = Date.now();
    const filePath = `shipments/${shipment_id}/${timestamp}-${file_name}`;

    // Create signed upload URL
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (signedUrlError) {
      throw signedUrlError;
    }

    console.log(`Generated signed upload URL for shipment ${shipment_id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        upload_url: signedUrlData.signedUrl,
        file_path: filePath,
        token: signedUrlData.token,
      }),
    };
  } catch (error) {
    console.error('Upload proof error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate upload URL',
      }),
    };
  }
};
