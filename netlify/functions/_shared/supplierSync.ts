import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_SYNC_INTERFACE_VERSION = 1;

export interface SupplierStockPriceDecisionInput {
  supplierOfferId: string;
  canonicalProductId: string;
  commercialMode: 'marketplace_seller' | 'loadify_supplier_fulfilled' | 'loadify_direct';
  territory?: string;
  externalVariantRef?: string;
}

export interface SupplierStockPriceDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: number;
  supplierOfferId?: string;
  canonicalProductId?: string;
  stockObservationId?: string;
  priceObservationId?: string;
  pricingSnapshotId?: string;
  availability?: 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';
  sellableQuantity?: number | null;
  supplierPriceMinor?: number;
  currency?: string;
  stockObservedAt?: string;
  priceObservedAt?: string;
  policyVersion?: number;
}

function validDecision(data: unknown): data is SupplierStockPriceDecision {
  if (!data || typeof data !== 'object') return false;
  const value = data as Record<string, unknown>;
  if (typeof value.eligible !== 'boolean' || typeof value.reason !== 'string' || value.interfaceVersion !== SUPPLIER_SYNC_INTERFACE_VERSION) return false;
  if (!value.eligible) return true;
  return typeof value.supplierOfferId === 'string'
    && typeof value.canonicalProductId === 'string'
    && typeof value.stockObservationId === 'string'
    && typeof value.priceObservationId === 'string'
    && typeof value.pricingSnapshotId === 'string'
    && typeof value.availability === 'string'
    && (typeof value.sellableQuantity === 'number' || value.sellableQuantity === null)
    && typeof value.supplierPriceMinor === 'number'
    && typeof value.currency === 'string'
    && typeof value.stockObservedAt === 'string'
    && typeof value.priceObservedAt === 'string'
    && typeof value.policyVersion === 'number';
}

export async function evaluateSupplierStockPrice(
  client: SupabaseClient,
  input: SupplierStockPriceDecisionInput,
): Promise<SupplierStockPriceDecision> {
  try {
    const { data, error } = await client.rpc('server_supplier_stock_price_decision_v1', {
      p_supplier_offer_id: input.supplierOfferId,
      p_canonical_product_id: input.canonicalProductId,
      p_commercial_mode: input.commercialMode,
      p_territory: input.territory || 'GB',
      p_external_variant_ref: input.externalVariantRef || '',
    });
    if (error || !validDecision(data)) throw error || new Error('invalid supplier sync evidence');
    return data;
  } catch {
    return { eligible: false, reason: 'supplier_sync_unavailable', interfaceVersion: SUPPLIER_SYNC_INTERFACE_VERSION };
  }
}

export async function evaluateSupplierCheckoutGuard(
  client: SupabaseClient,
  input: SupplierStockPriceDecisionInput,
): Promise<{ eligible: boolean; reason: string; interfaceVersion: number; sync?: SupplierStockPriceDecision }> {
  try {
    const { data, error } = await client.rpc('server_supplier_offer_checkout_guard_v1', {
      p_supplier_offer_id: input.supplierOfferId,
      p_canonical_product_id: input.canonicalProductId,
      p_commercial_mode: input.commercialMode,
      p_territory: input.territory || 'GB',
      p_external_variant_ref: input.externalVariantRef || '',
    });
    if (error || !data || typeof data !== 'object') throw error || new Error('invalid checkout guard evidence');
    const value = data as Record<string, unknown>;
    if (typeof value.eligible !== 'boolean' || typeof value.reason !== 'string' || value.interfaceVersion !== SUPPLIER_SYNC_INTERFACE_VERSION) {
      throw new Error('invalid checkout guard evidence');
    }
    return data as { eligible: boolean; reason: string; interfaceVersion: number; sync?: SupplierStockPriceDecision };
  } catch {
    return { eligible: false, reason: 'supplier_checkout_guard_unavailable', interfaceVersion: SUPPLIER_SYNC_INTERFACE_VERSION };
  }
}
