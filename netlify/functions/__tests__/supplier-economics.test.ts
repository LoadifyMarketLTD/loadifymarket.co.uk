import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_ECONOMICS_INTERFACE_VERSION,
  evaluateSupplierEconomics,
} from '../_shared/supplierEconomics';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/626_supplier_commercial_economics.sql');
const guards = repo('supabase/627_supplier_commercial_economics_guards.sql');
const adminApi = repo('netlify/functions/admin-supplier-economics.ts');

const OFFER_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';

describe('Phase G Commercial Economics', () => {
  it('models landed cost, tax rule versions, pricing and canonical financial ledger separately', () => {
    expect(migration).toContain('private.supplier_landed_cost_snapshots');
    expect(migration).toContain('private.supplier_tax_rule_versions');
    expect(migration).toContain('private.supplier_pricing_snapshots');
    expect(migration).toContain('private.commerce_financial_ledger_entries');
  });

  it('keeps landed-cost components explicit instead of hiding them inside retail price', () => {
    for (const field of ['supplier_product_cost','supplier_shipping_cost','carrier_cost','customs_duty','import_vat','fx_cost','other_cost','total_landed_cost']) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain('importer_of_record');
    expect(migration).toContain('ship_from_country');
  });

  it('requires evidence-driven versioned tax rules and keeps NI fail-closed', () => {
    expect(migration).toContain('version integer NOT NULL');
    expect(migration).toContain('evidence_refs jsonb');
    expect(migration).toContain('evidence_hash text');
    expect(migration).toContain("commercial_mode IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')");
    expect(migration).toContain("v_territory <> 'GB'");
    expect(guards).toContain('NI requires a separately verified rule set');
  });

  it('enforces transparent buyer-price components and a margin guard', () => {
    for (const field of ['merchandise_amount','mandatory_fee_amount','customer_shipping_charge','tax_amount','gross_customer_price']) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain('gross_customer_price = merchandise_amount + mandatory_fee_amount + customer_shipping_charge + tax_amount');
    expect(migration).toContain('expected_contribution >= minimum_contribution');
    expect(migration).toContain("'margin_guard_failed'");
  });

  it('makes the financial ledger append-only and uses correction events', () => {
    expect(migration).toContain('financial ledger entries are append-only; record an adjustment or reversal event');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON private.commerce_financial_ledger_entries');
    expect(migration).toContain("'customer_refund'");
    expect(migration).toContain("'supplier_recovery'");
    expect(migration).toContain("'chargeback'");
    expect(migration).toContain("'unrecovered_loss'");
    expect(migration).toContain("'adjustment'");
    expect(migration).toContain("'reversal'");
  });

  it('keeps verified tax, landed-cost and pricing history immutable by versioning', () => {
    expect(guards).toContain('verified commercial evidence is immutable; create a new version/snapshot');
    expect(guards).toContain('trg_guard_tax_rule_history_v1');
    expect(guards).toContain('trg_guard_landed_cost_history_v1');
    expect(guards).toContain('trg_guard_pricing_history_v1');
  });

  it('requires upstream catalog and import readiness before commercial eligibility', () => {
    expect(migration).toContain('server_supplier_catalog_decision_v1');
    expect(migration).toContain('server_supplier_import_decision_v1');
    expect(migration).toContain("'catalog_not_ready'");
    expect(migration).toContain("'import_not_ready'");
  });

  it('keeps all Phase G storage private and exposes only server RPC boundaries', () => {
    for (const table of ['supplier_tax_rule_versions','supplier_landed_cost_snapshots','supplier_pricing_snapshots','commerce_financial_ledger_entries']) {
      expect(migration).toContain(`REVOKE ALL ON TABLE private.${table} FROM PUBLIC, anon, authenticated, service_role`);
    }
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_commercial_decision_v1');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.server_append_financial_ledger_v1');
    expect(guards).toContain('GRANT EXECUTE ON FUNCTION public.server_admin_supplier_economics_v1');
  });

  it('requires active-admin authority and rejects secret-bearing admin payloads', () => {
    expect(guards).toContain("u.role = 'admin'");
    expect(guards).toContain('u."isActive" = true');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toContain('password|secret|access[_-]?token');
  });

  it('does not enable Supplier Commerce while installing economics foundations', () => {
    expect(migration).not.toContain('SET enabled = true');
    expect(guards).not.toContain('SET enabled = true');
    expect(guards).toContain('No control is enabled by Phase G');
  });

  it('fails closed when commercial-economics RPC evidence is unavailable or malformed', async () => {
    const rpc = vi.fn(async () => ({ data: { eligible: true }, error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    await expect(evaluateSupplierEconomics(client, {
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      commercialMode: 'loadify_supplier_fulfilled',
    })).resolves.toEqual({
      eligible: false,
      reason: 'supplier_economics_unavailable',
      interfaceVersion: SUPPLIER_ECONOMICS_INTERFACE_VERSION,
    });
  });

  it('accepts only structurally complete server commercial evidence', async () => {
    const expected = {
      eligible: true,
      reason: 'commercial_economics_ready',
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      pricingSnapshotId: '33333333-3333-4333-8333-333333333333',
      landedCostSnapshotId: '44444444-4444-4444-8444-444444444444',
      taxRuleVersionId: '55555555-5555-4555-8555-555555555555',
      currency: 'GBP',
      grossCustomerPrice: 19.99,
      pricingPolicyVersion: 1,
      interfaceVersion: 1,
    };
    const rpc = vi.fn(async () => ({ data: expected, error: null }));
    const client = { rpc } as unknown as SupabaseClient;

    await expect(evaluateSupplierEconomics(client, {
      supplierOfferId: OFFER_ID,
      canonicalProductId: PRODUCT_ID,
      commercialMode: 'loadify_supplier_fulfilled',
    })).resolves.toEqual(expected);

    expect(rpc).toHaveBeenCalledWith('server_supplier_commercial_decision_v1', {
      p_supplier_offer_id: OFFER_ID,
      p_canonical_product_id: PRODUCT_ID,
      p_commercial_mode: 'loadify_supplier_fulfilled',
      p_territory: 'GB',
    });
  });
});
