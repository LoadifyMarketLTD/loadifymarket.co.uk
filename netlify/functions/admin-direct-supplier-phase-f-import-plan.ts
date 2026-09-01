import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { resolveDirectSupplierFoundationBinding } from './_shared/directSupplierFoundationBinding';
import { evaluateDirectSupplierIntakeGovernance } from './_shared/directSupplierIntakeGovernance';
import {
  prepareDirectSupplierPhaseFImportPlan,
  type DirectSupplierPhaseFCatalogMappingV1,
} from './_shared/directSupplierPhaseFImportPlan';
import { readDirectSupplierStagingReview } from './_shared/directSupplierStagingReview';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

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
    if (!sourceRecordDigest || !supplierCatalogItemId || (entry.canonicalProductId !== undefined && !canonicalProductId)) return null;
    result.push({ sourceRecordDigest, supplierCatalogItemId, ...(canonicalProductId ? { canonicalProductId } : {}) });
  }
  return result;
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
  if (!supplierKey || !sourceBatchDigest || !catalogMappings) {
    return jsonResponse(400, { error: 'supplierKey, sourceBatchDigest and valid catalogMappings are required' }, METHODS);
  }

  const staged = await readDirectSupplierStagingReview(admin, { supplierKey, sourceBatchDigest });
  if (!staged.ok) {
    if (staged.kind === 'validation') return jsonResponse(400, { error: staged.error }, METHODS);
    if (staged.kind === 'not_found') return jsonResponse(404, { error: staged.error }, METHODS);
    console.error('admin-direct-supplier-phase-f-import-plan: staging read failed:', staged.error);
    return jsonResponse(500, { error: 'Unable to read Direct Supplier staging review' }, METHODS);
  }

  const foundation = await resolveDirectSupplierFoundationBinding(admin, staged.reviewPackage.supplierKey);
  if (!foundation.ok) {
    console.error('admin-direct-supplier-phase-f-import-plan: foundation binding failed:', foundation.error);
    return jsonResponse(500, { error: 'Unable to resolve Direct Supplier foundation binding' }, METHODS);
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

    return jsonResponse(200, {
      ok: true,
      importPlan,
      execution: {
        mutationPerformed: false,
        supplierImportMutationCalled: false,
        canonicalIdentityMutationPerformed: false,
        marketplaceListingPerformed: false,
        commercialActivationPerformed: false,
      },
    }, METHODS);
  } catch (error) {
    console.error(
      'admin-direct-supplier-phase-f-import-plan: planning failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return jsonResponse(400, { error: 'Direct Supplier Phase F import plan rejected' }, METHODS);
  }
};
