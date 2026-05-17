export type SellerListingLockType = 'temporary_reservation' | 'active_paid_flow' | 'fulfilled_history';

export interface ListingLockOrder {
  id: string;
  orderNumber?: string | null;
  status: string;
  createdAt?: string | null;
}

export interface ListingLockProductState {
  listingStatus?: string | null;
  reservedUntil?: string | null;
}

export interface SellerListingLock {
  orderId: string;
  orderLabel: string;
  status: string;
  type: SellerListingLockType;
  typeLabel: string;
  message: string;
}

const ACTIVE_PAID_FLOW_STATUSES = new Set(['paid', 'packed', 'shipped']);
const FULFILLED_HISTORY_STATUSES = new Set(['delivered', 'completed']);

function formatOrderLabel(order: ListingLockOrder): string {
  return order.orderNumber?.trim() || order.id;
}

function isFutureIso(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > now.getTime();
}

function isRecentAwaitingPayment(order: ListingLockOrder, now = new Date()): boolean {
  if (!order.createdAt) return false;
  const createdAt = new Date(order.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return now.getTime() - createdAt.getTime() < 15 * 60 * 1000;
}

export function deriveSellerListingLocks(args: {
  orders: ListingLockOrder[];
  product: ListingLockProductState;
  now?: Date;
}): SellerListingLock[] {
  const { orders, product, now = new Date() } = args;
  const reservationActive = product.listingStatus === 'reserved' && isFutureIso(product.reservedUntil, now);

  return orders.flatMap<SellerListingLock>((order) => {
    if (order.status === 'awaiting_payment') {
      if (!reservationActive && !isRecentAwaitingPayment(order, now)) {
        return [];
      }

      return [{
        orderId: order.id,
        orderLabel: formatOrderLabel(order),
        status: order.status,
        type: 'temporary_reservation',
        typeLabel: 'Temporary reservation',
        message: 'Buyer checkout is still in progress for this listing.',
      }];
    }

    if (ACTIVE_PAID_FLOW_STATUSES.has(order.status)) {
      return [{
        orderId: order.id,
        orderLabel: formatOrderLabel(order),
        status: order.status,
        type: 'active_paid_flow',
        typeLabel: 'Active paid order flow',
        message: 'A paid order is in progress, so critical listing fields are locked.',
      }];
    }

    if (FULFILLED_HISTORY_STATUSES.has(order.status)) {
      return [{
        orderId: order.id,
        orderLabel: formatOrderLabel(order),
        status: order.status,
        type: 'fulfilled_history',
        typeLabel: 'Delivered/completed history',
        message: 'This listing has fulfilled order history that keeps critical fields locked.',
      }];
    }

    return [];
  });
}
