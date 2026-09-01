import { digestAutomatedDecisionFacts } from './autonomousDecisionEvidence';

export const CUSTOMER_NOTIFICATION_POLICY_INTERFACE_VERSION = 1 as const;
export const CUSTOMER_NOTIFICATION_POLICY_VERSION = 'customer-notification-v1' as const;

export type CustomerNotificationSource = 'wismo' | 'shipment_stall' | 'return';
export type CustomerNotificationDecision = 'suppress' | 'notify_recommended' | 'human_review_only';
export type CustomerNotificationChannel = 'email' | 'sms' | 'push';

export interface CustomerNotificationPolicyInput {
  source: CustomerNotificationSource;
  entityRef: string;
  state: string;
  observedAt: string;
  materialChange: boolean;
  templateKey: string;
  facts: unknown;
  channels: Partial<Record<CustomerNotificationChannel, boolean>>;
  previousFingerprint?: string | null;
  previousNotificationAt?: string | null;
  now?: Date;
  dedupeWindowMinutes?: number;
  evidenceMaxAgeMinutes?: number;
  requiresHumanReview?: boolean;
}

export interface CustomerNotificationPolicyDecisionV1 {
  interfaceVersion: typeof CUSTOMER_NOTIFICATION_POLICY_INTERFACE_VERSION;
  policyVersion: typeof CUSTOMER_NOTIFICATION_POLICY_VERSION;
  source: CustomerNotificationSource;
  entityRef: string;
  state: string;
  decision: CustomerNotificationDecision;
  reason: string;
  templateKey: string;
  fingerprint: string;
  allowedChannels: CustomerNotificationChannel[];
  evidenceObservedAt: string;
  evidenceAgeMinutes: number;
  externalNotificationPerformed: false;
  externalMutationAllowed: false;
  paymentMutationAllowed: false;
}

const CHANNELS: CustomerNotificationChannel[] = ['email', 'sms', 'push'];

function required(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function positiveInteger(value: number, field: string, max: number): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > max) {
    throw new Error(`${field} must be a positive integer <= ${max}`);
  }
  return value;
}

function iso(value: string, field: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`${field} must be a valid timestamp`);
  return new Date(parsed).toISOString();
}

/**
 * Deterministic customer-notification recommendation boundary.
 *
 * This policy only decides whether a pre-approved template should be considered
 * for delivery. It never sends email/SMS/push itself and therefore cannot leak
 * customer PII or create an external side effect. A future sender must provide
 * its own idempotency, consent, channel and delivery evidence gates.
 */
export function evaluateCustomerNotificationPolicy(
  input: CustomerNotificationPolicyInput,
): CustomerNotificationPolicyDecisionV1 {
  const entityRef = required(input.entityRef, 'entityRef');
  const state = required(input.state, 'state').toLowerCase();
  const templateKey = required(input.templateKey, 'templateKey');
  const observedAt = iso(input.observedAt, 'observedAt');
  const now = input.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error('now must be valid');

  const dedupeWindowMinutes = positiveInteger(input.dedupeWindowMinutes ?? 60, 'dedupeWindowMinutes', 10080);
  const evidenceMaxAgeMinutes = positiveInteger(input.evidenceMaxAgeMinutes ?? 1440, 'evidenceMaxAgeMinutes', 43200);
  const evidenceAgeMinutes = Math.max(0, (now.getTime() - Date.parse(observedAt)) / 60_000);
  const allowedChannels = CHANNELS.filter(channel => input.channels[channel] === true);
  const fingerprint = digestAutomatedDecisionFacts({
    source: input.source,
    entityRef,
    state,
    templateKey,
    facts: input.facts,
  });

  const base = {
    interfaceVersion: CUSTOMER_NOTIFICATION_POLICY_INTERFACE_VERSION,
    policyVersion: CUSTOMER_NOTIFICATION_POLICY_VERSION,
    source: input.source,
    entityRef,
    state,
    templateKey,
    fingerprint,
    allowedChannels,
    evidenceObservedAt: observedAt,
    evidenceAgeMinutes: Math.round(evidenceAgeMinutes * 100) / 100,
    externalNotificationPerformed: false as const,
    externalMutationAllowed: false as const,
    paymentMutationAllowed: false as const,
  };

  if (input.requiresHumanReview === true) {
    return { ...base, decision: 'human_review_only', reason: 'human_review_required' };
  }
  if (!input.materialChange) {
    return { ...base, decision: 'suppress', reason: 'no_material_change' };
  }
  if (evidenceAgeMinutes > evidenceMaxAgeMinutes) {
    return { ...base, decision: 'human_review_only', reason: 'notification_evidence_stale' };
  }
  if (allowedChannels.length === 0) {
    return { ...base, decision: 'human_review_only', reason: 'no_verified_delivery_channel' };
  }

  const previousAt = input.previousNotificationAt ? Date.parse(input.previousNotificationAt) : Number.NaN;
  if (
    input.previousFingerprint?.trim() === fingerprint
    && Number.isFinite(previousAt)
    && now.getTime() - previousAt < dedupeWindowMinutes * 60_000
  ) {
    return { ...base, decision: 'suppress', reason: 'duplicate_within_dedupe_window' };
  }

  return { ...base, decision: 'notify_recommended', reason: 'material_verified_update' };
}
