import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_CATALOG_INTERFACE_VERSION,
  buildCatalogIdentityKey,
  evaluateSupplierCatalog,
  normalizeCatalogIdentifier,
} from '../_shared/supplierCatalog';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/619_canonical_supplier_data.sql');
const guards = repo('supabase/620_canonical_supplier_data_guards.sql');
const adminApi = repo('netlify/functions/admin-supplier-catalog.ts');

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const OFFER_ID = '22222222-2222-4222-8222-222222222222';

describe('Phase E Canonical Supplier Data', () => {
  it('keeps canonical product separate from supplier offers and raw supplier catalog identity', () => {
    expect(migration).toContain('private.canonical_products');
    expect(migration).toContain('private.supplier_catalog_items');
    expect(migration).toContain('private.supplier_offers');
    expect(migration).toContain('canonical_product_id uuid NOT NULL REFERENCES private.canonical_products');
    expect(migration).toContain('supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items');
    expect(migration).not.toContain('supplier_price');
    expect(migration).not.toContain('sellable_stock');
  });

  it('provides deterministic catalog identifiers with namespace-aware uniqueness', () => {
    expect(normalizeCatalogIdentifier('gtin', ' 05012345-67890 ')).toBe('0501234567890');
    expect(buildCatalogIdentityKey('brand_mpn', '  ABC  123 ')).toBe('brand_mpn:abc 123');
    expect(() => normalizeCatalogIdentifier('gtin', 'abc')).toThrow(/invalid/i);

    expect(migration).toContain("identifier_type IN ('gtin','ean','upc','isbn','mpn','brand_mpn','internal')");
    expect(migration).toContain('canonical_verified_identifier_global_unique');
    expect(migration).toContain("identifier_type IN ('mpn','brand_mpn','internal') AND identifier_namespace <> 'global'");
  });

  it('models deduplication as evidence and explicit resolution, never an implicit merge', () => {
    expect(migration).toContain('private.catalog_dedup_candidates');
    expect(migration).toContain("decision IN ('pending','same_product','different_product','manual_review')");
    expect(migration).toContain('resolution_version integer NOT NULL DEFAULT 1');
    expect(guards).toContain('terminal catalog dedup resolution is immutable');
    expect(guards).toContain('terminal catalog dedup resolution requires evidence');
    expect(guards).not.toMatch(/DELETE\s+FROM\s+private\.canonical_products/i);
  });

  it('blocks approved offers while catalog identity is unresolved', () => {
    expect(guards).toContain("d.decision IN ('pending','manual_review')");
    expect(guards).toContain('unresolved catalog deduplication blocks offer approval');
    expect(migration).toContain('catalog_identity_unresolved');
  });

  it('requires strong identity evidence for verified-identifier and dedup-resolution links', () => {
    expect(guards).toContain("NEW.identity_method = 'verified_identifier'");
    expect(guards).toContain("si.verification_status = 'verified'");
    expect(guards).toContain("ci.verification_status = 'verified'");
    expect(guards).toContain("NEW.identity_method = 'dedup_resolution'");
    expect(guards).toContain("d.decision = 'same_product'");
  });

  it('makes verified identifiers and approved offer identity immutable', () => {
    expect(guards).toContain('verified canonical identifier identity is immutable');
    expect(guards).toContain('approved supplier offer identity is immutable');
    expect(guards).toContain('supplier catalog external identity is immutable');
  });

  it('keeps Phase E storage private and service-role decisions fail-closed', () => {
    for (const table of [
      'canonical_products', 'canonical_product_identifiers', 'supplier_catalog_items',
      'supplier_catalog_identifiers', 'supplier_offers', 'catalog_dedup_candidates', 'catalog_identity_audit',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON TABLE private.${table} FROM PUBLIC, anon, authenticated, service_role`);
    }
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_catalog_decision_v1(uuid, uuid, text) TO service_role');
    expect(guards).toContain('GRANT EXECUTE ON FUNCTION public.server_mutate_supplier_catalog_v1(uuid, text, jsonb) TO service_role');
  });

  it('reuses Phase D supplier readiness instead of creating parallel supplier truth', () => {
    expect(migration).toContain('private.supplier_foundation_suppliers');
    expect(migration).toContain('public.server_supplier_foundation_decision_v1');
    expect(migration).toContain("'catalog'");
    expect(migration).not.toContain('CREATE TABLE IF NOT EXISTS private.suppliers');
  });

  it('does not enable Supplier Commerce just because Phase E schema exists', () => {
    expect(migration).toContain('Supplier Commerce remains fail-closed under the Phase C control plane');
    expect(migration).not.toContain('SET enabled = true');
    expect(guards).not.toContain('SET enabled = true');
  });

  it('requires active-admin authority and rejects secret-bearing payloads', () => {
    expect(guards).toContain("u.role = 'admin'");
    expect(guards).toContain('u."isActive" = true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toContain('password|secret|access[_-]?token');
  });

  it('fails closed when the catalog readiness RPC is unavailable or malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierCatalog(client, {
      canonicalProductId: PRODUCT_ID,
      supplierOfferId: OFFER_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_catalog_unavailable',
      interfaceVersion: SUPPLIER_CATALOG_INTERFACE_VERSION,
    });

    rpc.mockRejectedValueOnce(new Error('network down'));
    await expect(evaluateSupplierCatalog(client, {
      canonicalProductId: PRODUCT_ID,
      supplierOfferId: OFFER_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_catalog_unavailable',
      interfaceVersion: SUPPLIER_CATALOG_INTERFACE_VERSION,
    });
  });

  it('accepts only a structurally complete server-side readiness decision', async () => {
    const expected = {
      eligible: true,
      reason: 'supplier_catalog_ready',
      canonicalProductId: PRODUCT_ID,
      supplierOfferId: OFFER_ID,
      supplierId: '33333333-3333-4333-8333-333333333333',
      interfaceVersion: 1,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(evaluateSupplierCatalog(client, {
      canonicalProductId: PRODUCT_ID,
      supplierOfferId: OFFER_ID,
      territory: 'GB',
    })).resolves.toEqual(expected);
    expect(rpc).toHaveBeenCalledWith('server_supplier_catalog_decision_v1', {
      p_canonical_product_id: PRODUCT_ID,
      p_supplier_offer_id: OFFER_ID,
      p_territory: 'GB',
    });
  });

  it('keeps Phase F ingestion/normalisation explicitly deferred', () => {
    expect(migration).toContain('does NOT implement import/normalisation');
    expect(migration).toContain('raw_snapshot_ref text');
    expect(migration).toContain('supplier_catalog_identifiers');
    expect(adminApi).not.toContain('attach_supplier_identifier');
  });
});
