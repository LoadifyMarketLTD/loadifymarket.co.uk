export const PHASE_O_AUTONOMY_READINESS_INTERFACE_VERSION = 1 as const;
export const PHASE_O_AUTONOMY_READINESS_POLICY_VERSION = 'phase-o-autonomy-readiness-v1' as const;

export interface PhaseOProviderOrderExecutionState {
  registered: boolean;
  availability: 'available' | 'manual_only' | 'unavailable';
  reason: string;
  externalMutationAllowed: boolean;
  piiDisclosureAllowed: boolean;
}

export interface PhaseOShadowReviewEvidence {
  evidenceRef: string;
  policyVersion: string;
  reviewedAt: string;
  sampleSize: number;
  resolvedComparisons: number;
  operatorRelative: true;
  passed: boolean;
}

export interface PhaseOPilotAutonomyReadinessInput {
  pilotId: string;
  providerKey: string;
  canonicalReady: boolean;
  providerOrderExecution: PhaseOProviderOrderExecutionState;
  shadowReview?: PhaseOShadowReviewEvidence | null;
  now?: Date;
}

export interface PhaseOPilotAutonomyReadinessV1 {
  interfaceVersion: typeof PHASE_O_AUTONOMY_READINESS_INTERFACE_VERSION;
  policyVersion: typeof PHASE_O_AUTONOMY_READINESS_POLICY_VERSION;
  pilotId: string;
  providerKey: string;
  ready: boolean;
  reason: 'phase_o_autonomy_ready' | 'phase_o_autonomy_not_ready';
  blockers: string[];
  canonicalReady: boolean;
  providerOrderExecution: PhaseOProviderOrderExecutionState;
  shadowReview: {
    demonstrated: boolean;
    evidenceRef: string | null;
    policyVersion: string | null;
    reviewedAt: string | null;
    sampleSize: number;
    resolvedComparisons: number;
    operatorRelative: boolean;
    passed: boolean;
  };
  externalMutationPerformed: false;
  pilotActivationPerformed: false;
  paymentMutationPerformed: false;
}

function required(value: string, field: string): string {
  const output = value.trim();
  if (!output) throw new Error(`${field} is required`);
  return output;
}

function validShadowReview(
  review: PhaseOShadowReviewEvidence | null | undefined,
  now: Date,
): boolean {
  if (!review) return false;
  if (!review.evidenceRef.trim() || !review.policyVersion.trim()) return false;
  const reviewedAt = Date.parse(review.reviewedAt);
  if (Number.isNaN(reviewedAt) || reviewedAt > now.getTime()) return false;
  if (!Number.isSafeInteger(review.sampleSize) || review.sampleSize <= 0) return false;
  if (
    !Number.isSafeInteger(review.resolvedComparisons)
    || review.resolvedComparisons <= 0
    || review.resolvedComparisons > review.sampleSize
  ) return false;
  if (review.operatorRelative !== true || review.passed !== true) return false;
  return true;
}

/**
 * Defense-in-depth overlay for the Phase O admin runtime boundary.
 *
 * Canonical SQL readiness remains authoritative for Supplier Foundation,
 * governance, cohort, caps, simulator evidence, kill switches and the single
 * fully verified GB adapter. This overlay adds the newer Autonomous Operations
 * invariants without pretending they are already persisted in the older pilot
 * schema: Lane G must permit real order submission and a durable Lane H Shadow
 * review must be demonstrated before the admin runtime may request activation.
 */
export function evaluatePhaseOPilotAutonomyReadiness(
  input: PhaseOPilotAutonomyReadinessInput,
): PhaseOPilotAutonomyReadinessV1 {
  const pilotId = required(input.pilotId, 'pilotId');
  const providerKey = required(input.providerKey, 'providerKey').toLowerCase();
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error('now must be valid');

  const blockers: string[] = [];
  if (!input.canonicalReady) blockers.push('canonical_pilot_activation_readiness_not_passed');
  if (!input.providerOrderExecution.registered) blockers.push('provider_order_submission_contract_not_registered');
  else if (input.providerOrderExecution.availability !== 'available') blockers.push('provider_order_submission_not_available');
  if (!input.providerOrderExecution.externalMutationAllowed) blockers.push('provider_order_submission_external_mutation_not_allowed');
  if (!input.providerOrderExecution.piiDisclosureAllowed) blockers.push('provider_order_submission_pii_disclosure_not_allowed');

  const shadowDemonstrated = validShadowReview(input.shadowReview, now);
  if (!shadowDemonstrated) blockers.push('shadow_mode_review_not_demonstrated');

  const shadow = input.shadowReview;
  const ready = blockers.length === 0;
  return Object.freeze({
    interfaceVersion: PHASE_O_AUTONOMY_READINESS_INTERFACE_VERSION,
    policyVersion: PHASE_O_AUTONOMY_READINESS_POLICY_VERSION,
    pilotId,
    providerKey,
    ready,
    reason: ready ? 'phase_o_autonomy_ready' : 'phase_o_autonomy_not_ready',
    blockers: [...new Set(blockers)],
    canonicalReady: input.canonicalReady,
    providerOrderExecution: { ...input.providerOrderExecution },
    shadowReview: {
      demonstrated: shadowDemonstrated,
      evidenceRef: shadow?.evidenceRef?.trim() || null,
      policyVersion: shadow?.policyVersion?.trim() || null,
      reviewedAt: shadow?.reviewedAt ?? null,
      sampleSize: shadow?.sampleSize ?? 0,
      resolvedComparisons: shadow?.resolvedComparisons ?? 0,
      operatorRelative: shadow?.operatorRelative === true,
      passed: shadow?.passed === true,
    },
    externalMutationPerformed: false,
    pilotActivationPerformed: false,
    paymentMutationPerformed: false,
  });
}
