import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode } from './_shared/platformFlags';

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

  // Early existence/ownership check for clear UX. The destructive authority is
  // still the atomic DB RPC below, which repeats ownership under a row lock.
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('sellerId')
    .eq('id', productId)
    .maybeSingle<{ sellerId: string }>();

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

  // Deliberately do not delete Storage objects here. Product image URLs can be
  // reused through the Add URL flow, and PostgreSQL + Supabase Storage cannot be
  // made one atomic transaction. Correctness therefore wins over eager cleanup:
  // orphaned owned media may be reclaimed later by a dedicated, delayed GC that
  // re-verifies references before deletion.
  return { statusCode: 200, body: JSON.stringify({ id: productId }) };
};
