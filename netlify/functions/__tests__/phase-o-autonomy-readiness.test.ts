import { describe, expect, it } from 'vitest';
import {
  PHASE_O_SHADOW_REVIEW_CAPABILITY,
  PHASE_O_SHADOW_REVIEW_POLICY_VERSION,
  PHASE_O_SHADOW_REVIEW_SOURCE,
  evaluatePhaseOPilotAutonomyReadiness,
  type PhaseOShadowReviewEvidence,
} from '../_shared/phaseOPilotAutonomyReadiness';

const NOW = new Date('2026-09-01T11:00:00.000Z');

const providerReady = () => ({
  registered: true,
  availability: 'available' as const,
  reason: 'CAPABILITY_AVAILABLE',
  externalMutationAllowed: true,
  piiDisclosureAllowed: true,
});

const shadowReady = (pilotId: string, providerKey: string): PhaseOShadowReviewEvidence => ({
  pilotId,
  providerKey,
  capability: PHASE_O_SHADOW_REVIEW_CAPABILITY,
  source: PHASE_O_SHADOW_REVIEW_SOURCE,
  persistenceBound: true,
  evidenceRef: 'pilot-evidence:shadow-review-1',
  policyVersion: PHASE_O_SHADOW_REVIEW_POLICY_VERSION,
  reviewedAt: '2026-09-01T10:30:00.000Z',
  sampleSize: 25,
  resolvedComparisons: 20,
  operatorRelative: true,
  passed: true,
});

describe('Phase O Autonomous Operations readiness', () => {
  it('fails closed when canonical readiness provider execution and shadow review are absent', () => {
    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-1',
      providerKey: 'avasam',
      canonicalReady: false,
      providerOrderExecution: {
        registered: true,
        availability: 'unavailable',
        reason: 'CAPABILITY_UNVERIFIED',
        externalMutationAllowed: false,
        piiDisclosureAllowed: false,
      },
      shadowReview: null,
      now: NOW,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('canonical_pilot_activation_readiness_not_passed');
    expect(result.blockers).toContain('provider_order_submission_not_available');
    expect(result.blockers).toContain('provider_order_submission_external_mutation_not_allowed');
    expect(result.blockers).toContain('provider_order_submission_pii_disclosure_not_allowed');
    expect(result.blockers).toContain('shadow_mode_review_not_demonstrated');
  });

  it('does not allow provider execution alone to bypass Shadow Mode review', () => {
    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-2',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: null,
      now: NOW,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(['shadow_mode_review_not_demonstrated']);
  });

  it('requires the separate PII grant needed for supplier order submission', () => {
    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-3',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: {
        ...providerReady(),
        piiDisclosureAllowed: false,
      },
      shadowReview: shadowReady('pilot-3', 'provider-a'),
      now: NOW,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(['provider_order_submission_pii_disclosure_not_allowed']);
  });

  it('rejects a future or statistically empty Shadow review', () => {
    const future = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-4',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: { ...shadowReady('pilot-4', 'provider-a'), reviewedAt: '2026-09-02T00:00:00.000Z' },
      now: NOW,
    });
    expect(future.blockers).toContain('shadow_mode_review_invalid');

    const empty = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-5',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: { ...shadowReady('pilot-5', 'provider-a'), sampleSize: 0, resolvedComparisons: 0 },
      now: NOW,
    });
    expect(empty.blockers).toContain('shadow_mode_review_invalid');
  });

  it('rejects non-durable or untrusted Shadow evidence instead of accepting caller self-attestation', () => {
    const unbound = {
      ...shadowReady('pilot-6', 'provider-a'),
      persistenceBound: false,
      source: 'request_payload',
    } as unknown as PhaseOShadowReviewEvidence;

    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-6',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: unbound,
      now: NOW,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('shadow_mode_review_not_persistence_bound');
    expect(result.blockers).toContain('shadow_mode_review_source_untrusted');
  });

  it('rejects Shadow evidence from another pilot provider capability or policy version', () => {
    const wrongScope = {
      ...shadowReady('pilot-other', 'provider-b'),
      capability: 'shipment_stall_review',
      policyVersion: 'phase-o-order-shadow-v0',
    } as unknown as PhaseOShadowReviewEvidence;

    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-7',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: wrongScope,
      now: NOW,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('shadow_mode_review_pilot_mismatch');
    expect(result.blockers).toContain('shadow_mode_review_provider_mismatch');
    expect(result.blockers).toContain('shadow_mode_review_capability_mismatch');
    expect(result.blockers).toContain('shadow_mode_review_policy_mismatch');
  });

  it('requires a passed operator-relative review even when scope is correctly bound', () => {
    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-8',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: { ...shadowReady('pilot-8', 'provider-a'), passed: false },
      now: NOW,
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('shadow_mode_review_not_passed');
  });

  it('can report readiness only when all independent gates and exact Shadow bindings are demonstrated', () => {
    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-9',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: shadowReady('pilot-9', 'provider-a'),
      now: NOW,
    });
    expect(result.ready).toBe(true);
    expect(result.reason).toBe('phase_o_autonomy_ready');
    expect(result.blockers).toEqual([]);
    expect(result.interfaceVersion).toBe(2);
    expect(result.shadowReview.demonstrated).toBe(true);
    expect(result.shadowReview.validationBlockers).toEqual([]);
    expect(result.shadowReview.pilotId).toBe('pilot-9');
    expect(result.shadowReview.providerKey).toBe('provider-a');
    expect(result.shadowReview.capability).toBe('order_submission');
    expect(result.shadowReview.source).toBe('durable_shadow_review_v1');
    expect(result.shadowReview.policyVersion).toBe('phase-o-order-shadow-v1');
    expect(result.shadowReview.persistenceBound).toBe(true);
    expect(result.externalMutationPerformed).toBe(false);
    expect(result.pilotActivationPerformed).toBe(false);
    expect(result.paymentMutationPerformed).toBe(false);
  });
});
