import type { SupabaseClient } from '@supabase/supabase-js';

export type GuardedOrderStatus = 'packed' | 'shipped' | 'delivered';
export type ListingContext = 'product' | 'service' | null;

export interface GuardOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  productId: string;
  stripePaymentIntentId?: string | null;
  rfqId?: string | null;
  rfqResponseId?: string | null;
  escrowStatus?: string | null;
}

export interface GuardProductRow {
  id: string;
  listingContext: ListingContext;
  listingStatus?: string | null;
  reservedUntil?: string | null;
}

export interface PaymentSessionEvidenceRow {
  status: string;
  stripePaymentIntent: string | null;
}

export interface PaymentEvidenceSummary {
  hasValidPaymentEvidence: boolean;
  paymentEvidenceSource: 'order.stripePaymentIntentId' | 'payment_sessions.stripePaymentIntent' | null;
  requiresPaymentEvidence: boolean;
  allowedNonStripeFlow: 'service_listing' | 'rfq_service' | null;
}

export interface TransitionGuardDecision extends PaymentEvidenceSummary {
  ok: boolean;
  statusCode: number;
  error?: string;
}

const PAYMENT_GUARDED_STATUSES = new Set<GuardedOrderStatus>(['packed', 'shipped', 'delivered']);
const ADMIN_RELEASE_ELIGIBLE_STATUSES = new Set([
  'awaiting_payment',
  'pending',
  'paid',
  'packed',
  'shipped',
  'delivered',
]);

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function summarizePaymentEvidence(input: {
  order: Pick<GuardOrderRow, 'stripePaymentIntentId' | 'rfqId' | 'rfqResponseId'>;
  listingContext: ListingContext;
  paymentSession?: Pick<PaymentSessionEvidenceRow, 'status' | 'stripePaymentIntent'> | null;
}): PaymentEvidenceSummary {
  const orderIntent = nonEmpty(input.order.stripePaymentIntentId);
  const paymentSessionIntent = input.paymentSession?.status === 'completed'
    ? nonEmpty(input.paymentSession.stripePaymentIntent)
    : null;
  const isService = input.listingContext === 'service';
  const isRfqService = isService && Boolean(input.order.rfqId || input.order.rfqResponseId);

  return {
    hasValidPaymentEvidence: Boolean(orderIntent || paymentSessionIntent),
    paymentEvidenceSource: orderIntent
      ? 'order.stripePaymentIntentId'
      : paymentSessionIntent
        ? 'payment_sessions.stripePaymentIntent'
        : null,
    requiresPaymentEvidence: !isService,
    allowedNonStripeFlow: isRfqService ? 'rfq_service' : isService ? 'service_listing' : null,
  };
}

export async function loadCompletedPaymentEvidence(
  supabase: SupabaseClient,
  orderId: string,
): Promise<PaymentSessionEvidenceRow | null> {
  const { data, error } = await supabase
    .from('payment_sessions')
    .select('status, stripePaymentIntent')
    .eq('orderId', orderId)
    .eq('status', 'completed')
    .order('updatedAt', { ascending: false })
    .limit(1)
    .maybeSingle<PaymentSessionEvidenceRow>();

  if (error) {
    throw new Error(`Failed to verify payment evidence: ${error.message}`);
  }

  return data ?? null;
}

export async function enforcePaymentBackedTransition(args: {
  supabase: SupabaseClient;
  order: GuardOrderRow;
  product: GuardProductRow;
  nextStatus: GuardedOrderStatus;
  actorRole: 'seller' | 'admin';
  allowAdminUnpaidOverride?: boolean;
  adminOverrideReason?: string | null;
}): Promise<TransitionGuardDecision> {
  const {
    supabase,
    order,
    product,
    nextStatus,
    actorRole,
    allowAdminUnpaidOverride = false,
    adminOverrideReason = null,
  } = args;

  if (!PAYMENT_GUARDED_STATUSES.has(nextStatus)) {
    return {
      ok: true,
      statusCode: 200,
      hasValidPaymentEvidence: false,
      paymentEvidenceSource: null,
      requiresPaymentEvidence: false,
      allowedNonStripeFlow: null,
    };
  }

  const paymentSession = await loadCompletedPaymentEvidence(supabase, order.id);
  const summary = summarizePaymentEvidence({
    order,
    listingContext: product.listingContext,
    paymentSession,
  });

  if (!summary.requiresPaymentEvidence || summary.hasValidPaymentEvidence) {
    return {
      ok: true,
      statusCode: 200,
      ...summary,
    };
  }

  if (actorRole === 'admin' && allowAdminUnpaidOverride && nonEmpty(adminOverrideReason)) {
    return {
      ok: true,
      statusCode: 200,
      ...summary,
    };
  }

  return {
    ok: false,
    statusCode: 409,
    error: 'Physical-product orders cannot move to packed, shipped, or delivered without a valid Stripe payment record.',
    ...summary,
  };
}

export function assessAdminReleaseEligibility(input: {
  order: Pick<GuardOrderRow, 'status' | 'escrowStatus'>;
  paymentEvidence: PaymentEvidenceSummary;
}): { eligible: boolean; reason: string | null } {
  if (input.paymentEvidence.allowedNonStripeFlow) {
    return { eligible: false, reason: 'This order belongs to an approved non-Stripe flow and should not be released here.' };
  }

  if (input.paymentEvidence.hasValidPaymentEvidence) {
    return { eligible: false, reason: 'This order already has valid Stripe payment evidence.' };
  }

  if (!ADMIN_RELEASE_ELIGIBLE_STATUSES.has(input.order.status)) {
    return { eligible: false, reason: 'Only unpaid active/test order states can be released.' };
  }

  if (input.order.escrowStatus === 'released') {
    return { eligible: false, reason: 'Orders with released escrow cannot be unlocked from this flow.' };
  }

  return { eligible: true, reason: null };
}
