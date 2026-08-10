/**
 * create-product
 *
 * Serverless function responsible for all new product/listing inserts.
 * Moving this out of the client enforces platform flags server-side:
 *
 *  - maintenanceMode  → 503 for non-admin sellers
 *  - autoApproveProducts → backend sets isApproved (client cannot override)
 *  - seller activation → only fully active sellers may publish public listings
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode, getFeatureFlags } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';

const CREATE_ALLOWED_FIELDS = [
  'description',
  'type',
  'listingType',
  'condition',
  'categoryId',
  'subcategoryId',
  'stockQuantity',
  'stockStatus',
  'images',
  'specifications',
  'weight',
  'dimensions',
  'palletInfo',
  'logisticsInfo',
  'isHandmade',
  'isUnique',
  'artistName',
] as const;

function pickAllowedFields(source: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of CREATE_ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      picked[field] = source[field];
    }
  }
  return picked;
}

function parseStockQuantity(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw >= 0 ? raw : null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return Number.parseInt(trimmed, 10);
  }
  if (raw == null) return 0;
  return null;
}

function calculateStockStatus(listingContext: string, stockQuantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (listingContext === 'service') return 'in_stock';
  if (stockQuantity > 10) return 'in_stock';
  if (stockQuantity > 0) return 'low_stock';
  return 'out_of_stock';
}

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

  const rl = await checkRateLimit({
    supabase,
    tableName: 'create_product_rate_limits',
    identifier: callerId,
    windowMinutes: 60,
    maxAttempts: 20,
    policy: 'fail-soft',
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many listings created. Please try again later.' }) };
  }

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

  const maintenance = await isMaintenanceMode(supabase);
  if (maintenance && !isAdmin) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Platform is temporarily under maintenance. Listings cannot be created right now.' }),
    };
  }

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

  if (!title || typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
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

  if (Boolean(isActive) && normalizedListingContext === 'product' && (!Array.isArray(shippingMethodIds) || shippingMethodIds.length === 0)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Select at least one shipping method before publishing this product.' }),
    };
  }

  let sellerCanPublish = isAdmin;
  let sellerListingLimit: number | null = null;

  if (!isAdmin) {
    const { data: sellerProfile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('sellerStatus, stripeConnectStatus, isPaused, listingLimit')
      .eq('userId', callerId)
      .maybeSingle<{
        sellerStatus: string | null;
        stripeConnectStatus: string | null;
        isPaused: boolean | null;
        listingLimit: number | null;
      }>();

    if (profileError || !sellerProfile) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Complete your seller setup before creating listings.' }),
      };
    }

    sellerListingLimit = sellerProfile.listingLimit ?? null;
    sellerCanPublish =
      sellerProfile.sellerStatus === 'active' &&
      sellerProfile.stripeConnectStatus === 'active' &&
      sellerProfile.isPaused !== true;

    if (Boolean(isActive) && !sellerCanPublish) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: 'Complete seller setup and activate Stripe payments before publishing. You can still save the listing as a draft.',
        }),
      };
    }
  }

  const flags = await getFeatureFlags(supabase);
  const isApproved: boolean = isAdmin
    ? true
    : sellerCanPublish && Boolean(flags.autoApproveProducts);

  if (!isAdmin) {
    const countRes = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('sellerId', callerId);

    const currentCount = countRes.count ?? 0;
    if (sellerListingLimit !== null && currentCount >= sellerListingLimit) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: `Listing limit reached. You can have a maximum of ${sellerListingLimit} listing(s). Archive or delete existing listings to create new ones.`,
        }),
      };
    }
  }

  const vatRate = 0.20;
  const priceExVat = price / (1 + vatRate);
  const allowedFields = pickAllowedFields(rest);
  const parsedStockQuantity = parseStockQuantity(allowedFields.stockQuantity);
  if (parsedStockQuantity === null) {
    return { statusCode: 400, body: JSON.stringify({ error: 'stockQuantity must be a whole number greater than or equal to 0' }) };
  }
  const stockQuantity = normalizedListingContext === 'service' ? 0 : parsedStockQuantity;

  const productData: Record<string, unknown> = {
    ...allowedFields,
    title,
    price,
    priceExVat,
    vatRate,
    isActive: Boolean(isActive) && sellerCanPublish,
    isApproved,
    sellerId: callerId,
    listingContext: normalizedListingContext,
    stockQuantity,
    stockStatus: calculateStockStatus(normalizedListingContext, stockQuantity),
  };

  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert([productData])
    .select('id')
    .single();

  if (insertError) {
    console.error('create-product: insert error:', insertError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create listing. Please try again.' }) };
  }

  if (Array.isArray(shippingMethodIds) && shippingMethodIds.length > 0) {
    const rows = shippingMethodIds.map((method_id) => ({
      product_id: inserted.id,
      method_id,
      dispatch_time: dispatchTime || null,
    }));
    const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
    if (shippingError) {
      console.error('create-product: shipping sync error:', shippingError.message);
      await supabase.from('products').update({ isActive: false }).eq('id', inserted.id);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Listing was saved as a draft because shipping setup could not be saved. Please try again.' }),
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: inserted.id,
      isApproved,
      isActive: Boolean(productData.isActive),
    }),
  };
};
