import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_ADAPTER_INTERFACE_VERSION,
  adapterSupports,
  assertSupplierAdapterV1,
  type SupplierAdapterV1,
} from '../_shared/supplierAdapter';
import {
  SUPPLIER_FOUNDATION_INTERFACE_VERSION,
  evaluateSupplierFoundation,
} from '../_shared/supplierFoundation';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/617_supplier_foundation.sql');
const adminApi = repo('netlify/functions/admin-supplier-foundation.ts');
const adapterSource = repo('netlify/functions/_shared/supplierAdapter.ts');

describe('Phase D Supplier Foundation', () => {
  it('defines the canonical supplier lifecycle independently of product approval', () => {
    expect(migration).toContain("'candidate','verification','approved','restricted','suspended','banned'");
    expect(migration).toContain('supplier_foundation_lifecycle_audit');
    expect(migration).toContain('supplier qualification is incomplete');
  });

  it('requires evidence-based qualification rather than default approval', () => {
    for (const evidence of [
      'identity', 'business_identity', 'warehouse_origin', 'uk_shipping', 'api_feed_capability',
      'stock_reliability', 'price_reliability', 'tracking', 'returns', 'documentation',
      'compliance', 'content_rights',
    ]) {
      expect(migration).toContain(`'${evidence}'`);
    }
    expect(migration).toContain("q.status = 'verified'");
    expect(migration).toContain('expires_at > now()');
  });

  it('makes SLA versioned, effective-dated, auditable and single-active', () => {
    expect(migration).toContain('private.supplier_sla_versions');
    expect(migration).toContain('version integer NOT NULL CHECK (version > 0)');
    expect(migration).toContain('effective_from timestamptz NOT NULL');
    expect(migration).toContain('supplier_sla_one_active_unique');
    expect(migration).toContain("WHERE status = 'active'");
    expect(migration).toContain('acknowledgement_minutes');
    expect(migration).toContain('stock_accuracy_target_pct');
    expect(migration).toContain('kill_switch_threshold');
  });

  it('models GREEN/AMBER/RED compliance with red never directly approved', () => {
    expect(migration).toContain("risk_class IN ('green','amber','red')");
    expect(migration).toContain("risk_class <> 'red'");
    expect(migration).toContain("risk_class <> 'red' OR status IN ('prohibited','manual_review','stale')");
  });

  it('records content provenance and forbids approved rights without verified evidence', () => {
    expect(migration).toContain('private.supplier_provenance_records');
    expect(migration).toContain('source_ref text NOT NULL');
    expect(migration).toContain('original_reference');
    expect(migration).toContain("rights_status = 'verified'");
    expect(migration).toContain("review_status <> 'approved'");
  });

  it('keeps the adapter contract provider-neutral and explicitly versioned', () => {
    expect(SUPPLIER_ADAPTER_INTERFACE_VERSION).toBe(1);
    expect(adapterSource).toContain('export interface SupplierAdapterV1');
    expect(adapterSource).not.toMatch(/aliexpress|amazon|tiktok|avasam|dsers|autods/i);
    expect(migration).not.toMatch(/aliexpress_|amazon_|tiktok_|avasam_|dsers_|autods_/i);
  });

  it('declares the complete Phase D adapter capability envelope', () => {
    for (const capability of [
      'supplier_identity', 'catalog', 'variants', 'stock', 'price', 'shipping',
      'order_submission', 'acknowledgement', 'tracking', 'cancellation', 'returns', 'reimbursement',
    ]) {
      expect(adapterSource).toContain(`'${capability}'`);
      expect(migration).toContain(`'${capability}'`);
    }
  });

  it('validates Supplier Adapter V1 identity and capability uniqueness', () => {
    const adapter: SupplierAdapterV1 = {
      interfaceVersion: 1,
      providerKey: 'provider-neutral',
      adapterVersion: '1.0.0',
      capabilities: ['catalog', 'stock'],
    };
    expect(() => assertSupplierAdapterV1(adapter)).not.toThrow();
    expect(adapterSupports(adapter, 'stock')).toBe(true);
    expect(adapterSupports(adapter, 'returns')).toBe(false);

    const duplicate = { ...adapter, capabilities: ['stock', 'stock'] as const };
    expect(() => assertSupplierAdapterV1(duplicate)).toThrow(/unique/i);
  });

  it('fails closed when supplier readiness RPC is unavailable or malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierFoundation(client, 'supplier-a')).resolves.toEqual({
      eligible: false,
      reason: 'supplier_foundation_unavailable',
      interfaceVersion: SUPPLIER_FOUNDATION_INTERFACE_VERSION,
    });

    rpc.mockRejectedValueOnce(new Error('network unavailable'));
    const thrown = await evaluateSupplierFoundation(client, 'supplier-a');
    expect(thrown.eligible).toBe(false);
  });

  it('returns server readiness evidence without reconstructing qualification client-side', async () => {
    const expected = {
      eligible: true,
      reason: 'supplier_foundation_ready',
      supplierId: '11111111-1111-1111-1111-111111111111',
      supplierKey: 'supplier-a',
      slaVersion: 2,
      complianceVersion: 4,
      interfaceVersion: 1,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierFoundation(client, 'supplier-a', {
      territory: 'GB',
      requiredCapability: 'order_submission',
    })).resolves.toEqual(expected);
    expect(rpc).toHaveBeenCalledWith('server_supplier_foundation_decision_v1', {
      p_supplier_key: 'supplier-a',
      p_territory: 'GB',
      p_required_capability: 'order_submission',
    });
  });

  it('keeps all Phase D foundation tables private and service-role RPC only', () => {
    for (const table of [
      'supplier_foundation_suppliers', 'supplier_qualification_evidence', 'supplier_sla_versions',
      'supplier_compliance_profiles', 'supplier_provenance_records', 'supplier_adapter_registrations',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON TABLE private.${table} FROM PUBLIC, anon, authenticated, service_role`);
    }
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_foundation_decision_v1(text, text, text)');
    expect(migration).toContain('TO service_role');
  });

  it('requires live active-admin authority and rejects secret-bearing API payloads', () => {
    expect(migration).toContain("u.role = 'admin' AND u.\"isActive\" = true");
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toMatch(/password\|secret\|access\[_-\]\?token/);
    expect(adminApi).toContain('Secrets or payment credentials are not accepted');
  });

  it('does not treat migration presence as permission to trade', () => {
    expect(migration).toContain('does not enable Supplier Commerce');
    expect(migration).toContain('Phase C controls still govern runtime operations');
    expect(migration).not.toContain("UPDATE private.supplier_commerce_controls SET enabled = true");
  });
});
