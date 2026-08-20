/**
 * update-product — authenticated seller/admin listing updates.
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { isMaintenanceMode } from './_shared/platformFlags';
import { checkRateLimit } from './_shared/rateLimiter';
import {
  buildSellerNonVatProductEvidence,
  normaliseMarketplaceCountry,
} from './_shared/marketplaceTax';
import {
  deriveSellerListingLocks,
  formatSellerListingLockReason,
  SELLER_LISTING_LOCK_STATUSES,
} from '../../src/lib/listingLocks';

const LOCKED_CRITICAL_FIELDS = ['title', 'type', 'condition', 'price', 'listingContext', 'stockQuantity', 'stockStatus'] as const;
const UPDATE_ALLOWED_FIELDS = [
  'title', 'description', 'type', 'listingType', 'condition', 'price',
  'categoryId', 'subcategoryId', 'listingContext', 'stockQuantity', 'stockStatus',
  'images', 'specifications', 'weight', 'dimensions', 'palletInfo', 'logisticsInfo',
  'isHandmade', 'isUnique', 'artistName', 'isActive',
] as const;

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pickAllowedFields(source: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of UPDATE_ALLOWED_FIELDS) if (hasOwn(source, field)) picked[field] = source[field];
  return picked;
}

function parseStockQuantity(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isInteger(raw) && raw >= 0 ? raw : null;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number.parseInt(raw.trim(), 10);
  return null;
}

function normaliseListingContext(value: unknown): 'product' | 'service' | null {
  if (value === 'service') return 'service';
  if (value === 'product' || value === 'goods') return 'product';
  return null;
}

function calculateStockStatus(context: 'product' | 'service', quantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (context === 'service') return 'in_stock';
  if (quantity > 10) return 'in_stock';
  if (quantity > 0) return 'low_stock';
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
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const auth = await authenticateActiveAccount(event, supabase, ['seller', 'admin']);
  if (!auth.ok) {
    return {
      statusCode: auth.status,
      body: JSON.stringify({
        error: auth.status === 401 ? 'Authentication required' : 'Only active sellers can update listings',
      }),
    };
  }

  const callerId = auth.actor.id;
  const role = auth.actor.role;
  const isAdmin = role === 'admin';

  const rl = await checkRateLimit({
    supabase,
    tableName: 'update_product_rate_limits',
    identifier: callerId,
    windowMinutes: 60,
    maxAttempts: 60,
    policy: 'fail-closed',
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many listing updates. Please try again later.' }) };
  }

  if (await isMaintenanceMode(supabase) && !isAdmin) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Platform is temporarily under maintenance. Listings cannot be modified right now.' }) };
  }

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
  if (!productId) return { statusCode: 400, body: JSON.stringify({ error: '"id" is required' }) };

  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('sellerId, title, type, condition, price, priceExVat, vatRate, taxTreatmentStatus, taxTreatmentSource, taxEvidenceVersion, taxEvidenceCapturedAt, listingContext, stockQuantity, stockStatus, listingStatus, reservedUntil, isActive')
    .eq('id', productId)
    .maybeSingle<{
      sellerId: string;
      title: string | null;
      type: string | null;
      condition: string | null;
      price: number | null;
      priceExVat: number | null;
      vatRate: number | null;
      taxTreatmentStatus: string | null;
      taxTreatmentSource: string | null;
      taxEvidenceVersion: number | null;
      taxEvidenceCapturedAt: string | null;
      listingContext: string | null;
      stockQuantity: number | null;
      stockStatus: string | null;
      listingStatus: string | null;
      reservedUntil: string | null;
      isActive: boolean;
    }>();
  if (fetchError || !existingProduct) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Product not found' }) };
  }
  if (!isAdmin && existingProduct.sellerId !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to edit this listing' }) };
  }

  let sellerCanPublish = isAdmin;
  if (!isAdmin) {
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('sellerStatus, stripeConnectStatus, isPaused')
      .eq('userId', callerId)
      .maybeSingle<{ sellerStatus: string | null; stripeConnectStatus: string | null; isPaused: boolean | null }>();
    if (profileError || !profile) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Complete your seller setup before updating listings.' }) };
    }
    sellerCanPublish = profile.sellerStatus === 'active'
      && profile.stripeConnectStatus === 'active'
      && profile.isPaused !== true;
  }

  const updateData = pickAllowedFields(updateFields);
  const nextContext = normaliseListingContext(
    hasOwn(updateData, 'listingContext') ? updateData.listingContext : existingProduct.listingContext ?? 'product',
  );
  if (!nextContext) {
    return { statusCode: 400, body: JSON.stringify({ error: 'listingContext must be either "product" or "service"' }) };
  }
  // Never persist the legacy "goods" alias into a DB constrained to product/service.
  if (hasOwn(updateData, 'listingContext')) updateData.listingContext = nextContext;

  let nextPrice = existingProduct.price;
  if (hasOwn(updateData, 'price')) {
    const rawPrice = updateData.price;
    if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice) || rawPrice <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'price must be a positive number' }) };
    }
    nextPrice = rawPrice;
  }
  if (typeof nextPrice !== 'number' || !Number.isFinite(nextPrice) || nextPrice <= 0) {
    return { statusCode: 409, body: JSON.stringify({ error: 'The listing has an invalid price and cannot be updated.' }) };
  }

  const { data: taxProfile, error: taxProfileError } = await supabase
    .from('seller_profiles')
    .select('country, isVatRegistered, vatNumber')
    .eq('userId', existingProduct.sellerId)
    .maybeSingle<{
      country: string | null;
      isVatRegistered: boolean | null;
      vatNumber: string | null;
    }>();
  if (taxProfileError || !taxProfile) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to verify seller tax profile. Please try again.' }) };
  }

  const taxEvidence =
    nextContext === 'product' &&
    normaliseMarketplaceCountry(taxProfile.country) === 'GB' &&
    taxProfile.isVatRegistered === false &&
    !taxProfile.vatNumber?.trim()
      ? buildSellerNonVatProductEvidence(nextPrice)
      : null;

  updateData.priceExVat = taxEvidence?.priceExVat ?? null;
  updateData.vatRate = taxEvidence?.vatRate ?? null;
  updateData.taxTreatmentStatus = taxEvidence?.taxTreatmentStatus ?? null;
  updateData.taxTreatmentSource = taxEvidence?.taxTreatmentSource ?? null;
  updateData.taxEvidenceVersion = taxEvidence?.taxEvidenceVersion ?? null;
  updateData.taxEvidenceCapturedAt = taxEvidence?.taxEvidenceCapturedAt ?? null;

  const stockQuantityWasProvided = hasOwn(updateData, 'stockQuantity');
  let normalizedStockQuantity = existingProduct.stockQuantity ?? 0;
  if (nextContext === 'service') {
    normalizedStockQuantity = 0;
  } else if (stockQuantityWasProvided) {
    const parsed = parseStockQuantity(updateData.stockQuantity);
    if (parsed === null) {
      return { statusCode: 400, body: JSON.stringify({ error: 'stockQuantity must be a whole number greater than or equal to 0' }) };
    }
    normalizedStockQuantity = parsed;
  }

  if (hasOwn(updateData, 'listingContext') || stockQuantityWasProvided || hasOwn(updateData, 'stockStatus')) {
    updateData.stockQuantity = normalizedStockQuantity;
    updateData.stockStatus = calculateStockStatus(nextContext, normalizedStockQuantity);
  }

  const wantsPublished = updateData.isActive === true || (!hasOwn(updateData, 'isActive') && existingProduct.isActive);
  if (wantsPublished && !sellerCanPublish) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Complete seller setup and activate Stripe payments before publishing.' }) };
  }
  if (wantsPublished && nextContext === 'product' && !taxEvidence) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: 'This listing cannot be published until the seller tax profile is complete and its VAT treatment is supported.',
        code: 'TAX_EVIDENCE_REQUIRED',
      }),
    };
  }

  if (wantsPublished && nextContext === 'product') {
    let shippingCount = 0;
    if (Array.isArray(shippingMethodIds)) {
      shippingCount = shippingMethodIds.length;
    } else {
      const { count, error: shippingCountError } = await supabase
        .from('product_shipping')
        .select('product_id', { count: 'exact', head: true })
        .eq('product_id', productId);
      if (shippingCountError) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Unable to validate shipping setup.' }) };
      }
      shippingCount = count ?? 0;
    }
    if (shippingCount === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Select at least one shipping method before publishing this product.' }) };
    }
  }

  const { data: orderLocks } = await supabase
    .from('orders')
    .select('id, orderNumber, status, createdAt')
    .eq('productId', productId)
    .in('status', [...SELLER_LISTING_LOCK_STATUSES]);

  const listingLocks = isAdmin ? [] : deriveSellerListingLocks({
    orders: orderLocks ?? [],
    product: {
      listingStatus: existingProduct.listingStatus ?? null,
      reservedUntil: existingProduct.reservedUntil ?? null,
    },
  });

  const criticalFieldChanged = LOCKED_CRITICAL_FIELDS.some((field) => {
    if (!hasOwn(updateData, field)) return false;
    const next = updateData[field];
    const current = field === 'listingContext'
      ? normaliseListingContext(existingProduct.listingContext ?? 'product')
      : existingProduct[field] ?? null;
    return next !== current;
  });

  if (!isAdmin && listingLocks.length > 0 && criticalFieldChanged) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: `This listing is locked by ${formatSellerListingLockReason(listingLocks)}.`,
        code: 'LISTING_LOCKED',
        locks: listingLocks,
      }),
    };
  }

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
    Object.keys(dataToUpdate).forEach((key) => {
      if (dataToUpdate[key] === undefined) delete dataToUpdate[key];
    });
  }

  // Save shipping first. If that fails, the listing itself remains unchanged.
  if (Array.isArray(shippingMethodIds)) {
    const { data: previousShipping, error: previousError } = await supabase
      .from('product_shipping')
      .select('method_id, dispatch_time')
      .eq('product_id', productId);
    if (previousError) return { statusCode: 500, body: JSON.stringify({ error: 'Unable to update shipping setup.' }) };

    const { error: deleteError } = await supabase.from('product_shipping').delete().eq('product_id', productId);
    if (deleteError) return { statusCode: 500, body: JSON.stringify({ error: 'Unable to update shipping setup.' }) };

    if (shippingMethodIds.length > 0) {
      const rows = shippingMethodIds.map((method_id) => ({ product_id: productId, method_id, dispatch_time: dispatchTime || null }));
      const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
      if (shippingError) {
        if (previousShipping?.length) {
          await supabase.from('product_shipping').insert(
            previousShipping.map((row) => ({ product_id: productId, method_id: row.method_id, dispatch_time: row.dispatch_time })),
          );
        }
        return { statusCode: 500, body: JSON.stringify({ error: 'Shipping setup could not be saved; listing changes were not applied.' }) };
      }
    }
  }

  if (Object.keys(dataToUpdate).length > 0) {
    const { error: updateError } = await supabase.from('products').update(dataToUpdate).eq('id', productId);
    if (updateError) {
      console.error('update-product: update failed:', updateError.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update listing. Please try again.' }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ id: productId }) };
};
