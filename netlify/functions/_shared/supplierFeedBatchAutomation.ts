import {
  evaluateSupplierFeedCircuitBreaker,
  type SupplierFeedCircuitPolicy,
  type SupplierFeedCircuitResult,
  type SupplierFeedCircuitSnapshot,
} from './supplierFeedCircuitBreaker';

export type SupplierFeedBatchDecision = 'allow_staging' | 'auto_quarantine' | 'fail_closed_inactive';

export interface SupplierFeedBatchCandidate {
  externalVariantRef: string;
  previous?: SupplierFeedCircuitSnapshot;
  current: SupplierFeedCircuitSnapshot;
}

export interface SupplierFeedBatchCandidateDecision {
  externalVariantRef: string;
  circuit: SupplierFeedCircuitResult;
}

export interface SupplierFeedBatchAutomationResult {
  decision: SupplierFeedBatchDecision;
  candidates: SupplierFeedBatchCandidateDecision[];
  acceptedForStaging: number;
  quarantined: number;
  failClosed: number;
  publicSellabilityAllowed: false;
  marketplacePublicationAllowed: false;
  capabilityPromotionAllowed: false;
}

/**
 * Applies the provider-neutral circuit breaker to a complete supplier feed
 * observation batch. This is a pre-publication safety decision only: an
 * allow_staging result never means the product is sellable or publishable.
 */
export function evaluateSupplierFeedBatch(
  candidates: SupplierFeedBatchCandidate[],
  policy?: SupplierFeedCircuitPolicy,
): SupplierFeedBatchAutomationResult {
  const seen = new Set<string>();
  const decisions = candidates.map((candidate) => {
    const ref = candidate.externalVariantRef.trim();
    if (!ref) throw new Error('externalVariantRef is required for every supplier feed candidate');
    if (seen.has(ref)) throw new Error(`duplicate supplier feed variant: ${ref}`);
    seen.add(ref);

    return {
      externalVariantRef: ref,
      circuit: evaluateSupplierFeedCircuitBreaker({
        previous: candidate.previous,
        current: candidate.current,
        policy,
      }),
    };
  });

  const failClosed = decisions.filter(row => row.circuit.decision === 'fail_closed_inactive').length;
  const quarantined = decisions.filter(row => row.circuit.decision === 'auto_quarantine').length;
  const acceptedForStaging = decisions.filter(row => row.circuit.decision === 'allow_staging').length;

  const decision: SupplierFeedBatchDecision = failClosed > 0
    ? 'fail_closed_inactive'
    : quarantined > 0
      ? 'auto_quarantine'
      : 'allow_staging';

  return {
    decision,
    candidates: decisions,
    acceptedForStaging,
    quarantined,
    failClosed,
    publicSellabilityAllowed: false,
    marketplacePublicationAllowed: false,
    capabilityPromotionAllowed: false,
  };
}
