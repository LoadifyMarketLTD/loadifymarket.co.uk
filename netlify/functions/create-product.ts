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
 *    listingContext? ('product' | 'service', default 'product'),
 *    shippingMethodIds? (string[]),
 *    dispatchTime? (string),
 *    // any other valid products column
 *  }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode, getFeatureFlags } from './_shared/platformFlags';
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

  // ── Rate limiting — 20 listings per hour per user ─────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'create_product_rate_limits',
    identifier:    callerId,
    windowMinutes: 60,
    maxAttempts:   20,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many listings created. Please try again later.' }) };
  }

  // ── Role check ────────────────────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', callerId)
    .maybeSingle<{ role: string | null }>();
  const role = userRow?.role ?? null;

  if (role !== 'seller' && role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only sellers can create listings' }) };
  }

  const isAdmin = role === 'admin';

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

  const normalizedListingContext =
    listingContext === 'service'
      ? 'service'
      : listingContext === 'product' || listingContext === 'goods' || listingContext == null
        ? 'product'
        : null;

  if (!normalizedListingContext) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid listingContext. Allowed values: product, service.' }),
    };
  }

  // ── autoApproveProducts (Step 5.5) ────────────────────────────────────────
  const flags = await getFeatureFlags(supabase);
  // Admin creates are always approved; sellers depend on the flag
  const isApproved: boolean = isAdmin ? true : Boolean(flags.autoApproveProducts);

  // ── Listing limit check ───────────────────────────────────────────────────
  // Non-admin sellers are capped by seller_profiles.listingLimit (default 5).
  // Count all their existing listings regardless of isActive — drafts use up
  // capacity the same as published ones, preventing limit circumvention.
  if (!isAdmin) {
    const [profileRes, countRes] = await Promise.all([
      supabase
        .from('seller_profiles')
        .select('listingLimit')
        .eq('userId', callerId)
        .maybeSingle<{ listingLimit: number | null }>(),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('sellerId', callerId),
    ]);

    const limit = profileRes.data?.listingLimit ?? null;
    const currentCount = countRes.count ?? 0;

    // A limit of 0 intentionally blocks all new listings (e.g., can be used
    // as a lightweight admin tool to freeze a seller's listings without
    // suspending their account). Use a large listingLimit value for "unlimited".
    if (limit !== null && currentCount >= limit) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: `Listing limit reached. You can have a maximum of ${limit} listing(s). Archive or delete existing listings to create new ones.`,
        }),
      };
    }
  }

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
    listingContext: normalizedListingContext,
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
