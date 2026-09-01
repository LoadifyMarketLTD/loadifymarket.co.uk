export const PHASE_O_AUTONOMY_READINESS_INTERFACE_VERSION = 3 as const;
export const PHASE_O_AUTONOMY_READINESS_POLICY_VERSION = 'phase-o-autonomy-readiness-v3' as const;
export const PHASE_O_SHADOW_REVIEW_CAPABILITY = 'order_submission' as const;
export const PHASE_O_SHADOW_REVIEW_SOURCE = 'durable_shadow_review_v1' as const;
export const PHASE_O_SHADOW_REVIEW_POLICY_VERSION = 'phase-o-order-shadow-v1' as const;

export interface PhaseOProviderOrderExecutionState {
  registered: boolean;
  availability: 'available' | 'manual_only' | 'unavailable';
  reason: string;
  externalMutationAllowed: boolean;
  piiDisclosureAllowed: boolean;
}

export interface PhaseOShadowReviewEvidence {
  pilotId: string;
  providerKey: string;
  capability: typeof PHASE_O_SHADOW_REVIEW_CAPABILITY;
  source: typeof PHASE_O_SHADOW_REVIEW_SOURCE;
  persistenceBound: true;
  evidenceRef: string;
  policyVersion: typeof PHASE_O_SHADOW_REVIEW_POLICY_VERSION;
  reviewedAt: string;
  sampleSize: number;
  resolvedComparisons: number;
  operatorRelative: true;
  promotionPolicyConfigured: boolean;
  promotionPolicyId: string | null;
  promotionPolicyVersion: number | null;
  promotionPolicyApprovedAt: string | null;
  passed: boolean;
}

export type PhaseOShadowReviewBlocker =
  | 'shadow_mode_review_not_demonstrated'
  | 'shadow_mode_review_not_persistence_bound'
  | 'shadow_mode_review_source_untrusted'
  | 'shadow_mode_review_pilot_mismatch'
  | 'shadow_mode_review_provider_mismatch'
  | 'shadow_mode_review_capability_mismatch'
  | 'shadow_mode_review_policy_mismatch'
  | 'shadow_mode_promotion_policy_not_configured'
  | 'shadow_mode_promotion_policy_invalid'
  | 'shadow_mode_review_invalid'
  | 'shadow_mode_review_not_passed';

export interface PhaseOPilotAutonomyReadinessInput {
  pilotId: string;
  providerKey: string;
  canonicalReady: boolean;
  providerOrderExecution: PhaseOProviderOrderExecutionState;
  shadowReview?: PhaseOShadowReviewEvidence | null;
  now?: Date;
}

