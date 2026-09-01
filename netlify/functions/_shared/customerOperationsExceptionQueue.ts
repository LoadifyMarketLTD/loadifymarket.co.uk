import { createAutonomousException, type AutonomousExceptionRecord } from './autonomousExceptionModel';
import type { CustomerOrderSupportAnswer } from './customerOrderSupport';
import type { CustomerReturnAutomationResult } from './customerReturnAutomation';
import type { ShipmentStallDecision } from './shipmentStallAutomation';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

function refs(values: string[]): string[] {
  const normalized = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  if (normalized.length === 0) throw new Error('at least one evidence reference is required');
  return normalized;
}

export function createWismoException(input: {
  exceptionId: string;
  correlationId: string;
  orderId: string;
  answer: CustomerOrderSupportAnswer;
  evidenceRefs: string[];
  createdAt?: Date;
}): AutonomousExceptionRecord | null {
  if (!input.answer.needsHumanEscalation) return null;

  const severity = input.answer.state === 'exception' ? 'high' : 'medium';
  return createAutonomousException({
    exceptionId: input.exceptionId,
    correlationId: input.correlationId,
    category: 'order',
    severity,
    source: 'customer-order-support-v1',
    entityRefs: { orderId: input.orderId },
    observedFacts: input.answer,
    evidenceRefs: refs(input.evidenceRefs),
    policyVersion: 'customer-operations-v1',
    recommendedAction: input.answer.state === 'delivery_stalled'
      ? 'investigate_shipment_stall'
      : input.answer.state === 'exception'
        ? 'review_delivery_exception'
        : 'review_unresolved_order_status',
    allowedAutomatedActions: [],
    slaMinutes: severity === 'high' ? 60 : 240,
    escalationRequired: true,
    createdAt: input.createdAt,
  });
}

export function createReturnException(input: {
  exceptionId: string;
  correlationId: string;
  orderId: string;
  orderItemId: string;
  result: CustomerReturnAutomationResult;
  evidenceRefs: string[];
  createdAt?: Date;
}): AutonomousExceptionRecord | null {
  if (input.result.decision !== 'manual_review') return null;

  return createAutonomousException({
    exceptionId: input.exceptionId,
    correlationId: input.correlationId,
    category: 'return',
    severity: 'medium',
    source: 'customer-return-automation-v1',
    entityRefs: { orderId: input.orderId, orderItemId: input.orderItemId },
    observedFacts: input.result,
    evidenceRefs: refs(input.evidenceRefs),
    policyVersion: 'customer-operations-v1',
    recommendedAction: `review_return:${input.result.reason}`,
    allowedAutomatedActions: [],
    slaMinutes: 240,
    escalationRequired: true,
    createdAt: input.createdAt,
  });
}

export function createShipmentStallException(input: {
  exceptionId: string;
  correlationId: string;
  shipmentId: string;
  orderId: string;
  decision: ShipmentStallDecision;
  evidenceRefs: string[];
  createdAt?: Date;
}): AutonomousExceptionRecord | null {
  if (!input.decision.stalled) return null;

  const severeUnknown = input.decision.reason === 'tracking_timestamp_unavailable';
  const prolonged = typeof input.decision.ageHours === 'number' && input.decision.ageHours >= 96;
  const severity = severeUnknown || prolonged ? 'high' : 'medium';

  return createAutonomousException({
    exceptionId: input.exceptionId,
    correlationId: input.correlationId,
    category: 'shipment',
    severity,
    source: 'shipment-stall-automation-v1',
    entityRefs: { shipmentId: input.shipmentId, orderId: input.orderId },
    observedFacts: input.decision,
    evidenceRefs: refs(input.evidenceRefs),
    policyVersion: 'customer-operations-v1',
    recommendedAction: input.decision.shouldCreateCarrierCase
      ? 'investigate_and_consider_carrier_case'
      : 'investigate_shipment_state',
    allowedAutomatedActions: [],
    slaMinutes: severity === 'high' ? 60 : 240,
    escalationRequired: true,
    createdAt: input.createdAt,
  });
}

/**
 * Stable operator ordering: severity first, oldest exception first inside the
 * same severity. This is a pure view function and performs no persistence.
 */
export function buildCustomerOperationsExceptionQueue(
  records: Array<AutonomousExceptionRecord | null | undefined>,
): AutonomousExceptionRecord[] {
  return records
    .filter((record): record is AutonomousExceptionRecord => Boolean(record))
    .slice()
    .sort((left, right) => {
      const severity = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
      if (severity !== 0) return severity;
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    });
}
