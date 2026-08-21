import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const pilot = repo('supabase/665_supplier_controlled_pilot.sql');
const closure = repo('supabase/666_supplier_controlled_pilot_closure.sql');
const adminApi = repo('netlify/functions/admin-supplier-pilot.ts');
const orchestrator = repo('supabase/635_supplier_order_orchestrator_runtime_guards.sql');
const tracking = repo('supabase/644_supplier_tracking_exception_foundation.sql');
const contract = [
  repo('docs/canonical/loadify-supplier-commerce-2026-08-19/03_CANONICAL_EXECUTION_CONTRACT_LINES_1251_1750.md'),
  repo('docs/canonical/loadify-supplier-commerce-2026-08-19/04_CANONICAL_EXECUTION_CONTRACT_LINES_1751_2210.md'),
].join('\n');

describe('Phase O Controlled Pilot', () => {
  it('models an explicit GB one-supplier bounded pilot rather than global commerce', () => {
    expect(pilot).toContain("territory text NOT NULL DEFAULT 'GB'");
    expect(pilot).toContain("currency text NOT NULL DEFAULT 'GBP'");
    expect(pilot).toContain('minimum_product_count integer NOT NULL DEFAULT 5');
    expect(pilot).toContain('maximum_product_count integer NOT NULL DEFAULT 10');
    expect(pilot).toContain('supplier_pilot_one_live_program');
    expect(contract).toContain('SIMULATOR PASS');
    expect(contract).toContain('≠ PILOT PASS');
  });

  it('keeps a distinct pilot master control OFF by default and does not turn on global Supplier Commerce', () => {
    expect(pilot).toContain("('pilot','global',NULL,false,'Phase O controlled pilot safe default')");
    expect(pilot).toContain("'globalSupplierCommerceEnabled',false");
    expect(pilot).toContain('Supplier Commerce remains OFF');
  });

  it('keeps pilot definition, offers, evidence and audit private', () => {
    for (const table of ['supplier_pilot_programs','supplier_pilot_offers','supplier_pilot_evidence','supplier_pilot_audit']) {
      expect(pilot).toContain(`private.${table}`);
    }
    expect(pilot.match(/REVOKE ALL ON TABLE private\.supplier_pilot_/g)?.length).toBeGreaterThanOrEqual(4);
    expect(pilot).toContain('FROM PUBLIC,anon,authenticated,service_role');
  });

  it('requires explicit volume, order-value and acceptance thresholds before a pilot exists', () => {
    for (const key of ['maximum_order_count','maximum_order_value_minor','acknowledgementRateMinPct','duplicateSideEffectsMax','oversellMax','unreconciledFinancialExceptionsMax','criticalIncidentMax']) {
      expect(pilot).toContain(key);
    }
    expect(closure).toContain('supplier_pilot_threshold_value_check');
  });

  it('requires only low-risk selected offers and caps the pilot set at ten products', () => {
    expect(pilot).toContain("risk_class text NOT NULL DEFAULT 'low'");
    expect(pilot).toContain("CONSTRAINT supplier_pilot_offer_risk_check CHECK (risk_class='low')");
    expect(pilot).toContain('pilot product ceiling reached');
    expect(pilot).toContain('active canonical product required');
  });

  it('keeps the foundation migration executable before the closure replaces its control helper', () => {
    expect(pilot).toContain('SELECT p,s INTO v_pilot,v_supplier');
    expect(pilot).not.toContain('SELECT p.*,s.* INTO v_pilot,v_supplier');
  });

  it('derives supplier identity only from the exact allowlisted offer for runtime callers that omit supplierRef', () => {
    expect(orchestrator).toContain("'offerRef',v_offer.offer_key");
    expect(closure).toContain('JOIN private.supplier_pilot_offers po ON po.pilot_id=p.id');
    expect(closure).toContain("v_offer_ref IN (o.id::text,o.offer_key)");
    expect(closure).toContain("o.status='approved'");
    expect(closure).toContain("'pilot_supplier_or_offer_scope_required'");
  });

  it('allows preparation-only import and stock/price sync while buyer-facing pilot operations remain blocked', () => {
    expect(pilot).toContain("v_pilot.status='preparing' AND v_operation NOT IN ('import','stock_sync','price_sync')");
    expect(pilot).toContain("'buyerFacingOperationsEnabled',false");
    expect(pilot).toContain("'pilot_not_active'");
  });

  it('respects supplier provider territory cohort offer and product kill switches inside the pilot path', () => {
    for (const scope of ["scope_type='supplier'","scope_type='provider'","scope_type='territory'","scope_type='cohort'","scope_type='offer'","scope_type='product'"]) {
      expect(closure).toContain(scope);
    }
    expect(closure).toContain("'scoped_kill_switch'");
  });

  it('enforces order value and order volume before a new supplier reservation is inserted', () => {
    expect(closure).toContain('trg_guard_supplier_pilot_reservation_limits_v1');
    expect(closure).toContain('BEFORE INSERT ON private.supplier_stock_reservations');
    expect(closure).toContain('controlled pilot order value ceiling exceeded');
    expect(closure).toContain('controlled pilot order volume ceiling reached');
    expect(closure).toContain('count(DISTINCT r.order_id)');
  });

  it('requires factual supplier foundation governance provider capability adapter and stock/price readiness before activation', () => {
    for (const phrase of ['server_supplier_foundation_decision_v1','server_supplier_governance_decision_v1','supplier_commerce_provider_capabilities','supplier_adapter_registrations','server_supplier_catalog_decision_v1','server_supplier_stock_price_decision_v1']) {
      expect(pilot).toContain(phrase);
    }
    expect(pilot).toContain("'controlled_pilot_ready'");
    expect(pilot).toContain("'controlled_pilot_not_ready'");
  });

  it('preserves first activation across a real pause/restart kill-switch exercise', () => {
    expect(closure).toContain('activated_at=COALESCE(activated_at,now())');
    expect(pilot).toContain("server_admin_pause_supplier_pilot_v1");
    expect(pilot).toContain("'pilotControlEnabled',false");
  });

  it('requires real orders acknowledgement tracking delivery and full return/refund/recovery evidence for Pilot PASS', () => {
    for (const phrase of ['no_real_pilot_orders','acknowledgement_rate','no_real_tracking_event','no_delivered_pilot_order','return_refund_recovery']) {
      expect(closure).toContain(phrase);
    }
    expect(closure).toContain('supplier_customer_refund_evidence');
    expect(closure).toContain('supplier_recovery_evidence');
  });

  it('treats canonical stock-disappeared and duplicate-submit exceptions as explicit pilot acceptance metrics', () => {
    expect(tracking).toContain("'duplicate_submit'");
    expect(tracking).toContain("'stock_disappeared'");
    expect(closure).toContain("x.exception_type='duplicate_submit'");
    expect(closure).toContain("x.exception_type='stock_disappeared'");
    expect(closure).toContain("'duplicate_side_effects'");
    expect(closure).toContain("'oversell'");
  });

  it('requires zero-unrecovered-loss financial reconciliation for pilot orders', () => {
    expect(closure).toContain("f.state='reconciled'");
    expect(closure).toContain('COALESCE(abs(f.unrecovered_loss),0)=0');
    expect(closure).toContain("'financial_reconciliation'");
  });

  it('requires buyer communication operator escalation and an audited real kill-switch disable transition', () => {
    for (const evidence of ['buyer_communication','operator_escalation','kill_switch_test']) expect(closure).toContain(`'${evidence}'`);
    expect(closure).toContain("a.operation='pilot'");
    expect(closure).toContain('a.new_enabled=false');
    expect(closure).toContain("'kill_switch_control_audit'");
  });

  it('will not complete Phase O unless the no-fake-pass acceptance function itself passes', () => {
    expect(pilot).toContain('server_supplier_pilot_acceptance_v1(v_pilot.id)');
    expect(pilot).toContain("'pilot_acceptance_failed'");
    expect(pilot).toContain("'pilotPass',true");
    expect(closure).toContain("'simulatorPassIsNotPilotPass',true");
  });

  it('exposes the pilot only through an authenticated admin server boundary and rejects secret-bearing payloads', () => {
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(adminApi).toContain('containsSecretMaterial');
    expect(adminApi).toContain('Raw credentials or secrets are forbidden');
    for (const action of ['status','create','add_offer','readiness','prepare','activate','record_evidence','acceptance','pause','complete']) {
      expect(adminApi).toContain(`'${action}'`);
    }
  });

  it('does not introduce Workspace or Super Admin visual changes', () => {
    expect(adminApi).not.toContain('Workspace');
    expect(adminApi).not.toContain('SuperAdmin');
    expect(pilot).not.toContain('Workspace');
    expect(pilot).not.toContain('SuperAdmin');
  });
});
