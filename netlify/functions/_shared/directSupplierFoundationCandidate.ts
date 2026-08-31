import type { SupabaseClient } from '@supabase/supabase-js';
import {
  validateDirectSupplierOnboardingManifest,
  type DirectSupplierOnboardingManifestV1,
} from './directSupplierOnboarding';
import {
  resolveDirectSupplierFoundationBinding,
  type DirectSupplierFoundationBindingV1,
} from './directSupplierFoundationBinding';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DirectSupplierFoundationCandidateResultV1 {
  interfaceVersion: 1;
  supplierId: string;
  supplierKey: string;
  foundationBinding: DirectSupplierFoundationBindingV1;
  registrationEvidencePending: boolean;
  vatEvidencePending: boolean;
  requestedCapabilitiesRecordedAsIntentOnly: true;
  requestedCapabilitiesPromoted: false;
  lifecycleMutationPerformed: false;
  qualificationMutationPerformed: false;
  adapterRegistrationMutationPerformed: false;
  commercialActivationPerformed: false;
  marketplaceListingPerformed: false;
}

export type DirectSupplierFoundationCandidateResult =
  | { ok: true; candidate: DirectSupplierFoundationCandidateResultV1 }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Creates or updates only the Supplier Foundation identity surface permitted by
 * the existing `upsert_supplier` action. It never advances lifecycle, writes
 * qualification evidence, registers/promotes adapter capabilities or activates
 * commerce.
 *
 * Registration/VAT values stay in the caller's reviewed manifest until a later
 * evidence-specific admin workflow records them using the canonical Foundation
 * evidence model. Requested capabilities remain onboarding intent only.
 */
export async function upsertDirectSupplierFoundationCandidate(input: {
  client: RpcClient;
  actorId: string;
  manifest: DirectSupplierOnboardingManifestV1;
}): Promise<DirectSupplierFoundationCandidateResult> {
  if (!UUID_RE.test(input.actorId)) return { ok: false, error: 'Active admin actor ID is required' };

  const manifestErrors = validateDirectSupplierOnboardingManifest(input.manifest);
  if (manifestErrors.length > 0) {
    return { ok: false, error: `Invalid Direct Supplier onboarding manifest: ${manifestErrors.join('; ')}` };
  }

  const supplierKey = input.manifest.supplierKey.trim();
  const legalName = input.manifest.legalName.trim();
  const businessCountry = input.manifest.registrationCountry.trim().toUpperCase();
  const warehouseRefs = input.manifest.warehouseDeclarations.map(warehouse => ({
    externalWarehouseRef: warehouse.externalWarehouseRef.trim(),
    country: warehouse.country.trim().toUpperCase(),
  }));

  try {
    const { data, error } = await input.client.rpc('server_admin_supplier_foundation_v1', {
      p_actor_id: input.actorId,
      p_action: 'upsert_supplier',
      p_payload: {
        supplierKey,
        displayName: legalName,
        legalName,
        businessCountry,
        warehouseRefs,
      },
    });

    if (error) return { ok: false, error: error.message || 'Supplier Foundation candidate upsert failed' };
    if (!isRecord(data) || data.ok !== true || data.interfaceVersion !== 1) {
      return { ok: false, error: 'Supplier Foundation candidate upsert returned an invalid response' };
    }

    const supplierId = typeof data.supplierId === 'string' ? data.supplierId : '';
    const returnedSupplierKey = typeof data.supplierKey === 'string' ? data.supplierKey : '';
    if (!UUID_RE.test(supplierId) || returnedSupplierKey !== supplierKey) {
      return { ok: false, error: 'Supplier Foundation candidate upsert returned an invalid identity binding' };
    }

    const binding = await resolveDirectSupplierFoundationBinding(input.client, supplierKey);
    if (!binding.ok) return { ok: false, error: `Supplier Foundation candidate verification failed: ${binding.error}` };
    if (!binding.binding.supplierFound || binding.binding.supplierId !== supplierId) {
      return { ok: false, error: 'Supplier Foundation candidate verification returned a mismatched supplier identity' };
    }

    return {
      ok: true,
      candidate: {
        interfaceVersion: 1,
        supplierId,
        supplierKey,
        foundationBinding: binding.binding,
        registrationEvidencePending: Boolean(input.manifest.registrationNumber?.trim()),
        vatEvidencePending: Boolean(input.manifest.vatNumber?.trim()),
        requestedCapabilitiesRecordedAsIntentOnly: true,
        requestedCapabilitiesPromoted: false,
        lifecycleMutationPerformed: false,
        qualificationMutationPerformed: false,
        adapterRegistrationMutationPerformed: false,
        commercialActivationPerformed: false,
        marketplaceListingPerformed: false,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Supplier Foundation candidate onboarding failed',
    };
  }
}
