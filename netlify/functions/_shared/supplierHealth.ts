import { createAutonomousException, type AutonomousExceptionRecord } from './autonomousExceptionModel';

export const SUPPLIER_HEALTH_INTERFACE_VERSION = 1 as const;
export const SUPPLIER_HEALTH_POLICY_VERSION = 'supplier-health-v1' as const;

export type SupplierHealthStatus =
  | 'insufficient_evidence'
  | 'healthy'
  | 'degraded'
  | 'high_risk'
  | 'critical';

export type SupplierHealthRecommendedAction =
  | 'observe_only'
  | 'normal_caps'
  | 'reduce_caps'
  | 'human_approval'
  | 'kill_switch_recommended';

export interface SupplierHealthInput {
  supplierKey: string;
  providerRef: string;
  windowStart: string;
  windowEnd: string;
  consecutiveSyncFailures: number;
  operations: {
    total: number;
    retryableFailures: number;
    permanentRejections: number;
    authConfigurationFailures: number;
    rateLimited: number;
    unknownOutcomes: number;
  };
  price: { observations: number; anomalies: number };
  freshness: { observations: number; stale: number };
  fulfilment: { orders: number; failures: number; cancellations: number };
  tracking: { shipments: number; exceptions: number };
  reconciliation: { attempts: number; failures: number };
}

export interface SupplierHealthComponent {
  key: 'api_reliability' | 'price_integrity' | 'freshness' | 'fulfilment' | 'tracking' | 'reconciliation';
  score: number | null;
  samples: number;
  failures: number;
  reason: string;
}

export interface SupplierHealthDecisionV1 {
  interfaceVersion: typeof SUPPLIER_HEALTH_INTERFACE_VERSION;
  policyVersion: typeof SUPPLIER_HEALTH_POLICY_VERSION;
  supplierKey: string;
  providerRef: string;
  windowStart: string;
  windowEnd: string;
  evidenceSamples: number;
  healthScore: number | null;
  status: SupplierHealthStatus;
  recommendedAction: SupplierHealthRecommendedAction;
  components: SupplierHealthComponent[];
  reasons: string[];
  automaticExternalMutationAllowed: false;
  automaticControlMutationAllowed: false;
  paymentMutationAllowed: false;
}

const MIN_EVIDENCE_SAMPLES = 20;
const WEIGHTS: Record<SupplierHealthComponent['key'], number> = {
  api_reliability: 0.25,
  price_integrity: 0.15,
  freshness: 0.2,
  fulfilment: 0.2,
  tracking: 0.1,
  reconciliation: 0.1,
};

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function iso(value: string, field: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`${field} must be a valid timestamp`);
  return new Date(parsed).toISOString();
}

