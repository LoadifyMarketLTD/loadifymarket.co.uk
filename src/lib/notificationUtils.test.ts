import { describe, expect, it } from 'vitest';
import {
  CANONICAL_OFFER_NOTIFICATION_TYPE,
  formatNotificationTypeLabel,
  normalizeNotification,
  normalizeNotificationType,
} from './notificationUtils';

describe('notificationUtils', () => {
  it('normalizes legacy offer notification types to the canonical value', () => {
    expect(normalizeNotificationType('offer_received')).toBe(CANONICAL_OFFER_NOTIFICATION_TYPE);
    expect(normalizeNotificationType('new_offer')).toBe(CANONICAL_OFFER_NOTIFICATION_TYPE);
    expect(normalizeNotificationType('offer')).toBe(CANONICAL_OFFER_NOTIFICATION_TYPE);
  });

  it('normalizes notification objects without changing other fields', () => {
    expect(
      normalizeNotification({
        id: '1',
        type: 'new_offer',
        title: 'New offer received',
        message: 'Offer £10.00 received',
        link: '/inbox/abc',
        isRead: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: '1',
      type: CANONICAL_OFFER_NOTIFICATION_TYPE,
      title: 'New offer received',
      message: 'Offer £10.00 received',
    });
  });

  it('formats notification labels from the canonical type', () => {
    expect(formatNotificationTypeLabel('new_offer')).toBe('offer received');
    expect(formatNotificationTypeLabel('offer_received')).toBe('offer received');
  });
});
