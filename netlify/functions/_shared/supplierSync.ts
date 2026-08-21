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

export async function evaluateSupplierStockPrice(client: SupabaseClient, input: SupplierStockPriceDecisionInput): Promise<SupplierStockPriceDecision> {
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

export interface SupplierSyncPolicyInput {
  supplierOfferId: string;
  stockMaxAgeSeconds: number;
  priceMaxAgeSeconds: number;
  safetyStockQuantity?: number;
  allowUnknownQuantity?: boolean;
  policyVersion: number;
  status: 'draft' | 'approved';
  evidence: Record<string, unknown>;
}

export async function mutateSupplierSyncPolicy(
  client: SupabaseClient,
  actorId: string,
  input: SupplierSyncPolicyInput,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await client.rpc('server_admin_supplier_sync_policy_v1', {
      p_actor_id: actorId,
      p_supplier_offer_id: input.supplierOfferId,
      p_stock_max_age_seconds: input.stockMaxAgeSeconds,
      p_price_max_age_seconds: input.priceMaxAgeSeconds,
      p_safety_stock_quantity: input.safetyStockQuantity ?? 0,
      p_allow_unknown_quantity: input.allowUnknownQuantity ?? false,
      p_policy_version: input.policyVersion,
      p_status: input.status,
      p_evidence: input.evidence,
    });
    if (error) return { ok: false, error: error.message || 'supplier sync policy mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'supplier sync policy mutation failed' };
  }
}

export async function retireSupplierSyncPolicy(
  client: SupabaseClient,
  actorId: string,
  supplierOfferId: string,
  reason: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await client.rpc('server_admin_retire_supplier_sync_policy_v1', {
      p_actor_id: actorId,
      p_supplier_offer_id: supplierOfferId,
      p_reason: reason,
    });
    if (error) return { ok: false, error: error.message || 'supplier sync policy retirement failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'supplier sync policy retirement failed' };
  }
}

export async function readSupplierSyncStatus(
  client: SupabaseClient,
  actorId: string,
  input: Omit<SupplierStockPriceDecisionInput, 'canonicalProductId'>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await client.rpc('server_admin_supplier_sync_status_v1', {
      p_actor_id: actorId,
      p_supplier_offer_id: input.supplierOfferId,
      p_commercial_mode: input.commercialMode,
      p_territory: input.territory || 'GB',
      p_external_variant_ref: input.externalVariantRef || '',
    });
    if (error || !data || typeof data !== 'object') return { ok: false, error: error?.message || 'supplier sync status unavailable' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'supplier sync status unavailable' };
  }
}
