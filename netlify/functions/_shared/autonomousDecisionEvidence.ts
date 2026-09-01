import { createHash } from 'node:crypto';
import {
  type AutomatedDecisionEvidence,
  type AutonomyLevel,
} from './autonomousOperationsFoundation';

export interface AutomatedDecisionEvidenceInput {
  decisionId: string;
  correlationId: string;
  capability: string;
  autonomyLevel: AutonomyLevel;
  inputFacts: unknown;
  evidenceRefs: string[];
  policyVersion: string;
  decision: AutomatedDecisionEvidence['decision'];
  actionPerformed?: string | null;
  externalReference?: string | null;
  reconciliationState?: AutomatedDecisionEvidence['reconciliationState'];
  createdAt?: Date;
}

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(source)
      .sort()
      .map(key => [key, canonicalize(source[key])]),
  );
}

export function digestAutomatedDecisionFacts(inputFacts: unknown): string {
  const canonical = JSON.stringify(canonicalize(inputFacts));
  return createHash('sha256').update(canonical ?? 'null').digest('hex');
}

/**
 * Produces the immutable decision-memory payload for later persistence in the
 * Evidence Ledger. The builder deliberately records facts/evidence references,
 * not hidden model reasoning or secrets.
 */
export function createAutomatedDecisionEvidence(
  input: AutomatedDecisionEvidenceInput,
): AutomatedDecisionEvidence {
  const evidenceRefs = [...new Set(input.evidenceRefs.map(value => required(value, 'evidence ref')))];
  if (evidenceRefs.length === 0) throw new Error('at least one evidence ref is required');

  const createdAt = input.createdAt ?? new Date();
  if (Number.isNaN(createdAt.getTime())) throw new Error('createdAt must be a valid date');

  return Object.freeze({
    decisionId: required(input.decisionId, 'decisionId'),
    correlationId: required(input.correlationId, 'correlationId'),
    capability: required(input.capability, 'capability'),
    autonomyLevel: input.autonomyLevel,
    inputFactsDigest: digestAutomatedDecisionFacts(input.inputFacts),
    evidenceRefs,
    policyVersion: required(input.policyVersion, 'policyVersion'),
    decision: input.decision,
    actionPerformed: input.actionPerformed?.trim() || null,
    externalReference: input.externalReference?.trim() || null,
    reconciliationState: input.reconciliationState ?? 'not_required',
    createdAt: createdAt.toISOString(),
  });
}
