import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_ECONOMICS_INTERFACE_VERSION = 1;

export interface SupplierEconomicsDecisionInput {
  supplierOfferId: string;
  canonicalProductId: string;
  commercialMode: 'marketplace_seller' | 'loadify_supplier_fulfilled' | 'loadify_direct';
  territory?: string;
}

export interface SupplierEconomicsDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: number;
  supplierOfferId?: string;
  canonicalProductId?: string;
  pricingSnapshotId?: string;
  landedCostSnapshotId?: string;
  taxRuleVersionId?: string;
  currency?: string;
  grossCustomerPrice?: number;
  pricingPolicyVersion?: number;
}

function validDecision(data: unknown): data is SupplierEconomicsDecision {
  if (!data || typeof data !== 'object') return false;
  const v = data as Record<string, unknown>;
  if (typeof v.eligible !== 'boolean' || typeof v.reason !== 'string' || v.interfaceVersion !== SUPPLIER_ECONOMICS_INTERFACE_VERSION) return false;
  if (!v.eligible) return true;
  return typeof v.supplierOfferId === 'string'
    && typeof v.canonicalProductId === 'string'
    && typeof v.pricingSnapshotId === 'string'
    && typeof v.landedCostSnapshotId === 'string'
    && typeof v.taxRuleVersionId === 'string'
    && typeof v.currency === 'string'
    && typeof v.grossCustomerPrice === 'number'
    && typeof v.pricingPolicyVersion === 'number';
}

export async function evaluateSupplierEconomics(
  client: SupabaseClient,
  input: SupplierEconomicsDecisionInput,
): Promise<SupplierEconomicsDecision> {
  try {
    const { data, error } = await client.rpc('server_supplier_commercial_decision_v1', {
      p_supplier_offer_id: input.supplierOfferId,
      p_canonical_product_id: input.canonicalProductId,
      p_commercial_mode: input.commercialMode,
      p_territory: input.territory || 'GB',
    });
    if (error || !validDecision(data)) throw error || new Error('invalid commercial economics evidence');
    return data;
  } catch {
    return {
      eligible: false,
      reason: 'supplier_economics_unavailable',
      interfaceVersion: SUPPLIER_ECONOMICS_INTERFACE_VERSION,
    };
  }
}

export type SupplierEconomicsAdminAction = 'record_tax_rule' | 'record_landed_cost' | 'record_pricing';

export async function mutateSupplierEconomics(
  client: SupabaseClient,
  actorId: string,
  action: SupplierEconomicsAdminAction,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await client.rpc('server_admin_supplier_economics_v1', {
      p_actor_id: actorId,
      p_action: action,
      p_payload: payload,
    });
    if (error) return { ok: false, error: error.message || 'supplier economics mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'supplier economics mutation failed' };
  }
}
