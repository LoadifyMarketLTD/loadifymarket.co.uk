import { describe, expect, it } from 'vitest';
import {
  MOBILE_NOTIFICATION_QUERY_TYPES,
  extractOrderNumber,
  formatActivityTypeLabel,
  formatNotificationTypeLabel,
  normalizeMobileNotificationLink,
  normalizeNotification,
  normalizeNotificationType,
  notificationOrderMode,
} from './notificationUtils';

describe('notificationUtils', () => {
  it('leaves notification types unchanged', () => {
    expect(normalizeNotificationType('message')).toBe('message');
    expect(normalizeNotificationType('order')).toBe('order');
  });

  it('returns notification objects unchanged', () => {
    const notification = {
      id: '1', type: 'message', title: 'New message', message: 'Hello',
      link: '/inbox/abc', isRead: false, createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(normalizeNotification(notification)).toEqual(notification);
  });

  it('formats notification labels from the raw type', () => {
    expect(formatNotificationTypeLabel('offer_received')).toBe('offer received');
    expect(formatActivityTypeLabel('offer_received')).toBe('Offer');
    expect(formatActivityTypeLabel('shipment')).toBe('Delivery');
  });

  it('includes live offer and support notification types in mobile Activity', () => {
    expect(MOBILE_NOTIFICATION_QUERY_TYPES).toContain('offer_received');
    expect(MOBILE_NOTIFICATION_QUERY_TYPES).toContain('offer_accepted');
    expect(MOBILE_NOTIFICATION_QUERY_TYPES).toContain('offer_rejected');
    expect(MOBILE_NOTIFICATION_QUERY_TYPES).toContain('support_ticket');
  });

  it('extracts canonical order numbers from notification text', () => {
    expect(extractOrderNumber('Shipment update', 'Your order LM-0100022 is delivered.')).toBe('LM-0100022');
    expect(extractOrderNumber('No order here')).toBeNull();
  });

  it('maps legacy desktop order links to native order routes', () => {
    expect(notificationOrderMode('/buyer/orders')).toBe('buy');
    expect(notificationOrderMode('/seller/orders')).toBe('sell');
    expect(normalizeMobileNotificationLink('/buyer/orders', 'order-1')).toBe('/orders?mode=buy&orderId=order-1');
    expect(normalizeMobileNotificationLink('/seller/orders', 'order-2')).toBe('/orders?mode=sell&orderId=order-2');
  });

  it('keeps safe internal links and rejects external notification links', () => {
    expect(normalizeMobileNotificationLink('/inbox/abc?offerId=1')).toBe('/inbox/abc?offerId=1');
    expect(normalizeMobileNotificationLink('https://example.com')).toBeNull();
  });
});
