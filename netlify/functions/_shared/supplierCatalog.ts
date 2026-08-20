import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPPLIER_CATALOG_INTERFACE_VERSION = 1 as const;

export type CatalogEntityStatus = 'draft' | 'review' | 'active' | 'restricted' | 'retired';
export type SupplierOfferStatus = 'candidate' | 'review' | 'approved' | 'restricted' | 'retired';
export type CatalogIdentifierType = 'gtin' | 'ean' | 'upc' | 'isbn' | 'mpn' | 'brand_mpn' | 'internal';
export type DedupDecision = 'pending' | 'same_product' | 'different_product' | 'manual_review';

export interface CanonicalCatalogDecision {
  eligible: boolean;
  reason: string;
  canonicalProductId?: string;
  supplierOfferId?: string;
  supplierId?: string;
  interfaceVersion: typeof SUPPLIER_CATALOG_INTERFACE_VERSION;
}

export type SupplierCatalogAdminAction =
  | 'upsert_canonical_product'
  | 'set_canonical_status'
  | 'attach_identifier'
  | 'upsert_supplier_catalog_item'
  | 'attach_supplier_identifier'
  | 'link_supplier_offer'
  | 'record_dedup_candidate'
  | 'resolve_dedup_candidate';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeCatalogIdentifier = (type: CatalogIdentifierType, raw: string): string => {
  const value = raw.trim();
  if (!value) throw new Error('catalog identifier value is required');

  if (type === 'gtin' || type === 'ean' || type === 'upc' || type === 'isbn') {
    const digits = value.replace(/[\s-]/g, '');
    if (!/^\d{8,14}$/.test(digits)) throw new Error('numeric catalog identifier is invalid');
    return digits;
  }

  const normalized = value.toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length > 256) throw new Error('catalog identifier is too long');
  return normalized;
};

export const buildCatalogIdentityKey = (type: CatalogIdentifierType, raw: string): string =>
  `${type}:${normalizeCatalogIdentifier(type, raw)}`;

export async function evaluateSupplierCatalog(
  client: SupabaseClient,
  input: { canonicalProductId: string; supplierOfferId: string; territory?: string },
): Promise<CanonicalCatalogDecision> {
  if (!UUID_RE.test(input.canonicalProductId) || !UUID_RE.test(input.supplierOfferId)) {
    return { eligible: false, reason: 'invalid_catalog_identity', interfaceVersion: SUPPLIER_CATALOG_INTERFACE_VERSION };
  }

  try {
    const { data, error } = await client.rpc('server_supplier_catalog_decision_v1', {
      p_canonical_product_id: input.canonicalProductId,
      p_supplier_offer_id: input.supplierOfferId,
      p_territory: input.territory || 'GB',
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      return { eligible: false, reason: 'supplier_catalog_unavailable', interfaceVersion: SUPPLIER_CATALOG_INTERFACE_VERSION };
    }

    const candidate = data as Record<string, unknown>;
    if (typeof candidate.eligible !== 'boolean' || typeof candidate.reason !== 'string' || candidate.interfaceVersion !== 1) {
      return { eligible: false, reason: 'supplier_catalog_unavailable', interfaceVersion: SUPPLIER_CATALOG_INTERFACE_VERSION };
    }

    return candidate as unknown as CanonicalCatalogDecision;
  } catch {
    return { eligible: false, reason: 'supplier_catalog_unavailable', interfaceVersion: SUPPLIER_CATALOG_INTERFACE_VERSION };
  }
}

export async function mutateSupplierCatalog(
  client: SupabaseClient,
  actorId: string,
  action: SupplierCatalogAdminAction,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  if (!UUID_RE.test(actorId)) return { ok: false, error: 'active admin authority is required' };

  try {
    const { data, error } = await client.rpc('server_mutate_supplier_catalog_v1', {
      p_actor_id: actorId,
      p_action: action,
      p_payload: payload,
    });
    if (error) return { ok: false, error: error.message || 'supplier catalog mutation failed' };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'supplier catalog mutation failed' };
  }
}
