import { describe, expect, it } from 'vitest';
import {
  formatNotificationTypeLabel,
  normalizeNotification,
  normalizeNotificationType,
} from './notificationUtils';

describe('notificationUtils', () => {
  it('leaves notification types unchanged', () => {
    expect(normalizeNotificationType('message')).toBe('message');
    expect(normalizeNotificationType('order')).toBe('order');
  });

  it('returns notification objects unchanged', () => {
    const notification = {
      id: '1',
      type: 'message',
      title: 'New message',
      message: 'Hello',
      link: '/inbox/abc',
      isRead: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(normalizeNotification(notification)).toEqual(notification);
  });

  it('formats notification labels from the raw type', () => {
    expect(formatNotificationTypeLabel('listing_sold')).toBe('listing sold');
  });
});
