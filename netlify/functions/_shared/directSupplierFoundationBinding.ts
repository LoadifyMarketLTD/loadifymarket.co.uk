import type { SupabaseClient } from '@supabase/supabase-js';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const DIRECT_SUPPLIER_KEY_RE = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NON_APPROVED_LIFECYCLES = new Set([
  'candidate',
  'verification',
  'restricted',
  'suspended',
  'banned',
]);

const APPROVED_NOT_READY_REASONS = new Set([
  'qualification_incomplete',
  'active_sla_missing',
  'compliance_not_approved',
  'adapter_capability_missing',
]);

export interface DirectSupplierFoundationBindingV1 {
  interfaceVersion: 1;
  supplierKey: string;
  supplierFound: boolean;
  supplierId?: string;
  lifecycleStatus?: 'candidate' | 'verification' | 'approved' | 'restricted' | 'suspended' | 'banned';
  foundationReason:
    | 'supplier_not_found'
    | 'supplier_not_approved'
    | 'qualification_incomplete'
    | 'active_sla_missing'
    | 'compliance_not_approved'
    | 'adapter_capability_missing'
    | 'supplier_foundation_ready';
  identityCaptureAllowed: boolean;
  canonicalImportBatchCreationAllowed: boolean;
  supplierFoundationReady: boolean;
  foundationMutationPerformed: false;
  canonicalIdentityMutationPerformed: false;
  canonicalImportBatchCreationPerformed: false;
  commercialActivationPerformed: false;
  capabilityPromotionPerformed: false;
  marketplaceListingPerformed: false;
}

export type DirectSupplierFoundationBindingResult =
  | { ok: true; binding: DirectSupplierFoundationBindingV1 }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function baseBinding(input: {
  supplierKey: string;
  supplierFound: boolean;
  supplierId?: string;
  lifecycleStatus?: DirectSupplierFoundationBindingV1['lifecycleStatus'];
  foundationReason: DirectSupplierFoundationBindingV1['foundationReason'];
  identityCaptureAllowed: boolean;
  canonicalImportBatchCreationAllowed: boolean;
  supplierFoundationReady: boolean;
}): DirectSupplierFoundationBindingV1 {
  return {
    interfaceVersion: 1,
    supplierKey: input.supplierKey,
    supplierFound: input.supplierFound,
    supplierId: input.supplierId,
    lifecycleStatus: input.lifecycleStatus,
    foundationReason: input.foundationReason,
    identityCaptureAllowed: input.identityCaptureAllowed,
    canonicalImportBatchCreationAllowed: input.canonicalImportBatchCreationAllowed,
    supplierFoundationReady: input.supplierFoundationReady,
    foundationMutationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}

/**
 * Resolves one staged Direct Supplier key against the existing provider-neutral
 * Supplier Foundation decision surface without mutating foundation/catalog/import
 * state. This deliberately distinguishes identity-capture eligibility from the
 * stricter Phase F import-batch and full Supplier Foundation readiness gates.
 */
export async function resolveDirectSupplierFoundationBinding(
  client: RpcClient,
  supplierKeyInput: string,
): Promise<DirectSupplierFoundationBindingResult> {
  const supplierKey = supplierKeyInput.trim().toLowerCase();
  if (!DIRECT_SUPPLIER_KEY_RE.test(supplierKey)) {
    return { ok: false, error: 'Invalid Direct Supplier supplierKey' };
  }

  try {
    const { data, error } = await client.rpc('server_supplier_foundation_decision_v1', {
      p_supplier_key: supplierKey,
      p_territory: 'GB',
      p_required_capability: null,
    });

    if (error) {
      return { ok: false, error: error.message || 'Supplier Foundation binding unavailable' };
    }
    if (!isRecord(data) || data.interfaceVersion !== 1 || typeof data.eligible !== 'boolean' || typeof data.reason !== 'string') {
      return { ok: false, error: 'Supplier Foundation returned an invalid binding response' };
    }

    const reason = data.reason;

    if (reason === 'supplier_not_found' && data.eligible === false) {
      return {
        ok: true,
        binding: baseBinding({
          supplierKey,
          supplierFound: false,
          foundationReason: 'supplier_not_found',
          identityCaptureAllowed: false,
          canonicalImportBatchCreationAllowed: false,
          supplierFoundationReady: false,
        }),
      };
    }

    const supplierId = typeof data.supplierId === 'string' ? data.supplierId : '';
    if (!UUID_RE.test(supplierId)) {
      return { ok: false, error: 'Supplier Foundation binding did not return a valid supplierId' };
    }

    if (reason === 'supplier_not_approved' && data.eligible === false) {
      const lifecycleStatus = typeof data.lifecycleStatus === 'string' ? data.lifecycleStatus : '';
      if (!NON_APPROVED_LIFECYCLES.has(lifecycleStatus)) {
        return { ok: false, error: 'Supplier Foundation returned an invalid lifecycle status' };
      }
      const typedLifecycle = lifecycleStatus as Exclude<DirectSupplierFoundationBindingV1['lifecycleStatus'], 'approved' | undefined>;
      return {
        ok: true,
        binding: baseBinding({
          supplierKey,
          supplierFound: true,
          supplierId,
          lifecycleStatus: typedLifecycle,
          foundationReason: 'supplier_not_approved',
          identityCaptureAllowed: typedLifecycle !== 'banned',
          canonicalImportBatchCreationAllowed: false,
          supplierFoundationReady: false,
        }),
      };
    }

    if (APPROVED_NOT_READY_REASONS.has(reason) && data.eligible === false) {
      return {
        ok: true,
        binding: baseBinding({
          supplierKey,
          supplierFound: true,
          supplierId,
          lifecycleStatus: 'approved',
          foundationReason: reason as DirectSupplierFoundationBindingV1['foundationReason'],
          identityCaptureAllowed: true,
          canonicalImportBatchCreationAllowed: true,
          supplierFoundationReady: false,
        }),
      };
    }

    if (reason === 'supplier_foundation_ready' && data.eligible === true) {
      return {
        ok: true,
        binding: baseBinding({
          supplierKey,
          supplierFound: true,
          supplierId,
          lifecycleStatus: 'approved',
          foundationReason: 'supplier_foundation_ready',
          identityCaptureAllowed: true,
          canonicalImportBatchCreationAllowed: true,
          supplierFoundationReady: true,
        }),
      };
    }

    return { ok: false, error: 'Supplier Foundation returned an unsupported binding state' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Supplier Foundation binding unavailable',
    };
  }
}
