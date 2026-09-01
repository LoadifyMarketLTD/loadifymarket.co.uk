import { describe, expect, it } from 'vitest';
import { evaluateCustomerNotificationPolicy } from '../_shared/customerNotificationPolicy';

const NOW = new Date('2026-09-01T10:30:00.000Z');

function base() {
  return {
    source: 'shipment_stall' as const,
    entityRef: 'shipment-1',
    state: 'delivery_stalled',
    observedAt: '2026-09-01T10:00:00.000Z',
    materialChange: true,
    templateKey: 'shipment_stalled_v1',
    facts: { ageHours: 50 },
    channels: { email: true, sms: false, push: false },
    now: NOW,
  };
}

describe('customer notification policy', () => {
  it('recommends only a deterministic template and never performs delivery', () => {
    const result = evaluateCustomerNotificationPolicy(base());
    expect(result.decision).toBe('notify_recommended');
    expect(result.reason).toBe('material_verified_update');
    expect(result.allowedChannels).toEqual(['email']);
    expect(result.externalNotificationPerformed).toBe(false);
    expect(result.externalMutationAllowed).toBe(false);
    expect(result.paymentMutationAllowed).toBe(false);
  });

  it('suppresses duplicate notifications inside the dedupe window', () => {
    const first = evaluateCustomerNotificationPolicy(base());
    const repeated = evaluateCustomerNotificationPolicy({
      ...base(),
      previousFingerprint: first.fingerprint,
      previousNotificationAt: '2026-09-01T10:10:00.000Z',
      dedupeWindowMinutes: 60,
    });
    expect(repeated.decision).toBe('suppress');
    expect(repeated.reason).toBe('duplicate_within_dedupe_window');
  });

  it('does not recommend customer delivery when evidence is stale', () => {
    const result = evaluateCustomerNotificationPolicy({
      ...base(),
      observedAt: '2026-08-29T10:00:00.000Z',
      evidenceMaxAgeMinutes: 1440,
    });
    expect(result.decision).toBe('human_review_only');
    expect(result.reason).toBe('notification_evidence_stale');
  });

  it('does not notify when there is no verified channel or no material change', () => {
    const noChannel = evaluateCustomerNotificationPolicy({
      ...base(),
      channels: {},
    });
    expect(noChannel.decision).toBe('human_review_only');
    expect(noChannel.reason).toBe('no_verified_delivery_channel');

    const unchanged = evaluateCustomerNotificationPolicy({
      ...base(),
      materialChange: false,
    });
    expect(unchanged.decision).toBe('suppress');
    expect(unchanged.reason).toBe('no_material_change');
  });

  it('forces human review when the source workflow is not safe for automatic communication', () => {
    const result = evaluateCustomerNotificationPolicy({
      ...base(),
      source: 'return',
      state: 'manual_review',
      templateKey: 'return_manual_review_v1',
      requiresHumanReview: true,
    });
    expect(result.decision).toBe('human_review_only');
    expect(result.reason).toBe('human_review_required');
  });
});
