import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_FOUNDATION_INTERFACE_VERSION = 1 as const;

export type SupplierFoundationDecision = {
  eligible: boolean;
  reason: string;
  supplierId?: string;
  supplierKey?: string;
  lifecycleStatus?: string;
  missingEvidence?: string[];
  slaVersion?: number;
  complianceVersion?: number;
  interfaceVersion: typeof SUPPLIER_FOUNDATION_INTERFACE_VERSION;
};

export type SupplierFoundationAdminAction =
  | 'upsert_supplier'
  | 'set_lifecycle'
  | 'set_qualification'
  | 'activate_sla'
  | 'set_compliance'
  | 'record_provenance'
  | 'register_adapter';

function isDecision(value: unknown): value is SupplierFoundationDecision {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.eligible === 'boolean'
    && typeof candidate.reason === 'string'
    && candidate.interfaceVersion === SUPPLIER_FOUNDATION_INTERFACE_VERSION
  );
}

export async function evaluateSupplierFoundation(
  admin: SupabaseClient,
  supplierKey: string,
  options: { territory?: string; requiredCapability?: string } = {},
): Promise<SupplierFoundationDecision> {
  try {
    const { data, error } = await admin.rpc('server_supplier_foundation_decision_v1', {
      p_supplier_key: supplierKey,
      p_territory: options.territory ?? 'GB',
      p_required_capability: options.requiredCapability ?? null,
    });
    if (error || !isDecision(data)) {
      return {
        eligible: false,
        reason: 'supplier_foundation_unavailable',
        interfaceVersion: SUPPLIER_FOUNDATION_INTERFACE_VERSION,
      };
    }
    return data;
  } catch {
    return {
      eligible: false,
      reason: 'supplier_foundation_unavailable',
      interfaceVersion: SUPPLIER_FOUNDATION_INTERFACE_VERSION,
    };
  }
}

export async function mutateSupplierFoundation(
  admin: SupabaseClient,
  actorId: string,
  action: SupplierFoundationAdminAction,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const { data, error } = await admin.rpc('server_admin_supplier_foundation_v1', {
      p_actor_id: actorId,
      p_action: action,
      p_payload: payload,
    });
    if (error) return { ok: false, error: error.message || 'Supplier foundation mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Supplier foundation mutation failed' };
  }
}
