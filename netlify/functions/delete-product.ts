import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode } from './_shared/platformFlags';
import { PRODUCT_IMAGES_BUCKET, extractOwnedProductImagePath } from './_shared/productImagePaths';

const RETAINED_HISTORY_CHECKS = [
  { table: 'orders', column: 'productId' },
  { table: 'order_items', column: 'productId' },
  { table: 'offers', column: 'listingId' },
  { table: 'product_offers', column: 'productId' },
  { table: 'product_questions', column: 'productId' },
  { table: 'reviews', column: 'productId' },
  { table: 'reported_listings', column: 'productId' },
] as const;

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

  const retainedChecks = await Promise.all(
    RETAINED_HISTORY_CHECKS.map(({ table, column }) =>
      supabase.from(table).select('id').eq(column, productId).limit(1),
    ),
  );

  const precheckError = retainedChecks.find((result) => result.error)?.error;
  if (precheckError) {
    console.error('delete-product: retained marketplace history precheck failed:', precheckError.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unable to verify retained marketplace history. Listing was not deleted.' }),
    };
  }

  if (retainedChecks.some((result) => (result.data?.length ?? 0) > 0)) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: 'This listing has marketplace history that must be retained. Keep it unpublished instead.',
        code: 'LISTING_HAS_RETAINED_HISTORY',
      }),
    };
  }

  const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
  if (deleteError) {
    if (deleteError.code === '23503') {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: 'This listing is linked to retained marketplace records and cannot be deleted. Keep it unpublished instead.',
          code: 'LISTING_HAS_RETAINED_RECORDS',
        }),
      };
    }
    console.error('delete-product: product delete failed:', deleteError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete listing. Please try again.' }) };
  }

  const imagePaths = [...new Set(
    (product.images ?? [])
      .map((url) => extractOwnedProductImagePath(url, supabaseUrl, product.sellerId))
      .filter((path): path is string => Boolean(path)),
  )];

  if (imagePaths.length > 0) {
    const { error: cleanupError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(imagePaths);
    if (cleanupError) {
      // The DB deletion is already complete. An orphaned object is safer than
      // reporting a false deletion failure after the destructive operation.
      console.error('delete-product: image cleanup failed after listing delete:', cleanupError.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ id: productId }) };
};
