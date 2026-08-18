import Stripe from 'stripe';
import { sendPushToUser } from './pushNotifications';
import {
  findOrderTransfer,
  isTransferFullyReversed,
  reconcilePaidOrderPayout,
  reverseOrderTransfer,
} from './orderTransfer';

export type EscrowReleaseReason = 'protection_window_elapsed' | 'buyer_confirmed';

export type EscrowReleaseHoldReason =
  | 'order_not_found'
  | 'order_not_releasable'
  | 'open_dispute'
  | 'open_return'
  | 'missing_payment_intent'
  | 'seller_payout_inactive'
  | 'payment_not_succeeded'
  | 'missing_source_charge'
  | 'invalid_release_amount'
  | 'cancelled_prior_payout'
  | 'reversed_prior_transfer'
  | 'eligibility_changed';

export type EscrowReleaseResult =
  | {
      released: true;
      alreadyReleased: boolean;
      orderNumber: string;
      sellerId: string;
      amount: number;
      transferId: string | null;
    }
  | {
      released: false;
      reason: EscrowReleaseHoldReason;
      orderNumber?: string;
    };

type ReleasableOrder = {
  id: string;
  orderNumber: string;
  sellerId: string;
  total: number;
  commission: number;
  status: string;
  escrowStatus: string | null;
  stripePaymentIntentId: string | null;
};

async function getOpenDispute(
  sb: import('@supabase/supabase-js').SupabaseClient,
  orderId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await sb
    .from('disputes')
    .select('id')
    .eq('orderId', orderId)
    .in('status', ['open', 'in_review'])
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return data ?? null;
}

async function getOpenReturn(
  sb: import('@supabase/supabase-js').SupabaseClient,
  orderId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await sb
    .from('returns')
    .select('id')
    .eq('orderId', orderId)
    .in('status', ['requested', 'approved'])
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return data ?? null;
}

async function compensateTransfer(
  stripe: Stripe,
  transfer: Stripe.Transfer,
  input: {
    orderId: string;
    orderStatus?: string | null;
    escrowStatus?: string | null;
    disputeId?: string | null;
  },
): Promise<Stripe.TransferReversal> {
  if (input.orderStatus === 'refunded' || input.escrowStatus === 'refunded') {
    return reverseOrderTransfer(
      stripe,
      transfer,
      `order-refund-transfer:${input.orderId}`,
      { orderId: input.orderId },
    );
  }

  if (input.disputeId) {
    return reverseOrderTransfer(
      stripe,
      transfer,
      `order-dispute-transfer:${input.disputeId}`,
      { orderId: input.orderId, disputeId: input.disputeId },
    );
  }

  return reverseOrderTransfer(
    stripe,
    transfer,
    `escrow-release-abort:${input.orderId}`,
    { orderId: input.orderId, reason: 'release_eligibility_changed' },
  );
}

function releaseNote(reason: EscrowReleaseReason, protectionWindowDays?: number): string {
  if (reason === 'buyer_confirmed') {
    return 'Released after buyer confirmed delivery.';
  }
  return `Released after ${protectionWindowDays ?? 7}-day protection window.`;
}

/**
 * The single authoritative Stripe payout path for a delivered marketplace order.
 * Both the scheduled protection-window release and explicit buyer confirmation
 * call this function so a DB `released` state can never be written without the
 * corresponding idempotent Stripe Transfer and payout ledger reconciliation.
 */
