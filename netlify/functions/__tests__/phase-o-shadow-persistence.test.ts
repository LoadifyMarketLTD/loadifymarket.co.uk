import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/migrations/20260901141607_phase_o_shadow_observation_persistence.sql');
const runtime = repo('netlify/functions/admin-supplier-pilot-runtime.ts');

describe('Phase O durable Shadow persistence', () => {
  it('keeps observations private, RLS-protected and append-only', () => {
    expect(migration).toContain('private.supplier_pilot_shadow_observations');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      'REVOKE ALL ON TABLE private.supplier_pilot_shadow_observations FROM PUBLIC,anon,authenticated,service_role',
    );
    expect(migration).toContain('trg_guard_supplier_pilot_shadow_observation_immutable_v1');
    expect(migration).toContain('private.guard_supplier_pilot_history_v1()');
    expect(migration).toContain('UNIQUE(pilot_id,order_id,policy_version)');
  });

  it('records only contemporaneous real pilot-scoped orders and derives the system action server-side', () => {
    expect(migration).toContain('Shadow observation requires an existing order');
    expect(migration).toContain('Shadow observation order predates pilot preparation');
    expect(migration).toContain('c.added_at<=v_order.created_at');
    expect(migration).toContain('po.approved_at<=v_order.created_at');
    expect(migration).toContain('so.approved_at<=v_order.created_at');
    expect(migration).toContain('Shadow observation order buyer is outside the contemporaneous pilot cohort');
    expect(migration).toContain('Shadow observation order product is outside the contemporaneous pilot offer set');
    expect(migration).toContain('Shadow observation order value is outside the pilot cap');
    expect(migration).toContain('server_supplier_pilot_activation_readiness_v1(v_pilot.id)');
    expect(migration).toContain(
      "v_system_action:=CASE WHEN v_canonical_ready AND v_provider_ready THEN 'submit_order' ELSE 'no_action' END",
    );
    expect(migration).not.toContain('p_system_action text');
    expect(migration).not.toContain('p_passed boolean');
  });

  it('accepts operator review but never accepts a caller-provided PASS decision', () => {
    expect(migration).toContain('p_operator_action text');
    expect(migration).toContain('p_operator_status text');
    expect(migration).toContain("classification IN ('agreement','false_positive','false_negative','ambiguous')");
    expect(migration).toContain("'passed',false");
    expect(migration).toContain("'passPolicyConfigured',false");
    expect(migration).toContain("'shadow_pass_policy_not_configured'");
    expect(migration).toContain("policy_version text NOT NULL DEFAULT 'phase-o-order-shadow-v1'");
  });

  it('exposes only service-role RPC access for the persistence boundary', () => {
    for (const fn of [
      'public.server_record_supplier_pilot_shadow_observation_v1(uuid,uuid,uuid,text,text,text,boolean,text)',
      'public.server_get_supplier_pilot_shadow_review_v1(uuid,uuid)',
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${fn}`);
      expect(migration).toContain('FROM PUBLIC,anon,authenticated,service_role');
    }
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.server_record_supplier_pilot_shadow_observation_v1(uuid,uuid,uuid,text,text,text,boolean,text)',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.server_get_supplier_pilot_shadow_review_v1(uuid,uuid)',
    );
    expect(migration).toContain('TO service_role');
  });

  it('binds runtime observation input to operator outcome only', () => {
    expect(runtime).toContain("body.action !== 'shadow_observe'");
    expect(runtime).toContain('server_record_supplier_pilot_shadow_observation_v1');
    expect(runtime).toContain('server_get_supplier_pilot_shadow_review_v1');
    expect(runtime).toContain('p_provider_contract_ready: providerOrderContractReady');
    expect(runtime).toContain('p_provider_contract_reason: providerOrderExecution.reason');
    expect(runtime).toContain('policyVersion: PHASE_O_SHADOW_REVIEW_POLICY_VERSION');
    expect(runtime).not.toContain('systemAction?:');
    expect(runtime).not.toContain('shadowReview?:');
  });

  it('keeps durable Shadow persistence side-effect free outside its evidence ledger', () => {
    expect(runtime).not.toContain('submitOrder(');
    expect(runtime).not.toContain('cancelOrder(');
    expect(runtime).not.toContain('requestReturn(');
    expect(runtime).not.toContain('stripe.');
    expect(runtime).not.toContain('@sendgrid/mail');
    expect(runtime).toContain('activationPerformed: false');
    expect(runtime).toContain('providerMutationPerformed: false');
    expect(runtime).toContain('customerPiiDisclosurePerformed: false');
    expect(runtime).toContain('paymentMutationPerformed: false');
  });
});
