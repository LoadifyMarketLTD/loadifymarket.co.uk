import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION = 1 as const;
export const LOADIFY_SUPPLIER_FULFILLED_COMMERCIAL_MODE = 'loadify_supplier_fulfilled' as const;
export const LOADIFY_SUPPLIER_FULFILLED_LEGAL_SELLER_KEY = 'xdrive_logistics_ltd_ta_loadify_market' as const;
export const LOADIFY_SUPPLIER_FULFILLED_LEGAL_SELLER_LABEL = 'XDrive Logistics Ltd trading as Loadify Market' as const;

export interface SupplierPublicationBindingDecisionInput {
  publicProductId: string;
  supplierOfferId: string;
  territory?: string;
}

export interface SupplierPublicationBindingDecision {
  eligible: boolean;
  reason: string;
  interfaceVersion: typeof SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION;
  bindingId?: string;
  publicProductId?: string;
  canonicalProductId?: string;
  supplierOfferId?: string;
  commercialMode?: typeof LOADIFY_SUPPLIER_FULFILLED_COMMERCIAL_MODE;
  legalSellerKey?: typeof LOADIFY_SUPPLIER_FULFILLED_LEGAL_SELLER_KEY;
  territory?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDecision(value: unknown): value is SupplierPublicationBindingDecision {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (
    typeof row.eligible !== 'boolean'
    || typeof row.reason !== 'string'
    || row.interfaceVersion !== SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION
  ) return false;
  if (!row.eligible) return true;
  return typeof row.bindingId === 'string'
    && typeof row.publicProductId === 'string'
    && typeof row.canonicalProductId === 'string'
    && typeof row.supplierOfferId === 'string'
    && row.commercialMode === LOADIFY_SUPPLIER_FULFILLED_COMMERCIAL_MODE
    && row.legalSellerKey === LOADIFY_SUPPLIER_FULFILLED_LEGAL_SELLER_KEY
    && typeof row.territory === 'string';
}

export async function evaluateSupplierPublicationBinding(
  client: SupabaseClient,
  input: SupplierPublicationBindingDecisionInput,
): Promise<SupplierPublicationBindingDecision> {
  const publicProductId = input.publicProductId.trim();
  const supplierOfferId = input.supplierOfferId.trim();
  const territory = (input.territory || 'GB').trim().toUpperCase();
  if (!UUID_RE.test(publicProductId) || !UUID_RE.test(supplierOfferId) || !/^[A-Z]{2}$/.test(territory)) {
    return {
      eligible: false,
      reason: 'supplier_publication_binding_input_invalid',
      interfaceVersion: SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION,
    };
  }

  try {
    const { data, error } = await client.rpc('server_supplier_listing_binding_decision_v1', {
      p_public_product_id: publicProductId,
      p_supplier_offer_id: supplierOfferId,
      p_territory: territory,
    });
    if (error || !isDecision(data)) throw error || new Error('invalid supplier publication binding decision');
    return data;
  } catch {
    return {
      eligible: false,
      reason: 'supplier_publication_binding_unavailable',
      interfaceVersion: SUPPLIER_PUBLICATION_BINDING_INTERFACE_VERSION,
    };
  }
}

export type SupplierPublicationBindingAdminAction = 'upsert_binding' | 'set_status';

export async function mutateSupplierPublicationBinding(
  client: SupabaseClient,
  actorId: string,
  action: SupplierPublicationBindingAdminAction,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  if (!UUID_RE.test(actorId.trim())) return { ok: false, error: 'active admin actor id is required' };
  try {
    const { data, error } = await client.rpc('server_admin_supplier_publication_binding_v1', {
      p_actor_id: actorId.trim(),
      p_action: action,
      p_payload: payload,
    });
    if (error) return { ok: false, error: error.message || 'supplier publication binding mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'supplier publication binding mutation failed',
    };
  }
}
