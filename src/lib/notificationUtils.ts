import type { AppNotification } from '@/types';

export const MOBILE_NOTIFICATION_QUERY_TYPES = [
  'message',
  'order',
  'payment',
  'shipment',
  'delivery',
  'return',
  'dispute',
  'system',
  'general',
  'product_question',
  'listing_published',
  'listing_sold',
  'share_reminder',
  'rfq',
  'review',
] as const;

export function normalizeNotificationType(type: string): string {
  return type;
}

export function normalizeNotification<T extends Pick<AppNotification, 'type'>>(notification: T): T {
  return notification;
}

export function formatNotificationTypeLabel(type: string): string {
  return normalizeNotificationType(type).replaceAll('_', ' ');
}
