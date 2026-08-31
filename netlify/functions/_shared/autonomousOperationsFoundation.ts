export type AutonomyLevel =
  | 'disabled'
  | 'observe'
  | 'recommend'
  | 'human_approval'
  | 'auto_reversible'
  | 'auto_external';

export type CapabilityVerificationStatus =
  | 'unverified'
  | 'read_verified'
  | 'contract_verified'
  | 'runtime_verified'
  | 'production_verified';

export interface ProviderCapabilityRecord {
  provider: string;
  capability: string;
  verified: boolean;
  verificationStatus: CapabilityVerificationStatus;
  evidenceSource: string | null;
  evidenceVersion: string | null;
  lastVerifiedAt: string | null;
  readAllowed: boolean;
  writeAllowed: boolean;
  piiAllowed: boolean;
  idempotencyKnown: boolean;
  lostResponseRecoveryKnown: boolean;
  rateLimitKnown: boolean;
  autonomyLevel: AutonomyLevel;
  killSwitchActive: boolean;
}

export type AutonomousExceptionCategory =
  | 'supplier'
  | 'stock'
  | 'price'
  | 'order'
  | 'payment'
  | 'shipment'
  | 'return'
  | 'refund'
  | 'fraud'
  | 'compliance'
  | 'provider'
  | 'security';

export type AutonomousExceptionSeverity =
  | 'info'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface AutomatedDecisionEvidence {
  decisionId: string;
  correlationId: string;
  capability: string;
  autonomyLevel: AutonomyLevel;
  inputFactsDigest: string;
  evidenceRefs: string[];
  policyVersion: string;
  decision: 'allow' | 'block' | 'quarantine' | 'recommend' | 'escalate';
  actionPerformed: string | null;
  externalReference: string | null;
  reconciliationState: 'not_required' | 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

const EXTERNAL_EXECUTION_VERIFICATION = new Set<CapabilityVerificationStatus>([
  'runtime_verified',
  'production_verified',
]);

function hasCurrentEvidence(record: ProviderCapabilityRecord): boolean {
  if (!record.evidenceSource?.trim() || !record.evidenceVersion?.trim() || !record.lastVerifiedAt) {
    return false;
  }

  return !Number.isNaN(Date.parse(record.lastVerifiedAt));
}

/**
 * Shared fail-closed gate for provider-side mutations.
 *
 * Generic external execution is denied unless the capability has runtime-grade
 * evidence, an explicit write grant, a proven retry/recovery contract and the
 * highest autonomy level. Provider-specific policy may impose stricter rules.
 */
export function canPerformExternalMutation(record: ProviderCapabilityRecord): boolean {
  return (
    record.verified
    && EXTERNAL_EXECUTION_VERIFICATION.has(record.verificationStatus)
    && hasCurrentEvidence(record)
    && record.writeAllowed
    && record.idempotencyKnown
    && record.lostResponseRecoveryKnown
    && record.autonomyLevel === 'auto_external'
    && !record.killSwitchActive
  );
}

/**
 * PII disclosure is a separate permission layered on top of an otherwise
 * executable provider capability. A write-capable provider does not
 * automatically gain access to customer data.
 */
export function canDiscloseCustomerPii(record: ProviderCapabilityRecord): boolean {
  return canPerformExternalMutation(record) && record.piiAllowed;
}

/**
 * Financial execution intentionally has no generic escape hatch.
 * Refunds, payouts, reimbursement and Stripe mutations belong behind the
 * dedicated Financial Firewall and remain disabled through this foundation.
 */
export function canPerformFinancialMutation(): false {
  return false;
}
