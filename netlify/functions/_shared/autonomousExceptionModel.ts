import {
  type AutonomousExceptionCategory,
  type AutonomousExceptionSeverity,
} from './autonomousOperationsFoundation';
import { digestAutomatedDecisionFacts } from './autonomousDecisionEvidence';

export type AutonomousExceptionResolutionState =
  | 'open'
  | 'acknowledged'
  | 'resolved'
  | 'dismissed';

export type AutonomousExceptionReconciliationState =
  | 'not_required'
  | 'pending'
  | 'confirmed'
  | 'failed';

export interface AutonomousExceptionRecord {
  exceptionId: string;
  correlationId: string;
  category: AutonomousExceptionCategory;
  severity: AutonomousExceptionSeverity;
  source: string;
  entityRefs: Record<string, string>;
  observedFactsDigest: string;
  evidenceRefs: string[];
  policyVersion: string;
  recommendedAction: string;
  allowedAutomatedActions: string[];
  slaMinutes: number;
  exposureMinor: number | null;
  escalationRequired: boolean;
  resolutionState: AutonomousExceptionResolutionState;
  reconciliationState: AutonomousExceptionReconciliationState;
  createdAt: string;
}

export interface AutonomousExceptionInput {
  exceptionId: string;
  correlationId: string;
  category: AutonomousExceptionCategory;
  severity: AutonomousExceptionSeverity;
  source: string;
  entityRefs: Record<string, string>;
  observedFacts: unknown;
  evidenceRefs: string[];
  policyVersion: string;
  recommendedAction: string;
  allowedAutomatedActions?: string[];
  slaMinutes: number;
  exposureMinor?: number | null;
  escalationRequired?: boolean;
  resolutionState?: AutonomousExceptionResolutionState;
  reconciliationState?: AutonomousExceptionReconciliationState;
  createdAt?: Date;
}

function required(value: string, field: string): string {
  const output = value.trim();
  if (!output) throw new Error(`${field} is required`);
  return output;
}

/**
 * Creates the provider-neutral exception payload consumed by a future operator
 * queue. High/critical exceptions always require escalation. No external action
 * is executed by this model.
 */
export function createAutonomousException(
  input: AutonomousExceptionInput,
): AutonomousExceptionRecord {
  if (!Number.isSafeInteger(input.slaMinutes) || input.slaMinutes <= 0) {
    throw new Error('slaMinutes must be a positive integer');
  }
  if (
    input.exposureMinor !== undefined
    && input.exposureMinor !== null
    && (!Number.isSafeInteger(input.exposureMinor) || input.exposureMinor < 0)
  ) {
    throw new Error('exposureMinor must be a non-negative integer or null');
  }

  const entityRefs = Object.fromEntries(
    Object.entries(input.entityRefs).map(([key, value]) => [
      required(key, 'entity ref key'),
      required(value, `entity ref ${key}`),
    ]),
  );
  if (Object.keys(entityRefs).length === 0) throw new Error('at least one entity ref is required');

  const evidenceRefs = [...new Set(input.evidenceRefs.map(value => required(value, 'evidence ref')))];
  if (evidenceRefs.length === 0) throw new Error('at least one evidence ref is required');

  const allowedAutomatedActions = [...new Set(
    (input.allowedAutomatedActions ?? []).map(value => required(value, 'allowed automated action')),
  )];

  const createdAt = input.createdAt ?? new Date();
  if (Number.isNaN(createdAt.getTime())) throw new Error('createdAt must be a valid date');

  const mandatoryEscalation = input.severity === 'high' || input.severity === 'critical';

  return Object.freeze({
    exceptionId: required(input.exceptionId, 'exceptionId'),
    correlationId: required(input.correlationId, 'correlationId'),
    category: input.category,
    severity: input.severity,
    source: required(input.source, 'source'),
    entityRefs,
    observedFactsDigest: digestAutomatedDecisionFacts(input.observedFacts),
    evidenceRefs,
    policyVersion: required(input.policyVersion, 'policyVersion'),
    recommendedAction: required(input.recommendedAction, 'recommendedAction'),
    allowedAutomatedActions,
    slaMinutes: input.slaMinutes,
    exposureMinor: input.exposureMinor ?? null,
    escalationRequired: mandatoryEscalation || input.escalationRequired === true,
    resolutionState: input.resolutionState ?? 'open',
    reconciliationState: input.reconciliationState ?? 'not_required',
    createdAt: createdAt.toISOString(),
  });
}
