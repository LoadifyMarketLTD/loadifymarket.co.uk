import Stripe from 'stripe';
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';
import {
  findOrderTransfer,
  isTransferFullyReversed,
  reconcilePaidOrderPayout,
  reverseOrderTransfer,
} from './_shared/orderTransfer';

/**
 * Releases marketplace-held funds only after delivery/completion, the configured
 * protection window, and a final open-dispute/refund check. No seller Transfer
 * is made by the payment webhook; this scheduled function is the release point.
 */

const ESCROW_WINDOW_DAYS = (() => {
  const parsed = Number(process.env.ESCROW_WINDOW_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
})();

type CandidateOrder = {
  id: string;
  orderNumber: string;
  sellerId: string;
  total: number;
  commission: number;
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

export const handler = schedule('0 2 * * *', async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey || !stripeKey || !stripeKey.startsWith('sk_')) {
    console.error('escrow-release: required Supabase/Stripe credentials are not configured');
    return { statusCode: 200 };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

  const releaseBefore = new Date(
    Date.now() - ESCROW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const candidateFields = 'id, orderNumber, sellerId, total, commission, stripePaymentIntentId';

  const { data: serviceOrders, error: serviceError } = await supabase
    .from('orders')
    .select(candidateFields)
    .eq('status', 'delivered')
    .eq('escrowStatus', 'held')
    .not('serviceCompletedAt', 'is', null)
    .lt('serviceCompletedAt', releaseBefore);

  const { data: physicalOrders, error: physicalError } = await supabase
    .from('orders')
    .select(candidateFields)
    .eq('status', 'delivered')
    .eq('escrowStatus', 'held')
    .is('serviceCompletedAt', null)
    .not('deliveredAt', 'is', null)
    .lt('deliveredAt', releaseBefore);

  if (serviceError) console.error('escrow-release: service query failed:', serviceError.message);
  if (physicalError) console.error('escrow-release: physical query failed:', physicalError.message);
  if (serviceError && physicalError) return { statusCode: 200 };

  const candidates = [
    ...((serviceOrders ?? []) as CandidateOrder[]),
    ...((physicalOrders ?? []) as CandidateOrder[]),
  ];

  if (candidates.length === 0) {
    console.log('escrow-release: no eligible orders');
    return { statusCode: 200 };
  }

  for (const order of candidates) {
    try {
      if (await getOpenDispute(supabase, order.id)) {
        console.log(`escrow-release: ${order.orderNumber} held because a dispute is open`);
        continue;
      }

      if (!order.stripePaymentIntentId) {
        console.error(`escrow-release: ${order.orderNumber} has no Stripe PaymentIntent; manual review required`);
        continue;
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
        console.warn(`escrow-release: ${order.orderNumber} retained because seller payout capability is not active`);
        continue;
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        console.error(`escrow-release: ${order.orderNumber} PaymentIntent is not succeeded`);
        continue;
      }

      const latestCharge = typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id ?? null;
      if (!latestCharge) {
        console.error(`escrow-release: ${order.orderNumber} has no source charge`);
        continue;
      }

      const netSellerPence = Math.round(
        (Number(order.total) - Number(order.commission || 0)) * 100,
      );
      if (!Number.isSafeInteger(netSellerPence) || netSellerPence <= 0) {
        console.error(`escrow-release: ${order.orderNumber} has invalid release amount`);
        continue;
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

      // A cancelled payout represents a prior clawback/refund/dispute. Never
      // silently re-pay it; an admin must intentionally resolve that case.
      if (payoutRow?.status === 'cancelled') {
        console.warn(`escrow-release: ${order.orderNumber} has a cancelled prior payout; manual review required`);
        continue;
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
            .update({ status: 'cancelled', notes: 'Stripe transfer is fully reversed; release requires manual review.' })
            .eq('id', payoutRow.id);
        }
        console.warn(`escrow-release: ${order.orderNumber} transfer is already reversed; manual review required`);
        continue;
      }

      if (!transfer) {
        transfer = await stripe.transfers.create(
          {
            amount: netSellerPence,
            currency: 'gbp',
            destination: sellerProfile.stripeAccountId,
            source_transaction: latestCharge,
            ...(paymentIntent.transfer_group
              ? { transfer_group: paymentIntent.transfer_group }
              : {}),
            metadata: {
              orderId: order.id,
              sellerId: order.sellerId,
              releaseReason: 'protection_window_elapsed',
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
        note: `Released after ${ESCROW_WINDOW_DAYS}-day protection window.`,
      });

      // Re-check BOTH dispute state and order state after the external Stripe
      // call. If a refund/dispute won the race, compensate the transfer before
      // ever marking escrow released.
      const [{ data: latestOrder, error: latestOrderError }, postTransferDispute] = await Promise.all([
        supabase
          .from('orders')
          .select('status, escrowStatus')
          .eq('id', order.id)
          .maybeSingle<{ status: string; escrowStatus: string }>(),
        getOpenDispute(supabase, order.id),
      ]);
      if (latestOrderError) throw latestOrderError;

      if (
        !latestOrder ||
        latestOrder.status !== 'delivered' ||
        latestOrder.escrowStatus !== 'held' ||
        postTransferDispute
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
        console.warn(`escrow-release: ${order.orderNumber} eligibility changed; transfer compensated`);
        continue;
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
        // A final race occurred after the post-transfer read. Inspect the newest
        // state and compensate instead of leaving seller funds out with held DB state.
        const [{ data: finalOrder }, finalDispute] = await Promise.all([
          supabase
            .from('orders')
            .select('status, escrowStatus')
            .eq('id', order.id)
            .maybeSingle<{ status: string; escrowStatus: string }>(),
          getOpenDispute(supabase, order.id),
        ]);
        const reversal = await compensateTransfer(stripe, transfer, {
          orderId: order.id,
          orderStatus: finalOrder?.status,
          escrowStatus: finalOrder?.escrowStatus,
          disputeId: finalDispute?.id,
        });
        await supabase
          .from('payouts')
          .update({ status: 'cancelled', reference: reversal.id, notes: `Escrow finalisation race compensated. Reversal ID: ${reversal.id}` })
          .eq('id', payoutId);
        continue;
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

      console.log(`escrow-release: ${order.orderNumber} released via transfer ${transfer.id}`);
    } catch (error) {
      console.error(`escrow-release: ${order.orderNumber} release failed and remains held:`, error);
    }
  }

  return { statusCode: 200 };
});
