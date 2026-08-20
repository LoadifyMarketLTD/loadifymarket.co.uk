import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_IMPORT_INTERFACE_VERSION,
  evaluateSupplierImport,
} from '../_shared/supplierImport';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/622_supplier_import_normalisation.sql');
const guards = repo('supabase/623_supplier_import_normalisation_guards.sql');
const adminApi = repo('netlify/functions/admin-supplier-import.ts');

const ITEM_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';

describe('Phase F Supplier Import / Normalisation', () => {
  it('implements the canonical import evidence stages without URL-to-publish bypass', () => {
    expect(migration).toContain('private.supplier_import_batches');
    expect(migration).toContain('private.supplier_import_items');
    expect(migration).toContain('private.normalized_product_facts');
    expect(migration).toContain('private.supplier_import_asset_rights');
    expect(migration).toContain('private.supplier_import_compliance_reviews');
    expect(migration).toContain('private.supplier_import_review_audit');
    expect(migration).not.toMatch(/URL\s*[-=]>\s*PUBLISH/i);
  });

  it('makes import retry idempotent and resumable instead of duplicating products', () => {
    expect(guards).toContain('idempotency_key text');
    expect(guards).toContain('supplier_import_batch_idempotency_unique');
    expect(guards).toContain('item_idempotency_key text');
    expect(guards).toContain('supplier_import_item_idempotency_unique');
    expect(guards).toContain('resume_token text');
    expect(guards).toContain('last_checkpoint text');
    expect(guards).toContain('ON CONFLICT (supplier_id, provider_key, idempotency_key)');
    expect(guards).toContain('ON CONFLICT (batch_id, item_idempotency_key)');
  });

  it('enforces AI Facts Lock at schema, trigger and mutation boundaries', () => {
    expect(migration).toContain("source_class IN ('supplier_source','verified_external_source','admin_asserted','ai_proposed')");
    expect(migration).toContain("source_class <> 'ai_proposed'");
    expect(guards).toContain('AI FACTS LOCK: AI proposal cannot become a verified fact');
    expect(guards).toContain("NEW.source_class = 'ai_proposed'");
    expect(guards).toContain('AI proposal requires model provenance');
    expect(guards).toContain("v_fact.source_class = 'ai_proposed'");
  });

  it('keeps verified factual evidence immutable', () => {
    expect(guards).toContain("OLD.review_status = 'verified'");
    expect(guards).toContain('verified normalized fact evidence is immutable');
    expect(guards).toContain('source_evidence_hash');
  });

  it('requires rights evidence before imported assets can clear review', () => {
    expect(migration).toContain("rights_status IN ('unknown','verified','restricted','prohibited')");
    expect(migration).toContain('rights_basis');
    expect(migration).toContain('evidence_hash');
    expect(guards).toContain('uncleared asset rights block import approval');
    expect(guards).toContain("r.rights_status <> 'verified'");
  });

  it('requires a complete current GB compliance review before approval', () => {
    for (const reviewClass of [
      'product_safety', 'restricted_goods', 'claims', 'labelling', 'documentation', 'marketability',
    ]) {
      expect(migration).toContain(`'${reviewClass}'`);
      expect(guards).toContain(`'${reviewClass}'`);
    }
    expect(guards).toContain('complete current GB compliance review is required before import approval');
    expect(guards).toContain("c.status = 'approved'");
    expect(guards).toContain('c.expires_at > now()');
  });

  it('requires verified non-AI facts and blocks pending/stale facts at approval', () => {
    expect(guards).toContain('approved import item requires verified non-AI facts');
    expect(guards).toContain("f.source_class <> 'ai_proposed'");
    expect(guards).toContain("f.review_status IN ('pending','stale')");
    expect(guards).toContain('pending or stale facts block import approval');
  });

  it('keeps terminal batch history immutable and audited', () => {
    expect(guards).toContain("OLD.status IN ('accepted','rejected','failed')");
    expect(guards).toContain('terminal import batch status is immutable');
    expect(migration).toContain('private.supplier_import_review_audit');
    expect(guards).toContain('INSERT INTO private.supplier_import_review_audit');
  });

  it('keeps all Phase F data private and exposes only service-role RPCs', () => {
    for (const table of [
      'supplier_import_batches', 'supplier_import_items', 'normalized_product_facts',
      'supplier_import_asset_rights', 'supplier_import_compliance_reviews', 'supplier_import_review_audit',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON TABLE private.${table} FROM PUBLIC, anon, authenticated, service_role`);
    }
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_import_decision_v1(uuid, uuid) TO service_role');
    expect(guards).toContain('GRANT EXECUTE ON FUNCTION public.server_mutate_supplier_import_v1(uuid, text, jsonb) TO service_role');
  });

  it('requires active-admin authority and rejects secret-bearing payloads', () => {
    expect(guards).toContain("u.role = 'admin'");
    expect(guards).toContain('u."isActive" = true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toContain('password|secret|access[_-]?token');
  });

  it('does not smuggle Phase G economics or activate Supplier Commerce', () => {
    expect(migration).toContain('Phase G commercial economics are intentionally deferred');
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS private\.(landed_cost|financial_ledger|pricing)/i);
    expect(migration).not.toContain('SET enabled = true');
    expect(guards).not.toContain('SET enabled = true');
  });

  it('fails closed when import readiness RPC is unavailable or malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierImport(client, {
      supplierCatalogItemId: ITEM_ID,
      canonicalProductId: PRODUCT_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_import_unavailable',
      interfaceVersion: SUPPLIER_IMPORT_INTERFACE_VERSION,
    });

    rpc.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(evaluateSupplierImport(client, {
      supplierCatalogItemId: ITEM_ID,
      canonicalProductId: PRODUCT_ID,
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_import_unavailable',
      interfaceVersion: SUPPLIER_IMPORT_INTERFACE_VERSION,
    });
  });

  it('accepts only structurally complete server readiness evidence', async () => {
    const expected = {
      eligible: true,
      reason: 'supplier_import_ready',
      supplierCatalogItemId: ITEM_ID,
      canonicalProductId: PRODUCT_ID,
      interfaceVersion: 1,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(evaluateSupplierImport(client, {
      supplierCatalogItemId: ITEM_ID,
      canonicalProductId: PRODUCT_ID,
    })).resolves.toEqual(expected);
    expect(rpc).toHaveBeenCalledWith('server_supplier_import_decision_v1', {
      p_supplier_catalog_item_id: ITEM_ID,
      p_canonical_product_id: PRODUCT_ID,
    });
  });
});
