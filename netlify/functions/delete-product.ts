import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode } from './_shared/platformFlags';
import { PRODUCT_IMAGES_BUCKET, extractOwnedProductImagePath } from './_shared/productImagePaths';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
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

  const [ordersResult, orderItemsResult] = await Promise.all([
    supabase.from('orders').select('id').eq('productId', productId).limit(1),
    supabase.from('order_items').select('id').eq('productId', productId).limit(1),
  ]);

  // Fail closed: if retained-order history cannot be checked reliably, do not
  // attempt the destructive product delete and rely on a later FK error.
  if (ordersResult.error || orderItemsResult.error) {
    const reason = ordersResult.error?.message ?? orderItemsResult.error?.message ?? 'unknown precheck error';
    console.error('delete-product: retained-order history precheck failed:', reason);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unable to verify retained order history. Listing was not deleted.' }),
    };
  }

  const hasOrderHistory =
    (ordersResult.data?.length ?? 0) > 0 ||
    (orderItemsResult.data?.length ?? 0) > 0;

  if (hasOrderHistory) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: 'This listing has order history that must be retained. Keep it unpublished instead.',
        code: 'LISTING_HAS_ORDER_HISTORY',
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

  const imagePaths = [...new Set((product.images ?? [])
    .map((url) => extractOwnedProductImagePath(url, supabaseUrl, product.sellerId))
    .filter((path): path is string => Boolean(path)))];

  if (imagePaths.length > 0) {
    const { error: cleanupError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(imagePaths);
    if (cleanupError) {
      // The listing is already deleted. An orphaned object is safer than reporting
      // deletion as failed after the database operation has completed successfully.
      console.error('delete-product: image cleanup failed after listing delete:', cleanupError.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ id: productId }) };
};