function count(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

function component(
  key: SupplierHealthComponent['key'],
  samples: number,
  failures: number,
  reason: string,
): SupplierHealthComponent {
  count(samples, `${key}.samples`);
  count(failures, `${key}.failures`);
  if (failures > samples) throw new Error(`${key}.failures cannot exceed samples`);
  return {
    key,
    score: samples === 0 ? null : Math.round((1 - failures / samples) * 10000) / 100,
    samples,
    failures,
    reason,
  };
}

function weightedScore(components: SupplierHealthComponent[]): number | null {
  const available = components.filter(row => row.score !== null);
  if (available.length === 0) return null;
  const weight = available.reduce((sum, row) => sum + WEIGHTS[row.key], 0);
  const total = available.reduce((sum, row) => sum + (row.score as number) * WEIGHTS[row.key], 0);
  return Math.round((total / weight) * 100) / 100;
}

/**
 * Explainable provider-neutral health evaluator. It consumes aggregated,
 * deterministic evidence and returns a recommendation only. It never mutates
 * rollout controls, supplier state, marketplace publication or money.
 */
export function evaluateSupplierHealth(input: SupplierHealthInput): SupplierHealthDecisionV1 {
  const supplierKey = required(input.supplierKey, 'supplierKey').toLowerCase();
  const providerRef = required(input.providerRef, 'providerRef').toLowerCase();
  const windowStart = iso(input.windowStart, 'windowStart');
  const windowEnd = iso(input.windowEnd, 'windowEnd');
  if (Date.parse(windowEnd) <= Date.parse(windowStart)) throw new Error('windowEnd must be after windowStart');
  const consecutiveSyncFailures = count(input.consecutiveSyncFailures, 'consecutiveSyncFailures');

  const operationFailures =
    count(input.operations.retryableFailures, 'operations.retryableFailures')
    + count(input.operations.permanentRejections, 'operations.permanentRejections')
    + count(input.operations.authConfigurationFailures, 'operations.authConfigurationFailures')
    + count(input.operations.rateLimited, 'operations.rateLimited')
    + count(input.operations.unknownOutcomes, 'operations.unknownOutcomes');
  const operationTotal = count(input.operations.total, 'operations.total');

  const components: SupplierHealthComponent[] = [
    component('api_reliability', operationTotal, operationFailures, 'supplier commerce operation outcomes'),
    component(
      'price_integrity',
      count(input.price.observations, 'price.observations'),
      count(input.price.anomalies, 'price.anomalies'),
      'supplier price anomaly observations',
    ),
    component(
      'freshness',
      count(input.freshness.observations, 'freshness.observations'),
      count(input.freshness.stale, 'freshness.stale'),
      'stock/price evidence freshness',
    ),
    component(
      'fulfilment',
      count(input.fulfilment.orders, 'fulfilment.orders'),
      count(input.fulfilment.failures, 'fulfilment.failures') + count(input.fulfilment.cancellations, 'fulfilment.cancellations'),
      'supplier fulfilment failures and cancellations',
    ),
    component(
      'tracking',
      count(input.tracking.shipments, 'tracking.shipments'),
      count(input.tracking.exceptions, 'tracking.exceptions'),
      'shipment tracking exceptions',
    ),
    component(
      'reconciliation',
      count(input.reconciliation.attempts, 'reconciliation.attempts'),
      count(input.reconciliation.failures, 'reconciliation.failures'),
      'terminal reconciliation failures',
    ),
  ];

  const evidenceSamples = components.reduce((sum, row) => sum + row.samples, 0);
  const score = weightedScore(components);
  const reasons: string[] = [];

  if (consecutiveSyncFailures > 0) reasons.push(`consecutive_sync_failures:${consecutiveSyncFailures}`);
  if (input.operations.authConfigurationFailures > 0) reasons.push('auth_configuration_failure_observed');
  if (input.operations.unknownOutcomes > 0) reasons.push('unknown_outcome_observed');
  if (input.reconciliation.failures > 0) reasons.push('reconciliation_failure_observed');
  if (input.price.anomalies > 0) reasons.push('price_anomaly_observed');
  if (input.freshness.stale > 0) reasons.push('stale_supplier_evidence_observed');

  let status: SupplierHealthStatus;
  let recommendedAction: SupplierHealthRecommendedAction;

  if (evidenceSamples < MIN_EVIDENCE_SAMPLES || score === null) {
    status = 'insufficient_evidence';
    recommendedAction = 'observe_only';
    reasons.push(`minimum_evidence_not_met:${evidenceSamples}/${MIN_EVIDENCE_SAMPLES}`);
  } else if (
    score < 40
    || consecutiveSyncFailures >= 5
    || input.operations.authConfigurationFailures >= 3
    || input.operations.unknownOutcomes / Math.max(operationTotal, 1) > 0.1
  ) {
    status = 'critical';
    recommendedAction = 'kill_switch_recommended';
  } else if (
    score < 60
    || consecutiveSyncFailures >= 3
    || input.operations.authConfigurationFailures > 0
    || input.operations.unknownOutcomes > 0
  ) {
    status = 'high_risk';
    recommendedAction = 'human_approval';
  } else if (score < 80 || consecutiveSyncFailures > 0) {
    status = 'degraded';
    recommendedAction = 'reduce_caps';
  } else {
    status = 'healthy';
    recommendedAction = 'normal_caps';
  }

  return Object.freeze({
    interfaceVersion: SUPPLIER_HEALTH_INTERFACE_VERSION,
    policyVersion: SUPPLIER_HEALTH_POLICY_VERSION,
    supplierKey,
    providerRef,
    windowStart,
    windowEnd,
    evidenceSamples,
    healthScore: score,
    status,
    recommendedAction,
    components: components.map(row => Object.freeze({ ...row })),
    reasons: [...new Set(reasons)],
    automaticExternalMutationAllowed: false,
    automaticControlMutationAllowed: false,
    paymentMutationAllowed: false,
  });
}

export function createSupplierHealthException(input: {
  exceptionId: string;
  correlationId: string;
  decision: SupplierHealthDecisionV1;
  evidenceRefs: string[];
  createdAt?: Date;
}): AutonomousExceptionRecord | null {
  if (input.decision.status === 'healthy' || input.decision.status === 'insufficient_evidence') return null;

  const severity = input.decision.status === 'critical'
    ? 'critical'
    : input.decision.status === 'high_risk'
      ? 'high'
      : 'medium';

  return createAutonomousException({
    exceptionId: input.exceptionId,
    correlationId: input.correlationId,
    category: 'supplier',
    severity,
    source: 'supplier-health-v1',
    entityRefs: {
      supplierKey: input.decision.supplierKey,
      providerRef: input.decision.providerRef,
    },
    observedFacts: input.decision,
    evidenceRefs: input.evidenceRefs,
    policyVersion: input.decision.policyVersion,
    recommendedAction: input.decision.recommendedAction,
    // v1 is recommendation-only. Control changes require a separately governed
    // mutation path even when health is critical.
    allowedAutomatedActions: [],
    slaMinutes: input.decision.status === 'critical' ? 15 : input.decision.status === 'high_risk' ? 60 : 240,
    escalationRequired: input.decision.status !== 'degraded',
    createdAt: input.createdAt,
  });
}
