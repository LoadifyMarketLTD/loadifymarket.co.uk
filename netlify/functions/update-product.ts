/**
 * update-product
 *
 * Serverless function for product/listing updates.
 * Enforces:
 *  - maintenanceMode → 503 for non-admin sellers
 *  - Ownership: only the seller who created the product (or admin) may update
 *
 * Payload (JSON body, POST only):
 *  {
 *    id (UUID, required),
 *    // Any updatable product fields
 *    shippingMethodIds? (string[]),
 *    dispatchTime? (string),
 *    lockedFieldsOnly? (boolean) — when true only non-critical fields are updated
 *  }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';

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
    auth: { persistSession: false },
  });

  // ── Authentication ────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }
  const token = authHeader.substring(7);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }
  const callerId = authData.user.id;

  // ── Rate limiting — 60 updates per hour per user ──────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'update_product_rate_limits',
    identifier:    callerId,
    windowMinutes: 60,
    maxAttempts:   60,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many listing updates. Please try again later.' }) };
  }

  // ── Role check ────────────────────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', callerId)
    .maybeSingle<{ role: string | null }>();
  const role = userRow?.role ?? null;

  if (role !== 'seller' && role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can update listings' }) };
  }

  const isAdmin = role === 'admin';

  // ── Maintenance mode (Step 5.2) ───────────────────────────────────────────
  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance && !isAdmin) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Platform is temporarily under maintenance. Listings cannot be modified right now.' }),
    };
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { id: productId, shippingMethodIds, dispatchTime, lockedFieldsOnly, ...updateFields } = body as {
    id: string;
    shippingMethodIds?: string[];
    dispatchTime?: string;
    lockedFieldsOnly?: boolean;
    [key: string]: unknown;
  };

  if (!productId) {
    return { statusCode: 400, body: JSON.stringify({ error: '"id" is required' }) };
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('sellerId')
    .eq('id', productId)
    .maybeSingle<{ sellerId: string }>();

  if (fetchError || !existingProduct) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }

  if (existingProduct.sellerId !== callerId && !isAdmin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to edit this listing' }) };
  }

  // ── Build update payload ──────────────────────────────────────────────────
  // Strip fields that should never be overwritten via this endpoint
  const updateData = { ...updateFields };
  delete updateData.id;
  delete updateData.sellerId;  // seller cannot change
  delete updateData.isApproved; // approval status is admin-managed
  delete updateData.createdAt;
  delete updateData.updatedAt;

  // When only non-critical fields can change (active orders exist), whitelist them
  let dataToUpdate: Record<string, unknown> = updateData;
  if (lockedFieldsOnly) {
    dataToUpdate = {
      description: updateData.description,
      images: updateData.images,
      specifications: updateData.specifications,
      weight: updateData.weight,
      dimensions: updateData.dimensions,
      palletInfo: updateData.palletInfo,
    };
    // Remove undefined values
    Object.keys(dataToUpdate).forEach((k) => {
      if (dataToUpdate[k] === undefined) delete dataToUpdate[k];
    });
  }

  if (Object.keys(dataToUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from('products')
      .update(dataToUpdate)
      .eq('id', productId);

    if (updateError) {
      console.error('update-product: update error:', updateError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update listing. Please try again.' }) };
    }
  }

  // ── Sync shipping methods ─────────────────────────────────────────────────
  if (Array.isArray(shippingMethodIds)) {
    // Delete existing, then re-insert
    await supabase.from('product_shipping').delete().eq('product_id', productId);
    if (shippingMethodIds.length > 0) {
      const rows = shippingMethodIds.map((method_id) => ({
        product_id: productId,
        method_id,
        dispatch_time: dispatchTime || null,
      }));
      const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
      if (shippingError) {
        console.error('update-product: shipping sync error:', shippingError.message);
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ id: productId }),
  };
};