export async function releaseHeldOrder(args: {
  supabase: import('@supabase/supabase-js').SupabaseClient;
  stripe: Stripe;
  orderId: string;
  reason: EscrowReleaseReason;
  protectionWindowDays?: number;
}): Promise<EscrowReleaseResult> {
  const { supabase, stripe, orderId, reason, protectionWindowDays } = args;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, orderNumber, sellerId, total, commission, status, escrowStatus, stripePaymentIntentId')
    .eq('id', orderId)
    .maybeSingle<ReleasableOrder>();
  if (orderError) throw orderError;
  if (!order) return { released: false, reason: 'order_not_found' };

  // If another invocation already completed the release, that completed payout
  // remains authoritative. A return opened afterwards is handled by create-refund,
  // which performs the corresponding seller-transfer reversal safely.
  if (order.status === 'completed' && order.escrowStatus === 'released') {
    return {
      released: true,
      alreadyReleased: true,
      orderNumber: order.orderNumber,
      sellerId: order.sellerId,
      amount: 0,
      transferId: null,
    };
  }

  if (order.status !== 'delivered' || order.escrowStatus !== 'held') {
    return { released: false, reason: 'order_not_releasable', orderNumber: order.orderNumber };
  }

  if (await getOpenDispute(supabase, order.id)) {
    return { released: false, reason: 'open_dispute', orderNumber: order.orderNumber };
  }

  if (await getOpenReturn(supabase, order.id)) {
    return { released: false, reason: 'open_return', orderNumber: order.orderNumber };
  }

  if (!order.stripePaymentIntentId) {
    return { released: false, reason: 'missing_payment_intent', orderNumber: order.orderNumber };
  }

  const { data: sellerProfile, error: sellerError } = await supabase
    .from('seller_profiles')
    .select('stripeAccountId, stripeConnectStatus, sellerStatus, isPaused')
    .eq('userId', order.sellerId)
    .maybeSingle<{
      stripeAccountId: string | null;
      stripeConnectStatus: string | null;
      sellerStatus: string | null;
      isPaused: boolean | null;
    }>();
  if (sellerError) throw sellerError;

  if (
    !sellerProfile?.stripeAccountId ||
    sellerProfile.stripeConnectStatus !== 'active' ||
    sellerProfile.sellerStatus !== 'active' ||
    sellerProfile.isPaused === true
  ) {
    return { released: false, reason: 'seller_payout_inactive', orderNumber: order.orderNumber };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  if (paymentIntent.status !== 'succeeded') {
    return { released: false, reason: 'payment_not_succeeded', orderNumber: order.orderNumber };
  }

  const latestCharge = typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id ?? null;
  if (!latestCharge) {
    return { released: false, reason: 'missing_source_charge', orderNumber: order.orderNumber };
  }

  const netSellerPence = Math.round(
    (Number(order.total) - Number(order.commission || 0)) * 100,
  );
  if (!Number.isSafeInteger(netSellerPence) || netSellerPence <= 0) {
    return { released: false, reason: 'invalid_release_amount', orderNumber: order.orderNumber };
  }
  const netSellerAmount = netSellerPence / 100;

  const { data: payoutRow, error: payoutLookupError } = await supabase
    .from('payouts')
    .select('id, status, stripeTransferId')
    .eq('orderId', order.id)
    .not('stripeTransferId', 'is', null)
    .limit(1)
    .maybeSingle<{ id: string; status: string; stripeTransferId: string }>();
  if (payoutLookupError) throw payoutLookupError;

  if (payoutRow?.status === 'cancelled') {
    return { released: false, reason: 'cancelled_prior_payout', orderNumber: order.orderNumber };
  }

  let transfer = await findOrderTransfer(stripe, {
    orderId: order.id,
    knownTransferId: payoutRow?.stripeTransferId ?? null,
    transferGroup: paymentIntent.transfer_group,
    expectedAmountPence: netSellerPence,
    expectedDestination: sellerProfile.stripeAccountId,
  });

  if (transfer && isTransferFullyReversed(transfer)) {
    if (payoutRow) {
      await supabase
        .from('payouts')
        .update({
          status: 'cancelled',
          notes: 'Stripe transfer is fully reversed; release requires manual review.',
        })
        .eq('id', payoutRow.id);
    }
    return { released: false, reason: 'reversed_prior_transfer', orderNumber: order.orderNumber };
  }

  if (!transfer) {
    transfer = await stripe.transfers.create(
      {
        amount: netSellerPence,
        currency: 'gbp',
        destination: sellerProfile.stripeAccountId,
        source_transaction: latestCharge,
        ...(paymentIntent.transfer_group ? { transfer_group: paymentIntent.transfer_group } : {}),
        metadata: {
          orderId: order.id,
          sellerId: order.sellerId,
          releaseReason: reason,
        },
      },
      { idempotencyKey: `escrow-release:${order.id}` },
    );
  }

  const payoutId = await reconcilePaidOrderPayout(supabase, {
    sellerId: order.sellerId,
    orderId: order.id,
    amount: netSellerAmount,
    transferId: transfer.id,
    note: releaseNote(reason, protectionWindowDays),
  });

  const [
    { data: latestOrder, error: latestOrderError },
    postTransferDispute,
    postTransferReturn,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('status, escrowStatus')
      .eq('id', order.id)
      .maybeSingle<{ status: string; escrowStatus: string }>(),
    getOpenDispute(supabase, order.id),
    getOpenReturn(supabase, order.id),
  ]);
  if (latestOrderError) throw latestOrderError;

  // Another concurrent release invocation may have finalized the exact same
  // idempotent Stripe Transfer. Treat that as success; never reverse good funds.
  // A return opened after completed/released belongs to the refund path instead.
  if (
    latestOrder?.status === 'completed' &&
    latestOrder.escrowStatus === 'released' &&
    !postTransferDispute
  ) {
    return {
      released: true,
      alreadyReleased: true,
      orderNumber: order.orderNumber,
      sellerId: order.sellerId,
      amount: netSellerAmount,
      transferId: transfer.id,
    };
  }

  if (
    !latestOrder ||
    latestOrder.status !== 'delivered' ||
    latestOrder.escrowStatus !== 'held' ||
    postTransferDispute ||
    postTransferReturn
  ) {
    const reversal = await compensateTransfer(stripe, transfer, {
      orderId: order.id,
      orderStatus: latestOrder?.status,
      escrowStatus: latestOrder?.escrowStatus,
      disputeId: postTransferDispute?.id,
    });
    await supabase
      .from('payouts')
      .update({
        status: 'cancelled',
        reference: reversal.id,
        notes: `Escrow release was compensated before finalisation. Reversal ID: ${reversal.id}`,
      })
      .eq('id', payoutId);
    return { released: false, reason: 'eligibility_changed', orderNumber: order.orderNumber };
  }

  const now = new Date().toISOString();
  const { data: releasedOrder, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'completed', escrowStatus: 'released', escrowReleasedAt: now })
    .eq('id', order.id)
    .eq('status', 'delivered')
    .eq('escrowStatus', 'held')
    .select('id')
    .maybeSingle<{ id: string }>();
  if (updateError) throw updateError;

  if (!releasedOrder) {
    const [
      { data: finalOrder },
      finalDispute,
      finalReturn,
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('status, escrowStatus')
        .eq('id', order.id)
        .maybeSingle<{ status: string; escrowStatus: string }>(),
      getOpenDispute(supabase, order.id),
      getOpenReturn(supabase, order.id),
    ]);

    if (
      finalOrder?.status === 'completed' &&
      finalOrder.escrowStatus === 'released' &&
      !finalDispute
    ) {
      return {
        released: true,
        alreadyReleased: true,
        orderNumber: order.orderNumber,
        sellerId: order.sellerId,
        amount: netSellerAmount,
        transferId: transfer.id,
      };
    }

    const reversal = await compensateTransfer(stripe, transfer, {
      orderId: order.id,
      orderStatus: finalOrder?.status,
      escrowStatus: finalOrder?.escrowStatus,
      disputeId: finalDispute?.id,
    });
    await supabase
      .from('payouts')
      .update({
        status: 'cancelled',
        reference: reversal.id,
        notes: `Escrow finalisation race compensated. Reversal ID: ${reversal.id}${finalReturn ? ' Open return detected.' : ''}`,
      })
      .eq('id', payoutId);
    return { released: false, reason: 'eligibility_changed', orderNumber: order.orderNumber };
  }

  await supabase.from('notifications').insert({
    userId: order.sellerId,
    type: 'payment',
    title: 'Funds released',
    message: `Funds for order ${order.orderNumber} have been released: £${netSellerAmount.toFixed(2)}.`,
    link: '/seller/orders',
  }).catch((err: unknown) => console.warn('escrow-release: notification failed:', err));

  sendPushToUser(supabase, order.sellerId, {
    title: 'Funds released 💰',
    body: `Order ${order.orderNumber}: £${netSellerAmount.toFixed(2)} released.`,
    data: { type: 'escrow_released', orderId: order.id },
  }).catch((err: unknown) => console.warn('escrow-release: push failed:', err));

  return {
    released: true,
    alreadyReleased: false,
    orderNumber: order.orderNumber,
    sellerId: order.sellerId,
    amount: netSellerAmount,
    transferId: transfer.id,
  };
}
