/**
 * create-product
 *
 * Serverless function responsible for all new product/listing inserts.
 * Moving this out of the client enforces platform flags server-side:
 *
 *  - maintenanceMode  → 503 for non-admin sellers
 *  - autoApproveProducts → backend sets isApproved (client cannot override)
 *
 * Payload (JSON body, POST only):
 *  {
 *    title, description, type, condition, price (number, VAT-inclusive),
 *    stockQuantity, stockStatus?, categoryId?, subcategoryId?,
 *    images?, specifications?, weight?, dimensions?, palletInfo?,
 *    isActive (boolean — publish vs draft),
 *    listingContext? ('goods' | 'service', default 'goods'),
 *    shippingMethodIds? (string[]),
 *    dispatchTime? (string),
 *    // any other valid products column
 *  }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode, getFeatureFlags } from './_shared/platformFlags';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  // Service-role client — bypasses RLS so the function is authoritative.
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

  // ── Role check ────────────────────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', callerId)
    .maybeSingle<{ role: string | null }>();
  const role = userRow?.role ?? null;

  if (role !== 'seller' && role !== 'admin' && role !== 'owner') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can create listings' }) };
  }

  const isAdmin = role === 'admin' || role === 'owner';

  // ── Maintenance mode (Step 5.2) ───────────────────────────────────────────
  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance && !isAdmin) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Platform is temporarily under maintenance. Listings cannot be created right now.' }),
    };
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const {
    title,
    price,
    isActive,
    shippingMethodIds,
    dispatchTime,
    listingContext,
    ...rest
  } = body as {
    title: string;
    price: number;
    isActive: boolean;
    shippingMethodIds?: string[];
    dispatchTime?: string;
    listingContext?: string;
    [key: string]: unknown;
  };

  if (!title || typeof price !== 'number' || price < 0) {
    return { statusCode: 400, body: JSON.stringify({ error: '"title" and a positive "price" are required' }) };
  }

  // ── autoApproveProducts (Step 5.5) ────────────────────────────────────────
  const flags = await getFeatureFlags(supabase);
  // Admin creates are always approved; sellers depend on the flag
  const isApproved: boolean = isAdmin ? true : Boolean(flags.autoApproveProducts);

  // VAT calculation (UK 20%)
  const vatRate = 0.20;
  const priceExVat = price / (1 + vatRate);

  // Build DB row — strip out fields the client must not control
  const productData: Record<string, unknown> = {
    ...rest,
    title,
    price,
    priceExVat,
    vatRate,
    isActive: Boolean(isActive),
    isApproved,              // backend-only; overrides any value from client
    sellerId: callerId,
    listingContext: listingContext === 'service' ? 'service' : 'goods',
  };
  // Prevent client from sneaking in fields that would break integrity
  delete productData.id;
  delete productData.createdAt;
  delete productData.updatedAt;

  // ── Insert product ────────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert([productData])
    .select('id')
    .single();

  if (insertError) {
    console.error('create-product: insert error:', insertError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create listing. Please try again.' }) };
  }

  // ── Sync shipping methods ─────────────────────────────────────────────────
  if (Array.isArray(shippingMethodIds) && shippingMethodIds.length > 0) {
    const rows = shippingMethodIds.map((method_id) => ({
      product_id: inserted.id,
      method_id,
      dispatch_time: dispatchTime || null,
    }));
    const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
    if (shippingError) {
      console.error('create-product: shipping sync error:', shippingError.message);
      // Non-fatal — product created, shipping sync failed
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ id: inserted.id, isApproved }),
  };
};
