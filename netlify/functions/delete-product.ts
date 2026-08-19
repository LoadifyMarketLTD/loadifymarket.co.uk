import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode } from './_shared/platformFlags';
import { PRODUCT_IMAGES_BUCKET, extractOwnedProductImagePath } from './_shared/productImagePaths';

type DeleteProductStatus = 'deleted' | 'not_found' | 'forbidden' | 'retained_history';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = event.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(authHeader.substring(7));
  if (authError || !authData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const callerId = authData.user.id;

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', callerId)
    .maybeSingle<{ role: string | null }>();
  if (userError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify account role.' }) };
  }

  const role = userRow?.role ?? null;
  if (role !== 'seller' && role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can delete listings' }) };
  }
  const isAdmin = role === 'admin';

  if (await isMaintenanceMode(supabase) && !isAdmin) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Platform is temporarily under maintenance. Listings cannot be deleted right now.' }),
    };
  }

  let body: { id?: string };
  try {
    body = JSON.parse(event.body || '{}') as { id?: string };
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const productId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!productId) {
    return { statusCode: 400, body: JSON.stringify({ error: '"id" is required' }) };
  }

  // Snapshot seller/images for post-delete media cleanup and early UX errors.
  // Ownership and retained-history safety are rechecked atomically by the DB RPC
  // immediately before DELETE; this query is deliberately not the authority for
  // the destructive decision.
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('sellerId, images')
    .eq('id', productId)
    .maybeSingle<{ sellerId: string; images: string[] | null }>();

  if (productError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify listing before deletion.' }) };
  }
  if (!product) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }
  if (!isAdmin && product.sellerId !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to delete this listing' }) };
  }

  const { data: deleteStatusData, error: deleteError } = await supabase.rpc(
    'delete_product_if_history_free',
    {
      p_product_id: productId,
      p_caller_id: callerId,
      p_is_admin: isAdmin,
    },
  );

  if (deleteError) {
    console.error('delete-product: atomic delete RPC failed:', deleteError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete listing. Please try again.' }) };
  }

  const deleteStatus = deleteStatusData as DeleteProductStatus | null;
  if (deleteStatus === 'not_found') {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }
  if (deleteStatus === 'forbidden') {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to delete this listing' }) };
  }
  if (deleteStatus === 'retained_history') {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: 'This listing has marketplace history that must be retained. Keep it unpublished instead.',
        code: 'LISTING_HAS_RETAINED_HISTORY',
      }),
    };
  }
  if (deleteStatus !== 'deleted') {
    console.error('delete-product: unexpected atomic delete status:', deleteStatus);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete listing. Please try again.' }) };
  }

  // URLs uploaded by Loadify use unique object names, but the product form also
  // supports Add URL, so another listing can intentionally reuse the same object.
  // Never remove a storage object while another product still references its URL.
  const ownedMedia = [...new Set(
    (product.images ?? [])
      .map((url) => ({
        url,
        path: extractOwnedProductImagePath(url, supabaseUrl, product.sellerId),
      }))
      .filter((entry): entry is { url: string; path: string } => Boolean(entry.path)),
  )];

  const imagePathsToRemove: string[] = [];
  for (const image of ownedMedia) {
    const { data: referenceRows, error: referenceError } = await supabase
      .from('products')
      .select('id')
      .contains('images', [image.url])
      .limit(1);

    if (referenceError) {
      console.error('delete-product: media reference check failed; keeping object:', referenceError.message);
      continue;
    }
    if ((referenceRows?.length ?? 0) === 0) {
      imagePathsToRemove.push(image.path);
    }
  }

  if (imagePathsToRemove.length > 0) {
    const { error: cleanupError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(imagePathsToRemove);
    if (cleanupError) {
      console.error('delete-product: image cleanup failed after listing delete:', cleanupError.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ id: productId }) };
};
