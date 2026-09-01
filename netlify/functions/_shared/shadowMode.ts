import { createAutomatedDecisionEvidence } from './autonomousDecisionEvidence';
import type { AutomatedDecisionEvidence } from './autonomousOperationsFoundation';

export const SHADOW_MODE_INTERFACE_VERSION = 1 as const;
export const SHADOW_MODE_POLICY_VERSION = 'shadow-mode-v1' as const;

export const SHADOW_ACTIONS = [
  'no_action',
  'investigate_shipment',
  'notify_customer',
  'open_carrier_case',
  'manual_review',
  'reduce_supplier_caps',
  'quarantine_offer',
  'other',
] as const;

export type ShadowAction = (typeof SHADOW_ACTIONS)[number];
export type ShadowOperatorStatus = 'resolved' | 'unresolved';
export type ShadowComparisonClassification =
  | 'unreviewed'
  | 'agreement'
  | 'false_positive'
  | 'false_negative'
  | 'override'
  | 'ambiguous';

export interface ShadowProposalInput {
  proposalId: string;
  correlationId: string;
  capability: string;
  proposedAction: ShadowAction;
  rationaleCode: string;
  inputFacts: unknown;
  evidenceRefs: string[];
  policyVersion?: string;
  exposureMinor?: number | null;
  createdAt?: Date;
}

export interface ShadowProposalV1 {
  interfaceVersion: typeof SHADOW_MODE_INTERFACE_VERSION;
  policyVersion: string;
  proposalId: string;
  correlationId: string;
  capability: string;
  proposedAction: ShadowAction;
  rationaleCode: string;
  exposureMinor: number | null;
  evidence: AutomatedDecisionEvidence;
  shadowOnly: true;
  externalMutationPerformed: false;
  persistencePerformed: false;
}

export interface ShadowOperatorOutcome {
  action: ShadowAction;
  status: ShadowOperatorStatus;
  rationaleCode?: string | null;
}

export interface ShadowComparisonV1 {
  interfaceVersion: typeof SHADOW_MODE_INTERFACE_VERSION;
  proposalId: string;
  correlationId: string;
  systemAction: ShadowAction;
  operatorAction: ShadowAction | null;
  operatorStatus: ShadowOperatorStatus | null;
  classification: ShadowComparisonClassification;
  operatorRelative: true;
  exposureMinor: number | null;
  rationaleCode: string | null;
}

export interface ShadowMetricsV1 {
  interfaceVersion: typeof SHADOW_MODE_INTERFACE_VERSION;
  total: number;
  reviewed: number;
  unreviewed: number;
  agreement: number;
  falsePositive: number;
  falseNegative: number;
  overrides: number;
  ambiguous: number;
  agreementRate: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
  overrideRate: number | null;
  exposureMinorReviewed: number;
  exposureMinorDisagreement: number;
  operatorRelative: true;
}

function required(value: string, field: string): string {
  const output = value.trim();
  if (!output) throw new Error(`${field} is required`);
  return output;
}

export function isShadowAction(value: unknown): value is ShadowAction {
  return typeof value === 'string' && (SHADOW_ACTIONS as readonly string[]).includes(value);
}

export function createShadowProposal(input: ShadowProposalInput): ShadowProposalV1 {
  if (
    input.exposureMinor !== undefined
    && input.exposureMinor !== null
    && (!Number.isSafeInteger(input.exposureMinor) || input.exposureMinor < 0)
  ) {
    throw new Error('exposureMinor must be a non-negative integer or null');
  }

  const proposalId = required(input.proposalId, 'proposalId');
  const correlationId = required(input.correlationId, 'correlationId');
  const capability = required(input.capability, 'capability');
  const rationaleCode = required(input.rationaleCode, 'rationaleCode');
  const policyVersion = required(input.policyVersion ?? SHADOW_MODE_POLICY_VERSION, 'policyVersion');

  const evidence = createAutomatedDecisionEvidence({
    decisionId: proposalId,
    correlationId,
    capability,
    autonomyLevel: 'recommend',
    inputFacts: input.inputFacts,
    evidenceRefs: input.evidenceRefs,
    policyVersion,
    decision: input.proposedAction === 'no_action' ? 'allow' : 'recommend',
    actionPerformed: null,
    externalReference: null,
    reconciliationState: 'not_required',
    createdAt: input.createdAt,
  });

  return Object.freeze({
    interfaceVersion: SHADOW_MODE_INTERFACE_VERSION,
    policyVersion,
    proposalId,
    correlationId,
    capability,
    proposedAction: input.proposedAction,
    rationaleCode,
    exposureMinor: input.exposureMinor ?? null,
    evidence,
    shadowOnly: true,
    externalMutationPerformed: false,
    persistencePerformed: false,
  });
}

