import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_CHECKOUT_INTERFACE_VERSION = 1;

export interface SupplierListingCheckoutDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: number;
  publicProductId?: string;
  commercialMode?: 'loadify_supplier_fulfilled';
  canonicalProductId?: string;
  supplierOfferId?: string;
  supplierId?: string;
  externalVariantRef?: string;
  pricingSnapshotId?: string;
  stockObservationId?: string;
  priceObservationId?: string;
  requestedQuantity?: number;
  sellableQuantity?: number;
  unitPricePence?: number;
  customerShippingChargePence?: number;
  taxAmountPence?: number;
  currency?: 'GBP';
  publicationVersion?: number;
  stockObservedAt?: string;
  priceObservedAt?: string;
  guard?: unknown;
}

function validSupplierCheckoutDecision(value: unknown): value is SupplierListingCheckoutDecision {
  if (!value || typeof value !== 'object') return false;
  const decision = value as Record<string, unknown>;
  if (
    typeof decision.eligible !== 'boolean'
    || typeof decision.reason !== 'string'
    || decision.interfaceVersion !== SUPPLIER_CHECKOUT_INTERFACE_VERSION
  ) return false;
  if (!decision.eligible) return true;

  return typeof decision.publicProductId === 'string'
    && decision.commercialMode === 'loadify_supplier_fulfilled'
    && typeof decision.canonicalProductId === 'string'
    && typeof decision.supplierOfferId === 'string'
    && typeof decision.supplierId === 'string'
    && typeof decision.externalVariantRef === 'string'
    && typeof decision.pricingSnapshotId === 'string'
    && typeof decision.stockObservationId === 'string'
    && typeof decision.priceObservationId === 'string'
    && typeof decision.requestedQuantity === 'number'
    && typeof decision.sellableQuantity === 'number'
    && typeof decision.unitPricePence === 'number'
    && typeof decision.customerShippingChargePence === 'number'
    && typeof decision.taxAmountPence === 'number'
    && decision.currency === 'GBP'
    && typeof decision.publicationVersion === 'number'
    && typeof decision.stockObservedAt === 'string'
    && typeof decision.priceObservedAt === 'string';
}

export async function evaluateSupplierListingCheckout(
  client: SupabaseClient,
  publicProductId: string,
  quantity: number,
): Promise<SupplierListingCheckoutDecision> {
  try {
    const { data, error } = await client.rpc('server_supplier_listing_checkout_decision_v1', {
      p_public_product_id: publicProductId,
      p_quantity: quantity,
    });
    if (error || !validSupplierCheckoutDecision(data)) {
      throw error || new Error('invalid supplier listing checkout evidence');
    }
    return data;
  } catch {
    return {
      eligible: false,
      reason: 'supplier_listing_checkout_unavailable',
      interfaceVersion: SUPPLIER_CHECKOUT_INTERFACE_VERSION,
    };
  }
}
