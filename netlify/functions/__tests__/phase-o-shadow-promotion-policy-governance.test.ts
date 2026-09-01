import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const migration = repo('supabase/migrations/20260901144900_phase_o_shadow_promotion_policy_governance.sql');

const createPolicy = 'public.server_admin_create_supplier_pilot_shadow_promotion_policy_v1(uuid,text,text,integer,integer,integer,integer,integer,integer,integer,jsonb)';
const approvePolicy = 'public.server_admin_approve_supplier_pilot_shadow_promotion_policy_v1(uuid,uuid,text,jsonb)';
const retirePolicy = 'public.server_admin_retire_supplier_pilot_shadow_promotion_policy_v1(uuid,uuid,text)';

describe('Phase O Shadow promotion policy governance', () => {
  it('keeps policy and audit history private and RLS protected', () => {
    expect(migration).toContain('private.supplier_pilot_shadow_promotion_policies');
    expect(migration).toContain('private.supplier_pilot_shadow_promotion_policy_audit');
    expect(migration).toContain('ALTER TABLE private.supplier_pilot_shadow_promotion_policies ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE private.supplier_pilot_shadow_promotion_policy_audit ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      'REVOKE ALL ON TABLE private.supplier_pilot_shadow_promotion_policies FROM PUBLIC,anon,authenticated,service_role',
    );
    expect(migration).toContain(
      'REVOKE ALL ON TABLE private.supplier_pilot_shadow_promotion_policy_audit FROM PUBLIC,anon,authenticated,service_role',
    );
    expect(migration).toContain('trg_guard_supplier_pilot_shadow_promotion_policy_v1');
    expect(migration).toContain('trg_guard_supplier_pilot_shadow_promotion_policy_audit_v1');
  });

  it('requires explicit versioned criteria without inventing a default approved policy', () => {
    for (const field of [
      'minimum_sample_size',
      'minimum_resolved_comparisons',
      'minimum_agreement_rate_basis_points',
      'maximum_false_positive_count',
      'maximum_false_negative_count',
      'maximum_ambiguous_count',
    ]) expect(migration).toContain(field);
    expect(migration).toContain("status text NOT NULL DEFAULT 'draft'");
    expect(migration).toContain("policy_version integer NOT NULL");
    expect(migration).toContain("observation_policy_version='phase-o-order-shadow-v1'");
    expect(migration).toContain("p_policy_version IS NULL OR p_policy_version<=0");
    expect(migration).toContain("p_evidence,'{}'::jsonb)='{}'::jsonb");
    expect(migration).toContain("v_provider_key,v_territory,p_policy_version,'draft'");
    expect(migration).toContain('No approved policy row is created by this migration');
  });

  it('uses separate create approve and retire lifecycle RPCs with active-admin authority', () => {
    expect(migration).toContain('PERFORM private.require_active_admin_v1(p_actor_id)');
    expect(migration).toContain('only a draft Shadow promotion policy can be approved');
    expect(migration).toContain('retire the current approved Shadow promotion policy before approving a replacement');
    expect(migration).toContain('only an approved Shadow promotion policy can be retired');
    expect(migration).toContain("action IN ('created','approved','retired')");
    expect(migration).toContain('Shadow promotion policy criteria and evidence are immutable; create a new version');
  });

  it('rejects retroactive evidence and binds each observation to a pre-approved policy', () => {
    expect(migration).toContain('Phase O Shadow promotion policy binding requires zero pre-policy observations');
    expect(migration).toContain('promotion_policy_id uuid REFERENCES private.supplier_pilot_shadow_promotion_policies(id)');
    expect(migration).toContain('ALTER COLUMN promotion_policy_id SET NOT NULL');
    expect(migration).toContain('ALTER COLUMN promotion_policy_version SET NOT NULL');
    expect(migration).toContain("p.status='approved'");
    expect(migration).toContain('approved Shadow promotion policy is required before observations');
    expect(migration).toContain('v_order.created_at<v_promotion_policy.approved_at');
    expect(migration).toContain('Shadow observation order predates approved promotion policy');
    expect(migration).toContain('promotion_policy_id,promotion_policy_version');
    expect(migration).toContain("'promotionPolicyId',v_promotion_policy.id");
    expect(migration).toContain("'promotionPolicyVersion',v_promotion_policy.policy_version");
  });

  it('evaluates only observations collected under the exact current approved policy', () => {
    expect(migration).toContain('promotion_policy_id=v_policy.id');
    expect(migration).toContain('promotion_policy_version=v_policy.policy_version');
    expect(migration).toContain('recorded_at>=v_policy.approved_at');
    expect(migration).toContain('v_total>=v_policy.minimum_sample_size');
    expect(migration).toContain('v_resolved>=v_policy.minimum_resolved_comparisons');
    expect(migration).toContain('v_agreement_rate_basis_points>=v_policy.minimum_agreement_rate_basis_points');
    expect(migration).toContain('v_false_positive<=v_policy.maximum_false_positive_count');
    expect(migration).toContain('v_false_negative<=v_policy.maximum_false_negative_count');
    expect(migration).toContain('v_ambiguous<=v_policy.maximum_ambiguous_count');
    expect(migration).toContain("'passPolicyConfigured',v_policy.id IS NOT NULL");
    expect(migration).toContain("WHEN v_policy.id IS NULL THEN 'shadow_promotion_policy_not_configured'");
    expect(migration).toContain("WHEN v_passed THEN 'shadow_promotion_policy_passed'");
  });

  it('exposes governance and review boundaries to service_role only', () => {
    for (const fn of [createPolicy, approvePolicy, retirePolicy]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${fn}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${fn}`);
    }
    expect(migration).toContain('FROM PUBLIC,anon,authenticated,service_role');
    expect(migration).toContain('TO service_role');
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.server_record_supplier_pilot_shadow_observation_v1(uuid,uuid,uuid,text,text,text,boolean,text)',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.server_get_supplier_pilot_shadow_review_v1(uuid,uuid)',
    );
  });

  it('does not perform provider financial notification or activation mutations', () => {
    expect(migration).not.toContain('stripe.');
    expect(migration).not.toContain('submit_order(');
    expect(migration).not.toContain('request_refund');
    expect(migration).not.toContain('send_email');
    expect(migration).not.toContain("SET status='active'");
    expect(migration).toContain('No pilot control changes');
  });
});