/**
 * Classifies system-vs-operator outcomes for Shadow Mode measurement only.
 * False-positive / false-negative labels are explicitly operator-relative;
 * they are not claims of objective truth or model correctness.
 */
export function compareShadowProposal(
  proposal: ShadowProposalV1,
  operatorOutcome?: ShadowOperatorOutcome | null,
): ShadowComparisonV1 {
  if (!operatorOutcome) {
    return {
      interfaceVersion: SHADOW_MODE_INTERFACE_VERSION,
      proposalId: proposal.proposalId,
      correlationId: proposal.correlationId,
      systemAction: proposal.proposedAction,
      operatorAction: null,
      operatorStatus: null,
      classification: 'unreviewed',
      operatorRelative: true,
      exposureMinor: proposal.exposureMinor,
      rationaleCode: null,
    };
  }

  if (!isShadowAction(operatorOutcome.action)) throw new Error('operator action is invalid');
  if (operatorOutcome.status !== 'resolved' && operatorOutcome.status !== 'unresolved') {
    throw new Error('operator status is invalid');
  }

  let classification: ShadowComparisonClassification;
  if (operatorOutcome.status === 'unresolved') {
    classification = 'ambiguous';
  } else if (proposal.proposedAction === operatorOutcome.action) {
    classification = 'agreement';
  } else if (proposal.proposedAction !== 'no_action' && operatorOutcome.action === 'no_action') {
    classification = 'false_positive';
  } else if (proposal.proposedAction === 'no_action' && operatorOutcome.action !== 'no_action') {
    classification = 'false_negative';
  } else {
    classification = 'override';
  }

  return {
    interfaceVersion: SHADOW_MODE_INTERFACE_VERSION,
    proposalId: proposal.proposalId,
    correlationId: proposal.correlationId,
    systemAction: proposal.proposedAction,
    operatorAction: operatorOutcome.action,
    operatorStatus: operatorOutcome.status,
    classification,
    operatorRelative: true,
    exposureMinor: proposal.exposureMinor,
    rationaleCode: operatorOutcome.rationaleCode?.trim() || null,
  };
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 10_000;
}

export function summarizeShadowComparisons(
  comparisons: ShadowComparisonV1[],
): ShadowMetricsV1 {
  const counts = {
    unreviewed: 0,
    agreement: 0,
    false_positive: 0,
    false_negative: 0,
    override: 0,
    ambiguous: 0,
  } satisfies Record<ShadowComparisonClassification, number>;

  let exposureMinorReviewed = 0;
  let exposureMinorDisagreement = 0;

  for (const comparison of comparisons) {
    counts[comparison.classification] += 1;
    const exposure = comparison.exposureMinor ?? 0;
    if (comparison.classification !== 'unreviewed') exposureMinorReviewed += exposure;
    if (
      comparison.classification === 'false_positive'
      || comparison.classification === 'false_negative'
      || comparison.classification === 'override'
    ) {
      exposureMinorDisagreement += exposure;
    }
  }

  const reviewed = comparisons.length - counts.unreviewed;
  const resolvedReviewed = reviewed - counts.ambiguous;

  return {
    interfaceVersion: SHADOW_MODE_INTERFACE_VERSION,
    total: comparisons.length,
    reviewed,
    unreviewed: counts.unreviewed,
    agreement: counts.agreement,
    falsePositive: counts.false_positive,
    falseNegative: counts.false_negative,
    overrides: counts.override,
    ambiguous: counts.ambiguous,
    agreementRate: rate(counts.agreement, resolvedReviewed),
    falsePositiveRate: rate(counts.false_positive, resolvedReviewed),
    falseNegativeRate: rate(counts.false_negative, resolvedReviewed),
    overrideRate: rate(counts.override, resolvedReviewed),
    exposureMinorReviewed,
    exposureMinorDisagreement,
    operatorRelative: true,
  };
}
