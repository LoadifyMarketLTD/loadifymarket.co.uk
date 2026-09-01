import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Phase O autonomous runtime boundary', () => {
  it('deploys the guarded pilot handler through the configured modern directory', () => {
    const wrapper = repo('netlify/functions-modern/admin-supplier-pilot.ts');
    expect(wrapper).toContain("../functions/admin-supplier-pilot-runtime");
    expect(wrapper).toContain('withLambda(handler)');
  });

  it('intercepts activate, autonomous_readiness and shadow_observe before canonical mutation', () => {
    const runtime = repo('netlify/functions/admin-supplier-pilot-runtime.ts');
    expect(runtime).toContain("body.action !== 'activate'");
    expect(runtime).toContain("body.action !== 'autonomous_readiness'");
    expect(runtime).toContain("body.action !== 'shadow_observe'");
    expect(runtime).toContain("server_admin_supplier_pilot_status_v1");
    expect(runtime).toContain("server_supplier_pilot_activation_readiness_v1");
    expect(runtime).toContain('createProviderExecutionCapabilityRegistry()');
    expect(runtime).toContain('capability: PHASE_O_SHADOW_REVIEW_CAPABILITY');
    expect(runtime).toContain("server_get_supplier_pilot_shadow_review_v1");
    expect(runtime).toContain('evaluatePhaseOPilotAutonomyReadiness({');
    expect(runtime).toContain("reason: 'autonomous_pilot_readiness_failed'");
    expect(runtime).toContain('if (!autonomyReadiness.ready)');
    expect(runtime).toContain('return canonicalPilotHandler(event, context)');
  });

  it('accepts no caller Shadow system action and binds only durable server review evidence', () => {
    const runtime = repo('netlify/functions/admin-supplier-pilot-runtime.ts');
    const readiness = repo('netlify/functions/_shared/phaseOPilotAutonomyReadiness.ts');
    expect(runtime).not.toContain('shadowReviewEvidenceRef?:');
    expect(runtime).not.toContain('shadowReview?:');
    expect(runtime).not.toContain('systemAction?:');
    expect(runtime).toContain('toDurableShadowEvidence');
    expect(runtime).toContain('shadowReviewRequiredBinding');
    expect(runtime).toContain('pilotId,');
    expect(runtime).toContain('providerKey,');
    expect(runtime).toContain('capability: PHASE_O_SHADOW_REVIEW_CAPABILITY');
    expect(runtime).toContain('source: PHASE_O_SHADOW_REVIEW_SOURCE');
    expect(runtime).toContain('policyVersion: PHASE_O_SHADOW_REVIEW_POLICY_VERSION');
    expect(runtime).toContain('persistenceBound: true');
    expect(readiness).toContain('shadow_mode_review_not_demonstrated');
    expect(readiness).toContain('shadow_mode_review_not_persistence_bound');
    expect(readiness).toContain('shadow_mode_review_source_untrusted');
    expect(readiness).toContain('shadow_mode_review_pilot_mismatch');
    expect(readiness).toContain('shadow_mode_review_provider_mismatch');
    expect(readiness).toContain('shadow_mode_review_capability_mismatch');
    expect(readiness).toContain('shadow_mode_review_policy_mismatch');
  });

  it('keeps deploy-before-migration fail-closed when the durable reader is unavailable', () => {
    const runtime = repo('netlify/functions/admin-supplier-pilot-runtime.ts');
    expect(runtime).toContain('shadowReviewError');
    expect(runtime).toContain('? null');
    expect(runtime).toContain('shadowReviewReadAvailable: !shadowReviewError');
    expect(runtime).toContain('shadowReviewPersistenceBound: shadowReview?.persistenceBound === true');
  });

  it('keeps the runtime preflight free of direct provider financial and notification side effects', () => {
    const runtime = repo('netlify/functions/admin-supplier-pilot-runtime.ts');
    expect(runtime).not.toContain('submitOrder(');
    expect(runtime).not.toContain('cancelOrder(');
    expect(runtime).not.toContain('requestReturn(');
    expect(runtime).not.toContain('stripe.');
    expect(runtime).not.toContain('@sendgrid/mail');
    expect(runtime).toContain('providerMutationPerformed: false');
    expect(runtime).toContain('customerPiiDisclosurePerformed: false');
    expect(runtime).toContain('paymentMutationPerformed: false');
  });

  it('retains the canonical SQL activation recheck and complete single GB adapter requirement', () => {
    const closure = repo('supabase/668_supplier_controlled_pilot_cohort_evidence_closure.sql');
    const adapterGuard = repo('supabase/669_supplier_controlled_pilot_adapter_territory_guard.sql');
    expect(closure).toContain('v_readiness:=public.server_supplier_pilot_activation_readiness_v1(v_pilot.id)');
    expect(closure).toContain("IF COALESCE((v_readiness->>'ready')::boolean,false) IS DISTINCT FROM true");
    for (const capability of [
      'catalog','stock','price','shipping','order_submission','acknowledgement',
      'tracking','cancellation','returns','reimbursement',
    ]) {
      expect(adapterGuard).toContain(`'${capability}'`);
    }
    expect(adapterGuard).toContain("a.territory='GB'");
    expect(adapterGuard).toContain('a.capabilities @> v_required_capabilities');
  });
});
