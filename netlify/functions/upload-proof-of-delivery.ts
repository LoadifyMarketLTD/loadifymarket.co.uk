import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent } from '@netlify/functions';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('upload-proof-of-delivery: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
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
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
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

    // Only sellers and admins may upload proof of delivery.
    if (user.role !== 'seller' && user.role !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden – seller or admin role required' }),
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
      // Validate content-type and file size before generating the signed URL.
      // The client MUST send Content-Type and Content-Length headers in the
      // request body JSON so the server can enforce policy before any upload.
      const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

      // Extension map derived from ALLOWED_MIME_TYPES to keep a single source of truth.
      const MIME_TO_EXT: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg':  'jpg',
        'image/png':  'png',
        'image/webp': 'webp',
      };
      // Confirm the map covers every allowed type (compile-time parity check).
      ALLOWED_MIME_TYPES.forEach((m) => {
        if (!MIME_TO_EXT[m]) console.warn(`upload-proof-of-delivery: MIME_TO_EXT missing extension for ${m}`);
      });

      let requestBody: { contentType?: string; fileSize?: number } = {};
      try {
        requestBody = JSON.parse(event.body || '{}') as { contentType?: string; fileSize?: number };
      } catch (parseErr) {
        console.warn('upload-proof-of-delivery: failed to parse request body:', (parseErr as Error).message);
        // body parse failure is non-fatal for POST — proceed with defaults
      }

      const contentType = requestBody.contentType ?? '';
      const fileSize = typeof requestBody.fileSize === 'number' ? requestBody.fileSize : 0;

      if (contentType && !ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: `File type not allowed. Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}`,
          }),
        };
      }

      if (fileSize > MAX_FILE_SIZE_BYTES) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'File too large. Maximum allowed size is 10 MB.' }),
        };
      }

      // Derive a safe file extension from the declared content type.
      const ext = MIME_TO_EXT[contentType.toLowerCase()] ?? 'jpg';
      const fileName = `${shipmentId}-${Date.now()}.${ext}`;
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
      let body: { filePath?: string };
      try {
        body = JSON.parse(event.body || '{}') as { filePath?: string };
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid JSON in request body' }),
        };
      }
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
