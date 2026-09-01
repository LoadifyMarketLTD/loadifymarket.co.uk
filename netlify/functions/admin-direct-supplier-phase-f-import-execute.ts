import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { resolveDirectSupplierFoundationBinding } from './_shared/directSupplierFoundationBinding';
import {
  executeDirectSupplierPhaseFImportPlan,
  type DirectSupplierPhaseFMutationAction,
} from './_shared/directSupplierPhaseFImportExecution';
import { evaluateDirectSupplierIntakeGovernance } from './_shared/directSupplierIntakeGovernance';
import {
  prepareDirectSupplierPhaseFImportPlan,
  type DirectSupplierPhaseFCatalogMappingV1,
} from './_shared/directSupplierPhaseFImportPlan';
import { readDirectSupplierStagingReview } from './_shared/directSupplierStagingReview';
import { jsonResponse, optionsResponse } from './_shared/http';
import { mutateSupplierImport } from './_shared/supplierImport';

const METHODS = 'POST, OPTIONS';
const EXECUTION_CONFIRMATION = 'EXECUTE_PHASE_F_IMPORT';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMappings(value: unknown): DirectSupplierPhaseFCatalogMappingV1[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const result: DirectSupplierPhaseFCatalogMappingV1[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const sourceRecordDigest = typeof entry.sourceRecordDigest === 'string' ? entry.sourceRecordDigest.trim() : '';
    const supplierCatalogItemId = typeof entry.supplierCatalogItemId === 'string' ? entry.supplierCatalogItemId.trim() : '';
    const canonicalProductId = typeof entry.canonicalProductId === 'string' ? entry.canonicalProductId.trim() : undefined;
    if (!sourceRecordDigest || !supplierCatalogItemId || !canonicalProductId) return null;
    result.push({ sourceRecordDigest, supplierCatalogItemId, canonicalProductId });
  }
  return result;
}

function noMutationResponse(reason: string) {
  return {
    ok: false,
    reason,
    execution: {
      supplierImportMutationPerformed: false,
      canonicalIdentityMutationPerformed: false,
      supplierCatalogMutationPerformed: false,
      marketplaceListingPerformed: false,
      commercialActivationPerformed: false,
      providerWriteMutationPerformed: false,
      supplierOrderMutationPerformed: false,
      customerPiiDisclosurePerformed: false,
      financialMutationPerformed: false,
    },
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body || '{}');
    if (!isRecord(parsed)) throw new Error('body must be an object');
    body = parsed;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const supplierKey = typeof body.supplierKey === 'string' ? body.supplierKey.trim() : '';
  const sourceBatchDigest = typeof body.sourceBatchDigest === 'string' ? body.sourceBatchDigest.trim() : '';
  const catalogMappings = parseMappings(body.catalogMappings);
  const confirmed = body.confirmExecution === EXECUTION_CONFIRMATION;

  if (!supplierKey || !sourceBatchDigest || !catalogMappings) {
    return jsonResponse(400, {
      error: 'supplierKey, sourceBatchDigest and complete canonical catalogMappings are required',
      ...noMutationResponse('invalid_request'),
    }, METHODS);
  }

  const serialized = JSON.stringify(body);
  if (/password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|card(number)?/i.test(serialized)) {
    return jsonResponse(400, {
      error: 'Secrets, provider credentials and payment credentials are not accepted',
      ...noMutationResponse('credential_material_rejected'),
    }, METHODS);
  }

  const executionEnabled = process.env.DIRECT_SUPPLIER_PHASE_F_EXECUTION_ENABLED === 'true';
  if (!executionEnabled) {
    return jsonResponse(409, noMutationResponse('execution_disabled'), METHODS);
  }
  if (!confirmed) {
    return jsonResponse(400, {
      error: `confirmExecution must equal ${EXECUTION_CONFIRMATION}`,
      ...noMutationResponse('confirmation_required'),
    }, METHODS);
  }

  const staged = await readDirectSupplierStagingReview(admin, { supplierKey, sourceBatchDigest });
  if (!staged.ok) {
    if (staged.kind === 'validation') return jsonResponse(400, { error: staged.error, ...noMutationResponse('staging_rejected') }, METHODS);
    if (staged.kind === 'not_found') return jsonResponse(404, { error: staged.error, ...noMutationResponse('staging_not_found') }, METHODS);
    console.error('admin-direct-supplier-phase-f-import-execute: staging read failed:', staged.error);
    return jsonResponse(500, { error: 'Unable to read Direct Supplier staging review', ...noMutationResponse('staging_unavailable') }, METHODS);
  }

  const foundation = await resolveDirectSupplierFoundationBinding(admin, staged.reviewPackage.supplierKey);
  if (!foundation.ok) {
    console.error('admin-direct-supplier-phase-f-import-execute: foundation binding failed:', foundation.error);
    return jsonResponse(500, { error: 'Unable to resolve Direct Supplier foundation binding', ...noMutationResponse('foundation_unavailable') }, METHODS);
  }

  try {
    const intakeGovernance = evaluateDirectSupplierIntakeGovernance({
      reviewPackage: staged.reviewPackage,
      foundationBinding: foundation.binding,
    });
    const importPlan = prepareDirectSupplierPhaseFImportPlan({
      reviewPackage: staged.reviewPackage,
      foundationBinding: foundation.binding,
      intakeGovernance,
      catalogMappings,
    });

    const execution = await executeDirectSupplierPhaseFImportPlan({
      plan: importPlan,
      executionEnabled,
      confirmed,
      mutate: (action: DirectSupplierPhaseFMutationAction, payload: Record<string, unknown>) => (
        mutateSupplierImport(admin, auth.actor.id, action, payload)
      ),
    });

    if (!execution.executed) {
      const status = execution.reason === 'mutation_failed' ? 500 : 409;
      return jsonResponse(status, {
        ok: false,
        reason: execution.reason,
        execution,
      }, METHODS);
    }

    return jsonResponse(200, {
      ok: true,
      execution,
      reviewStillRequired: {
        normalizedFacts: true,
        assetRights: true,
        compliance: true,
        marketplacePublication: true,
        commercialActivation: true,
      },
    }, METHODS);
  } catch (error) {
    console.error(
      'admin-direct-supplier-phase-f-import-execute: execution rejected:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return jsonResponse(400, {
      error: 'Direct Supplier Phase F execution rejected',
      ...noMutationResponse('execution_rejected'),
    }, METHODS);
  }
};
