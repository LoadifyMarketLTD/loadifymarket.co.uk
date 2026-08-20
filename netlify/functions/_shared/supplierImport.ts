import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_IMPORT_INTERFACE_VERSION = 1 as const;

export type SupplierImportAdminAction =
  | 'create_import_batch'
  | 'record_import_item'
  | 'record_normalized_fact'
  | 'review_normalized_fact'
  | 'record_asset_rights'
  | 'record_compliance_review'
  | 'set_import_item_status'
  | 'checkpoint_import_batch';

export interface SupplierImportDecision {
  eligible: boolean;
  reason: string;
  supplierCatalogItemId?: string;
  canonicalProductId?: string;
  interfaceVersion: typeof SUPPLIER_IMPORT_INTERFACE_VERSION;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function evaluateSupplierImport(
  client: SupabaseClient,
  input: { supplierCatalogItemId: string; canonicalProductId: string },
): Promise<SupplierImportDecision> {
  if (!UUID_RE.test(input.supplierCatalogItemId) || !UUID_RE.test(input.canonicalProductId)) {
    return { eligible: false, reason: 'invalid_import_identity', interfaceVersion: SUPPLIER_IMPORT_INTERFACE_VERSION };
  }

  try {
    const { data, error } = await client.rpc('server_supplier_import_decision_v1', {
      p_supplier_catalog_item_id: input.supplierCatalogItemId,
      p_canonical_product_id: input.canonicalProductId,
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      return { eligible: false, reason: 'supplier_import_unavailable', interfaceVersion: SUPPLIER_IMPORT_INTERFACE_VERSION };
    }
    const candidate = data as Record<string, unknown>;
    if (typeof candidate.eligible !== 'boolean' || typeof candidate.reason !== 'string' || candidate.interfaceVersion !== 1) {
      return { eligible: false, reason: 'supplier_import_unavailable', interfaceVersion: SUPPLIER_IMPORT_INTERFACE_VERSION };
    }
    return candidate as unknown as SupplierImportDecision;
  } catch {
    return { eligible: false, reason: 'supplier_import_unavailable', interfaceVersion: SUPPLIER_IMPORT_INTERFACE_VERSION };
  }
}

export async function mutateSupplierImport(
  client: SupabaseClient,
  actorId: string,
  action: SupplierImportAdminAction,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  if (!UUID_RE.test(actorId)) return { ok: false, error: 'active admin authority is required' };

  try {
    if (action === 'record_normalized_fact') {
      const { data, error } = await client.rpc('server_record_supplier_import_fact_v1', {
        p_actor_id: actorId,
        p_payload: payload,
      });
      if (error) return { ok: false, error: error.message || 'supplier import fact mutation failed' };
      return { ok: true, data };
    }

    if (action === 'checkpoint_import_batch') {
      const batchId = typeof payload.batchId === 'string' ? payload.batchId : '';
      const checkpoint = typeof payload.checkpoint === 'string' ? payload.checkpoint : '';
      const resumeToken = typeof payload.resumeToken === 'string' ? payload.resumeToken : null;
      if (!UUID_RE.test(batchId) || !checkpoint.trim()) {
        return { ok: false, error: 'valid batchId and checkpoint are required' };
      }
      const { data, error } = await client.rpc('server_checkpoint_supplier_import_v1', {
        p_actor_id: actorId,
        p_batch_id: batchId,
        p_checkpoint: checkpoint,
        p_resume_token: resumeToken,
      });
      if (error) return { ok: false, error: error.message || 'supplier import checkpoint failed' };
      return { ok: true, data };
    }

    const { data, error } = await client.rpc('server_mutate_supplier_import_v1', {
      p_actor_id: actorId,
      p_action: action,
      p_payload: payload,
    });
    if (error) return { ok: false, error: error.message || 'supplier import mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'supplier import mutation failed' };
  }
}
