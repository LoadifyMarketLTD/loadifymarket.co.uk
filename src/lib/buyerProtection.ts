/**
 * Dispute Support — Core Business Logic
 *
 * Order issue model:
 *  - Payment captured at checkout (Stripe PaymentIntent)
 *  - Seller response deadline: 48 hours after dispute opened
 *  - On dispute: case reviewed by admin
 *  - On resolution: refund or release based on admin decision
 *
 * Dispute timeline:
 *  Day 0 — buyer opens dispute (seller response deadline = +48 h)
 *  Day 2 — seller response deadline; if missed → auto-escalate to admin
 *  Day 5 — admin resolution deadline
 *  Day 7 — auto-resolve if admin has not acted (configurable)
 */

import type { BuyerProtectionReason, DisputeResolutionType, EscrowStatus } from '../types';

// ─── Configuration ──────────────────────────────────────────────────────────

export const PROTECTION_CONFIG = {
  sellerResponseHours: 48,
  adminResolutionDays: 5,
  autoResolveDays: 7,
  escrowReleaseDays: 7,     // days after shipping before auto-release
  maxDisputesPerMonth: 5,   // above this, flag as potential abuse
} as const;

// ─── Reason definitions ──────────────────────────────────────────────────────

export interface ProtectionReasonDef {
  key: BuyerProtectionReason;
  label: string;
  description: string;
  requiresEvidence: boolean;
  autoApproveAfterDays: number | null;  // null = always requires review
}

export const PROTECTION_REASONS: ProtectionReasonDef[] = [
  {
    key: 'item_not_received',
    label: 'Item Not Received',
    description: 'The item has not arrived and the estimated delivery date has passed.',
    requiresEvidence: false,
    autoApproveAfterDays: 5,
  },
  {
    key: 'not_as_described',
    label: 'Item Not as Described',
    description: 'The item received is significantly different from the listing description or images.',
    requiresEvidence: true,
    autoApproveAfterDays: null,
  },
  {
    key: 'item_damaged',
    label: 'Item Arrived Damaged',
    description: 'The item was damaged during shipping or arrived in an unacceptable condition.',
    requiresEvidence: true,
    autoApproveAfterDays: null,
  },
  {
    key: 'defective_product',
    label: 'Defective Product',
    description: 'The item does not work as intended or has a manufacturing defect.',
    requiresEvidence: true,
    autoApproveAfterDays: null,
  },
  {
    key: 'seller_not_responding',
    label: 'Seller Not Responding',
    description: 'The seller has not responded to messages within 48 hours.',
    requiresEvidence: false,
    autoApproveAfterDays: 3,
  },
  {
    key: 'other',
    label: 'Other Issue',
    description: 'Describe your issue in detail. Our team will review your case.',
    requiresEvidence: false,
    autoApproveAfterDays: null,
  },
];

// ─── Resolution definitions ──────────────────────────────────────────────────

export interface ResolutionDef {
  key: DisputeResolutionType;
  label: string;
  description: string;
  escrowOutcome: EscrowStatus;
}

export const RESOLUTION_TYPES: ResolutionDef[] = [
  {
    key: 'full_refund',
    label: 'Full Refund',
    description: 'Buyer receives the full order amount back to their original payment method.',
    escrowOutcome: 'refunded',
  },
  {
    key: 'partial_refund',
    label: 'Partial Refund',
    description: 'A portion of the order amount is returned to the buyer.',
    escrowOutcome: 'partial_refund',
  },
  {
    key: 'replacement',
    label: 'Replacement Product',
    description: 'Seller sends a replacement item. Original payment released to seller.',
    escrowOutcome: 'released',
  },
  {
    key: 'rejected',
    label: 'Dispute Rejected',
    description: 'The dispute was not upheld. Payment released to seller.',
    escrowOutcome: 'released',
  },
  {
    key: 'withdrawn',
    label: 'Withdrawn by Buyer',
    description: 'The buyer withdrew the dispute. Payment released to seller.',
    escrowOutcome: 'released',
  },
];

// ─── Timeline helpers ────────────────────────────────────────────────────────

export interface DisputeTimelineEvent {
  day: number;
  label: string;
  description: string;
  isDeadline: boolean;
}

