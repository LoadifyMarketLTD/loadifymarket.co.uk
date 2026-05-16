import type { AppNotification } from '@/types';

export const CANONICAL_OFFER_NOTIFICATION_TYPE = 'offer_received' as const;

const LEGACY_OFFER_NOTIFICATION_TYPES = new Set([
  CANONICAL_OFFER_NOTIFICATION_TYPE,
  'new_offer',
  'offer',
]);

export const MOBILE_NOTIFICATION_QUERY_TYPES = [
  'message',
  'order',
  CANONICAL_OFFER_NOTIFICATION_TYPE,
  'new_offer',
  'offer',
] as const;

export function normalizeNotificationType(type: string): string {
  return LEGACY_OFFER_NOTIFICATION_TYPES.has(type)
    ? CANONICAL_OFFER_NOTIFICATION_TYPE
    : type;
}

export function normalizeNotification<T extends Pick<AppNotification, 'type'>>(notification: T): T {
  const normalizedType = normalizeNotificationType(notification.type);
  if (normalizedType === notification.type) return notification;

  return {
    ...notification,
    type: normalizedType,
  };
}

export function formatNotificationTypeLabel(type: string): string {
  return normalizeNotificationType(type).replaceAll('_', ' ');
}
