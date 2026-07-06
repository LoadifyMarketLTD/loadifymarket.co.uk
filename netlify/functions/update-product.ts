/**
 * update-product
 *
 * Serverless function for product/listing updates.
 * Enforces:
 *  - maintenanceMode → 503 for non-admin sellers
 *  - Ownership: only the seller who created the product (or admin) may update
 *  - Stock derivation: stockStatus is auto-computed from listingContext + stockQuantity
 *  - Listing lock enforcement: critical fields cannot change when paid/packed/shipped orders exist
 *
 * Payload (JSON body, POST only):
 *  {
 *    id (UUID, required),
 *    // Any updatable product fields
 *    shippingMethodIds? (string[]),
 *    dispatchTime? (string),
 *    lockedFieldsOnly? (boolean) — when true only non-critical fields are updated
 *  }
 *
 * listingContext accepted values:
 *   'product' — canonical physical listing (production DB value)
 *   'goods'   — legacy alias accepted as a physical listing (stored as-is)
 *   'service' — no stock or shipping required
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';
import {
  deriveSellerListingLocks,
  formatSellerListingLockReason,
  SELLER_LISTING_LOCK_STATUSES,
} from '../../src/lib/listingLocks';

const LOCKED_CRITICAL_FIELDS = ['title', 'type', 'condition', 'price', 'listingContext', 'stockQuantity', 'stockStatus'] as const;
const UPDATE_ALLOWED_FIELDS = [
  'title',
  'description',
  'type',
  'listingType',
  'condition',
  'price',
  'categoryId',
  'subcategoryId',
  'listingContext',
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
  'isActive',
] as const;

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pickAllowedFields(source: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of UPDATE_ALLOWED_FIELDS) {
    if (hasOwn(source, field)) {
      picked[field] = source[field];
    }
  }
  return picked;
}

function parseStockQuantity(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) ? raw : null;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) {
      return null;
    }

    return Number.parseInt(trimmed, 10);
  }

  return null;
}

/**
 * Returns true for physical listing contexts ('product' and the legacy alias 'goods').
 * Returns false for 'service'.
 */
function isPhysicalContext(value: unknown): boolean {
  return value === 'product' || value === 'goods';
}

/**
 * Validates the raw listingContext value.
 * Accepts 'product', 'goods' (legacy alias), and 'service'.
 * Returns the value unchanged so callers preserve the original string.
 */
function validateListingContext(value: unknown): 'product' | 'goods' | 'service' | null {
  if (value === 'service') return 'service';
  if (value === 'product') return 'product';
  if (value === 'goods') return 'goods';
  return null;
}

function calculateStockStatus(listingContext: string, stockQuantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (listingContext === 'service') {
    return 'in_stock';
  }

  if (stockQuantity > 10) {
    return 'in_stock';
  }

  if (stockQuantity > 0) {
    return 'low_stock';
  }

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
    policy:        'fail-soft',
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

  // ── Maintenance mode ──────────────────────────────────────────────────────
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

  // ── Ownership + stock/lock context fetch ──────────────────────────────────
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('sellerId, title, type, condition, price, listingContext, stockQuantity, stockStatus, listingStatus, reservedUntil')
    .eq('id', productId)
    .maybeSingle<{
      sellerId: string;
      title: string | null;
      type: string | null;
      condition: string | null;
      price: number | null;
      listingContext: string | null;
      stockQuantity: number | null;
      stockStatus: string | null;
      listingStatus: string | null;
      reservedUntil: string | null;
    }>();

  if (fetchError || !existingProduct) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }

  if (existingProduct.sellerId !== callerId && !isAdmin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to edit this listing' }) };
  }

  // ── Build update payload ──────────────────────────────────────────────────
  const updateData = pickAllowedFields(updateFields);

  if (hasOwn(updateData, 'price')) {
    const nextPrice = updateData.price;
    if (typeof nextPrice !== 'number' || !Number.isFinite(nextPrice) || nextPrice <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'price must be a positive number' }) };
    }
    updateData.priceExVat = nextPrice / 1.20;
    updateData.vatRate = 0.20;
  }

  // ── Validate and resolve listingContext ───────────────────────────────────
  // The incoming listingContext (if provided) is validated but kept as-is.
  // 'product' is the canonical DB value; 'goods' is a supported legacy alias.
  const incomingContext = hasOwn(updateData, 'listingContext')
    ? validateListingContext(updateData.listingContext)
    : validateListingContext(existingProduct.listingContext ?? 'product');

  if (!incomingContext) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'listingContext must be either "product" or "service"' }),
    };
  }

  const nextListingContext = incomingContext;

  // ── Stock quantity derivation ─────────────────────────────────────────────
  const stockQuantityWasProvided = hasOwn(updateData, 'stockQuantity');
  let normalizedStockQuantity = existingProduct.stockQuantity ?? 0;

  if (nextListingContext === 'service') {
    normalizedStockQuantity = 0;
  } else if (stockQuantityWasProvided) {
    const parsedStockQuantity = parseStockQuantity(updateData.stockQuantity);
    if (parsedStockQuantity === null || parsedStockQuantity < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'stockQuantity must be a valid integer greater than or equal to 0 for product listings' }),
      };
    }
    normalizedStockQuantity = parsedStockQuantity;
  }

  const stockFieldsWereRequested = hasOwn(updateData, 'listingContext') || stockQuantityWasProvided || hasOwn(updateData, 'stockStatus');

  if (hasOwn(updateData, 'listingContext')) {
    updateData.listingContext = nextListingContext;
  }

  if (stockFieldsWereRequested) {
    updateData.stockQuantity = normalizedStockQuantity;
    updateData.stockStatus = calculateStockStatus(nextListingContext, normalizedStockQuantity);
  }

  const publishingPhysicalListing =
    updateData.isActive === true &&
    isPhysicalContext(nextListingContext) &&
    Array.isArray(shippingMethodIds) &&
    shippingMethodIds.length === 0;

  if (publishingPhysicalListing) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Select at least one shipping method before publishing this product.' }),
    };
  }

  // ── Listing lock enforcement ──────────────────────────────────────────────
  const { data: orderLocks } = await supabase
    .from('orders')
    .select('id, orderNumber, status, createdAt')
    .eq('productId', productId)
    .in('status', [...SELLER_LISTING_LOCK_STATUSES]);

  const listingLocks = isAdmin
    ? []
    : deriveSellerListingLocks({
        orders: orderLocks ?? [],
        product: {
          listingStatus: existingProduct.listingStatus ?? null,
          reservedUntil: existingProduct.reservedUntil ?? null,
        },
      });

  const criticalFieldChanged = LOCKED_CRITICAL_FIELDS.some((field) => {
    if (!hasOwn(updateData, field)) return false;

    const nextValue = updateData[field];
    const currentValue = existingProduct[field] ?? null;

    // Treat 'product' and 'goods' as equivalent for the listingContext lock check
    if (field === 'listingContext') {
      return !(isPhysicalContext(nextValue) && isPhysicalContext(currentValue));
    }


    return nextValue !== currentValue;
  });

  if (!isAdmin && listingLocks.length > 0 && criticalFieldChanged) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: `Stock quantity cannot be changed because this listing is locked by ${formatSellerListingLockReason(listingLocks)}.`,
        code: 'LISTING_LOCKED',
        locks: listingLocks,
      }),
    };
  }

  // When only non-critical fields can change (active orders exist), whitelist them
  let dataToUpdate: Record<string, unknown> = updateData;
  if (lockedFieldsOnly && listingLocks.length > 0 && !isAdmin) {
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
