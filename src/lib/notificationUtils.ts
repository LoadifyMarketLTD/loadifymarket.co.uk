import type { AppNotification } from '@/types';

// Keep the mobile Activity query aligned with the live notifications_type_check
// contract. Unsupported legacy UI-only labels must not hide real DB events.
export const MOBILE_NOTIFICATION_QUERY_TYPES = [
  'order',
  'payment',
  'shipment',
  'return',
  'dispute',
  'message',
  'review',
  'product_question',
  'rfq',
  'delivery',
  'promotion',
  'system',
  'general',
  'seller_approved',
  'seller_rejected',
  'product_approved',
  'product_rejected',
  'question_answered',
  'offer_received',
  'offer_accepted',
  'offer_rejected',
  'support_ticket',
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

export function formatActivityTypeLabel(type: string): string {
  if (type.startsWith('offer_')) return 'Offer';
  if (type === 'message' || type === 'product_question' || type === 'question_answered') return 'Message';
  if (type === 'shipment' || type === 'delivery') return 'Delivery';
  if (type === 'payment') return 'Payment';
  if (type === 'return') return 'Return';
  if (type === 'dispute') return 'Dispute';
  if (type === 'review') return 'Review';
  if (type === 'support_ticket') return 'Support';
  if (type.startsWith('seller_')) return 'Account';
  if (type.startsWith('product_')) return 'Listing';
  if (type === 'rfq') return 'Request';
  if (type === 'promotion') return 'Promotion';
  if (type === 'order') return 'Order';
  return 'Activity';
}

export function extractOrderNumber(...parts: Array<string | null | undefined>): string | null {
  const match = parts.filter(Boolean).join(' ').match(/\bLM-\d+\b/i);
  return match?.[0].toUpperCase() ?? null;
}

export function normalizeMobileNotificationLink(
  link: string | null | undefined,
  orderId?: string | null,
): string | null {
  if (!link || !link.startsWith('/')) return null;

  const url = new URL(link, 'https://loadifymarket.local');
  let mode: 'buy' | 'sell' | null = null;
  if (url.pathname === '/buyer/orders') mode = 'buy';
  if (url.pathname === '/seller/orders') mode = 'sell';
  if (!mode) return `${url.pathname}${url.search}${url.hash}`;

  const params = new URLSearchParams();
  params.set('mode', mode);
  if (orderId) params.set('orderId', orderId);
  return `/orders?${params.toString()}`;
}

export function notificationOrderMode(link: string | null | undefined): 'buy' | 'sell' | null {
  if (!link?.startsWith('/')) return null;
  const pathname = new URL(link, 'https://loadifymarket.local').pathname;
  if (pathname === '/buyer/orders') return 'buy';
  if (pathname === '/seller/orders') return 'sell';
  return null;
}
