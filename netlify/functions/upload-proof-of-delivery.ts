import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'proof-of-delivery';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

type AttachProofResult = {
  shipment?: Record<string, unknown>;
  attached?: boolean;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSafeProofPath(shipmentId: string, filePath: string): boolean {
  if (!filePath || filePath.includes('..') || filePath.includes('\\') || filePath.startsWith('/')) return false;
  const pattern = new RegExp(`^${escapeRegex(shipmentId)}/${escapeRegex(shipmentId)}-\\d+\\.(jpg|png|webp|pdf)$`);
  return pattern.test(filePath);
}

function expectedMime(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] ?? null;
}

async function removeUncommittedProof(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  if (error) {
    console.error('upload-proof-of-delivery: failed to remove uncommitted proof object:', error.message);
  }
}

async function getAuthUser(event: HandlerEvent) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.substring(7));
  if (error || !user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: string }>();
  return userData;
}

export const handler: Handler = async (event) => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const user = await getAuthUser(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  if (user.role !== 'seller' && user.role !== 'admin' && user.role !== 'buyer') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const pathParts = event.path.split('/');
  const shipmentId = pathParts[pathParts.length - 2];
  if (!shipmentId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Shipment ID is required' }) };
  }

  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('id, seller_id, buyer_id, status, proof_of_delivery_url')
    .eq('id', shipmentId)
    .maybeSingle<{
      id: string;
      seller_id: string;
      buyer_id: string;
      status: string;
      proof_of_delivery_url: string | null;
    }>();

  if (shipmentError || !shipment) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Shipment not found' }) };
  }

  const isAdmin = user.role === 'admin';
  const isSeller = shipment.seller_id === user.id;
  const isBuyer = shipment.buyer_id === user.id;
  if (!isAdmin && !isSeller && !isBuyer) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized for this shipment' }) };
  }

  // GET returns a short-lived signed URL. The database stores only the private
  // object path; private bucket objects are never exposed via getPublicUrl().
  if (event.httpMethod === 'GET') {
    if (!shipment.proof_of_delivery_url) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Proof of delivery has not been uploaded' }) };
    }
    if (!isSafeProofPath(shipmentId, shipment.proof_of_delivery_url)) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stored proof path is invalid' }) };
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(shipment.proof_of_delivery_url, 10 * 60);
    if (error || !data?.signedUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to open proof of delivery' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ url: data.signedUrl, expiresIn: 600 }) };
  }

  // Only the seller responsible for the shipment or an admin may upload/confirm.
  if (!isAdmin && !isSeller) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the seller or admin may upload proof of delivery' }) };
  }

  const uploadRl = await checkRateLimit({
    supabase,
    tableName: 'upload_proof_rate_limits',
    identifier: user.id,
    windowMinutes: 60,
    maxAttempts: 20,
    policy: 'fail-closed',
  });
  if (uploadRl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many upload requests. Please wait and try again.' }) };
  }

  if (event.httpMethod === 'POST') {
    // POD is commercial evidence. Once attached, do not mint another signed
    // upload URL. PUT confirmation remains retry-safe for the already-canonical
    // path, but POST cannot create replacement evidence.
    if (shipment.proof_of_delivery_url) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Proof of delivery is already attached and cannot be replaced.' }) };
    }

    let requestBody: { contentType?: string; fileSize?: number };
    try {
      requestBody = JSON.parse(event.body || '{}') as { contentType?: string; fileSize?: number };
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    const contentType = (requestBody.contentType ?? '').toLowerCase().trim();
    const fileSize = Number(requestBody.fileSize);
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Allowed proof formats: JPG, PNG, WebP or PDF.' }) };
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Proof file must be between 1 byte and 10 MB.' }) };
    }

    const ext = MIME_TO_EXT[contentType];
    const filePath = `${shipmentId}/${shipmentId}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(filePath);
    if (error || !data?.signedUrl) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Unable to create secure upload URL' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl: data.signedUrl, path: data.path, token: data.token }),
    };
  }

  if (event.httpMethod === 'PUT') {
    let body: { filePath?: string };
    try {
      body = JSON.parse(event.body || '{}') as { filePath?: string };
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }

    const filePath = body.filePath ?? '';
    if (!isSafeProofPath(shipmentId, filePath)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid upload path' }) };
    }

    // Confirmation retries for the exact canonical object are safe and should
    // return success without another DB event or storage mutation. A different
    // object can never replace established evidence; remove that uncommitted
    // object and reject the attempted overwrite.
    if (shipment.proof_of_delivery_url) {
      if (shipment.proof_of_delivery_url === filePath) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            shipment,
            attached: false,
            message: 'Proof of delivery is already attached',
          }),
        };
      }

      await removeUncommittedProof(filePath);
      return { statusCode: 409, body: JSON.stringify({ error: 'Proof of delivery is already attached and cannot be replaced.' }) };
    }

    const fileName = filePath.split('/').pop() ?? '';
    const { data: listedObjects, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(shipmentId, { limit: 100, search: fileName });
    if (listError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to validate uploaded file' }) };
    }

    const matched = (listedObjects ?? []).find((entry) => entry.name === fileName) as
      | { name: string; metadata?: { size?: number; mimetype?: string; contentType?: string }; size?: number; mimetype?: string }
      | undefined;
    if (!matched) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Uploaded file was not found' }) };
    }

    let actualSize = Number(matched.metadata?.size ?? matched.size ?? 0);
    let actualMime = String(
      matched.metadata?.mimetype ?? matched.metadata?.contentType ?? matched.mimetype ?? '',
    ).toLowerCase();

    if (!Number.isFinite(actualSize) || actualSize <= 0 || !actualMime) {
      const { data: downloaded, error: downloadError } = await supabase.storage.from(BUCKET_NAME).download(filePath);
      if (downloadError || !downloaded) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to validate uploaded file metadata' }) };
      }
      actualSize = downloaded.size;
      actualMime = downloaded.type.toLowerCase();
    }

    const requiredMime = expectedMime(filePath);
    const normalizedActualMime = actualMime === 'image/jpg' ? 'image/jpeg' : actualMime;
    if (
      actualSize <= 0 ||
      actualSize > MAX_FILE_SIZE_BYTES ||
      !requiredMime ||
      normalizedActualMime !== requiredMime
    ) {
      await removeUncommittedProof(filePath);
      return { statusCode: 400, body: JSON.stringify({ error: 'Uploaded proof file failed server validation' }) };
    }

    // Attach the validated object path and append its audit event in one DB
    // transaction. If a different concurrent proof won the race, remove this
    // newly-uploaded unreferenced object as compensation.
    const { data: attachResult, error: attachError } = await supabase.rpc('server_attach_shipment_proof', {
      p_shipment_id: shipmentId,
      p_actor_id: user.id,
      p_file_path: filePath,
    });

    if (attachError) {
      await removeUncommittedProof(filePath);
      if (attachError.code === '42501') {
        return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized' }) };
      }
      if (attachError.code === 'P0002') {
        return { statusCode: 404, body: JSON.stringify({ error: 'Shipment not found' }) };
      }
      if (attachError.code === '22023') {
        return { statusCode: 400, body: JSON.stringify({ error: attachError.message }) };
      }
      if (attachError.code === 'P0001') {
        return { statusCode: 409, body: JSON.stringify({ error: attachError.message }) };
      }
      throw new Error(`Atomic proof attachment failed: ${attachError.message}`);
    }

    const result = attachResult as AttachProofResult | null;
    if (!result?.shipment) {
      // DB commit succeeded but the contract response is invalid. Do NOT delete
      // the object now because it may already be the canonical referenced proof.
      throw new Error('Atomic proof attachment returned no shipment');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        shipment: result.shipment,
        attached: result.attached === true,
        message: result.attached === true
          ? 'Proof of delivery uploaded successfully'
          : 'Proof of delivery is already attached',
      }),
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