export const DISPUTE_TIMELINE: DisputeTimelineEvent[] = [
  { day: 0, label: 'Dispute Opened',           description: 'Buyer opens dispute and submits evidence.',        isDeadline: false },
  { day: 2, label: 'Seller Response Deadline', description: 'Seller must respond within 48 hours.',             isDeadline: true  },
  { day: 5, label: 'Admin Resolution',         description: 'Platform admin reviews and issues a decision.',    isDeadline: true  },
  { day: 7, label: 'Auto-Resolution',          description: 'Case is auto-resolved by admin if no decision has been made.', isDeadline: false },
];

/**
 * Returns computed timeline events for a specific dispute with actual dates.
 */
export function getDisputeTimeline(createdAt: string): Array<DisputeTimelineEvent & { date: Date; isPast: boolean }> {
  const created = new Date(createdAt);
  const now = new Date();
  return DISPUTE_TIMELINE.map(event => {
    const date = new Date(created.getTime() + event.day * 24 * 60 * 60 * 1000);
    return { ...event, date, isPast: date <= now };
  });
}

/**
 * Returns the seller response deadline (48 h from dispute creation).
 */
export function getSellerDeadline(createdAt: string): Date {
  const ms = PROTECTION_CONFIG.sellerResponseHours * 60 * 60 * 1000;
  return new Date(new Date(createdAt).getTime() + ms);
}

/**
 * Returns hours remaining until a deadline. Negative if past.
 */
export function hoursUntil(deadline: Date): number {
  return Math.round((deadline.getTime() - Date.now()) / (60 * 60 * 1000));
}

// ─── Escrow helpers ──────────────────────────────────────────────────────────

export interface EscrowInfo {
  status: EscrowStatus;
  label: string;
  description: string;
  color: string;
}

export function getEscrowInfo(status: EscrowStatus | undefined): EscrowInfo {
  switch (status) {
    case 'held':
      return { status: 'held',          label: 'Pending',           description: 'Payment is pending delivery confirmation.',                  color: 'text-primary' };
    case 'released':
      return { status: 'released',      label: 'Released',          description: 'Payment has been released to the seller.',                   color: 'text-success' };
    case 'refunded':
      return { status: 'refunded',      label: 'Refund Issued',     description: 'Full payment has been refunded to your original method.',     color: 'text-blue-400' };
    case 'partial_refund':
      return { status: 'partial_refund', label: 'Partial Refund',   description: 'A partial refund has been issued to your account.',           color: 'text-purple-400' };
    default:
      return { status: 'held',          label: 'Pending',           description: 'Payment is pending.',                                        color: 'text-primary' };
  }
}

// ─── Abuse detection helpers ─────────────────────────────────────────────────

/**
 * Flag if a buyer has opened too many disputes within a rolling 30-day window.
 */
export function isAbuseRisk(disputeDates: string[]): boolean {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = disputeDates.filter(d => new Date(d) >= thirtyDaysAgo);
  return recent.length >= PROTECTION_CONFIG.maxDisputesPerMonth;
}

// ─── Eligibility check ───────────────────────────────────────────────────────

export interface ProtectionEligibility {
  eligible: boolean;
  reason: string;
}

/**
 * Checks whether a buyer can open a protection dispute for a given order.
 * Returns eligibility plus a human-readable reason if not eligible.
 */
export function checkProtectionEligibility(
  orderStatus: string,
  orderCreatedAt: string,
  existingDisputeForOrder: boolean,
): ProtectionEligibility {
  if (orderStatus === 'cancelled' || orderStatus === 'refunded') {
    return { eligible: false, reason: 'This order has already been cancelled or refunded.' };
  }
  if (orderStatus === 'pending') {
    return { eligible: false, reason: 'Your order has not yet been confirmed. Please wait for payment confirmation.' };
  }
  if (existingDisputeForOrder) {
    return { eligible: false, reason: 'A dispute is already open for this order.' };
  }
  // 90-day window from order creation
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  if (Date.now() - new Date(orderCreatedAt).getTime() > ninetyDays) {
    return { eligible: false, reason: 'The 90-day dispute window for this order has expired.' };
  }
  return { eligible: true, reason: '' };
}