export interface PhaseOPilotAutonomyReadinessV3 {
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
    validationBlockers: PhaseOShadowReviewBlocker[];
    pilotId: string | null;
    providerKey: string | null;
    capability: string | null;
    source: string | null;
    persistenceBound: boolean;
    evidenceRef: string | null;
    policyVersion: string | null;
    reviewedAt: string | null;
    sampleSize: number;
    resolvedComparisons: number;
    operatorRelative: boolean;
    promotionPolicyConfigured: boolean;
    promotionPolicyId: string | null;
    promotionPolicyVersion: number | null;
    promotionPolicyApprovedAt: string | null;
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

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function shadowReviewBlockers(
  review: PhaseOShadowReviewEvidence | null | undefined,
  expected: { pilotId: string; providerKey: string },
  now: Date,
): PhaseOShadowReviewBlocker[] {
  if (!review) return ['shadow_mode_review_not_demonstrated'];

  const blockers: PhaseOShadowReviewBlocker[] = [];
  if (review.persistenceBound !== true) blockers.push('shadow_mode_review_not_persistence_bound');
  if (text(review.source) !== PHASE_O_SHADOW_REVIEW_SOURCE) blockers.push('shadow_mode_review_source_untrusted');
  if (text(review.pilotId) !== expected.pilotId) blockers.push('shadow_mode_review_pilot_mismatch');
  if (text(review.providerKey).toLowerCase() !== expected.providerKey) blockers.push('shadow_mode_review_provider_mismatch');
  if (text(review.capability) !== PHASE_O_SHADOW_REVIEW_CAPABILITY) blockers.push('shadow_mode_review_capability_mismatch');
  if (text(review.policyVersion) !== PHASE_O_SHADOW_REVIEW_POLICY_VERSION) blockers.push('shadow_mode_review_policy_mismatch');

  const reviewedAt = Date.parse(review.reviewedAt);
  const validMetrics = Number.isSafeInteger(review.sampleSize)
    && review.sampleSize > 0
    && Number.isSafeInteger(review.resolvedComparisons)
    && review.resolvedComparisons > 0
    && review.resolvedComparisons <= review.sampleSize;
  if (
    !text(review.evidenceRef)
    || Number.isNaN(reviewedAt)
    || reviewedAt > now.getTime()
    || !validMetrics
    || review.operatorRelative !== true
  ) blockers.push('shadow_mode_review_invalid');

  if (review.promotionPolicyConfigured !== true) {
    blockers.push('shadow_mode_promotion_policy_not_configured');
  } else {
    const promotionApprovedAt = Date.parse(review.promotionPolicyApprovedAt ?? '');
    const validPromotionPolicy = Boolean(text(review.promotionPolicyId))
      && Number.isSafeInteger(review.promotionPolicyVersion)
      && (review.promotionPolicyVersion ?? 0) > 0
      && !Number.isNaN(promotionApprovedAt)
      && promotionApprovedAt <= now.getTime()
      && !Number.isNaN(reviewedAt)
      && promotionApprovedAt <= reviewedAt;
    if (!validPromotionPolicy) blockers.push('shadow_mode_promotion_policy_invalid');
  }

  if (review.passed !== true) blockers.push('shadow_mode_review_not_passed');

  return [...new Set(blockers)];
}

/**
 * Defense-in-depth overlay for the Phase O admin runtime boundary.
 *
 * Canonical SQL readiness remains authoritative for Supplier Foundation,
 * governance, cohort, caps, simulator evidence, kill switches and the single
 * fully verified GB adapter. This overlay adds the newer Autonomous Operations
 * invariants: Lane G must permit real order submission and a durable Lane H
 * Shadow review must pass a separately governed, pre-registered promotion
 * policy before the admin runtime may request activation.
 *
 * Shadow evidence is scoped to the exact pilot + provider + order_submission
 * capability + observation policy, and a PASS is invalid without an approved
 * promotion policy identity/version that predates the reviewed evidence.
 */
export function evaluatePhaseOPilotAutonomyReadiness(
  input: PhaseOPilotAutonomyReadinessInput,
): PhaseOPilotAutonomyReadinessV3 {
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

  const shadowBlockers = shadowReviewBlockers(input.shadowReview, { pilotId, providerKey }, now);
  blockers.push(...shadowBlockers);

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
      demonstrated: shadowBlockers.length === 0,
      validationBlockers: [...shadowBlockers],
      pilotId: text(shadow?.pilotId) || null,
      providerKey: text(shadow?.providerKey).toLowerCase() || null,
      capability: text(shadow?.capability) || null,
      source: text(shadow?.source) || null,
      persistenceBound: shadow?.persistenceBound === true,
      evidenceRef: text(shadow?.evidenceRef) || null,
      policyVersion: text(shadow?.policyVersion) || null,
      reviewedAt: shadow?.reviewedAt ?? null,
      sampleSize: shadow?.sampleSize ?? 0,
      resolvedComparisons: shadow?.resolvedComparisons ?? 0,
      operatorRelative: shadow?.operatorRelative === true,
      promotionPolicyConfigured: shadow?.promotionPolicyConfigured === true,
      promotionPolicyId: text(shadow?.promotionPolicyId) || null,
      promotionPolicyVersion: shadow?.promotionPolicyVersion ?? null,
      promotionPolicyApprovedAt: shadow?.promotionPolicyApprovedAt ?? null,
      passed: shadow?.passed === true,
    },
    externalMutationPerformed: false,
    pilotActivationPerformed: false,
    paymentMutationPerformed: false,
  });
}
