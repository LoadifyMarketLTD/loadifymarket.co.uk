import { describe, expect, it } from 'vitest';
import { evaluatePhaseOPilotAutonomyReadiness } from '../_shared/phaseOPilotAutonomyReadiness';

const NOW = new Date('2026-09-01T11:00:00.000Z');

const providerReady = () => ({
  registered: true,
  availability: 'available' as const,
  reason: 'CAPABILITY_AVAILABLE',
  externalMutationAllowed: true,
  piiDisclosureAllowed: true,
});

const shadowReady = () => ({
  evidenceRef: 'pilot-evidence:shadow-review-1',
  policyVersion: 'shadow-mode-v1',
  reviewedAt: '2026-09-01T10:30:00.000Z',
  sampleSize: 25,
  resolvedComparisons: 20,
  operatorRelative: true as const,
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
      shadowReview: shadowReady(),
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
      shadowReview: { ...shadowReady(), reviewedAt: '2026-09-02T00:00:00.000Z' },
      now: NOW,
    });
    expect(future.blockers).toContain('shadow_mode_review_not_demonstrated');

    const empty = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-5',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: { ...shadowReady(), sampleSize: 0, resolvedComparisons: 0 },
      now: NOW,
    });
    expect(empty.blockers).toContain('shadow_mode_review_not_demonstrated');
  });

  it('can report readiness only when all independent gates are demonstrated', () => {
    const result = evaluatePhaseOPilotAutonomyReadiness({
      pilotId: 'pilot-6',
      providerKey: 'provider-a',
      canonicalReady: true,
      providerOrderExecution: providerReady(),
      shadowReview: shadowReady(),
      now: NOW,
    });
    expect(result.ready).toBe(true);
    expect(result.reason).toBe('phase_o_autonomy_ready');
    expect(result.blockers).toEqual([]);
    expect(result.shadowReview.demonstrated).toBe(true);
    expect(result.externalMutationPerformed).toBe(false);
    expect(result.pilotActivationPerformed).toBe(false);
    expect(result.paymentMutationPerformed).toBe(false);
  });
});
