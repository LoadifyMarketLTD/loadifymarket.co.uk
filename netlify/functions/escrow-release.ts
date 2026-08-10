import Stripe from 'stripe';
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';

/**
 * Releases marketplace-held funds only after delivery/completion, the configured
 * protection window, and a final open-dispute check. No seller Transfer is made
 * by the payment webhook; this scheduled function is the release point.
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
      const { data: openDispute, error: disputeError } = await supabase
        .from('disputes')
        .select('id')
        .eq('orderId', order.id)
        .not('status', 'in', '("resolved","closed","rejected")')
        .limit(1)
        .maybeSingle();

      if (disputeError) throw disputeError;
      if (openDispute) {
        console.log(`escrow-release: ${order.orderNumber} held because a dispute is open`);
        continue;
      }

      if (!order.stripePaymentIntentId) {
        console.error(`escrow-release: ${order.orderNumber} has no Stripe PaymentIntent; manual review required`);
        continue;
      }

      // If a prior invocation already created and recorded the transfer but did
      // not finish the order update, resume safely without sending money twice.
      const { data: existingPaidPayout, error: payoutLookupError } = await supabase
        .from('payouts')
        .select('id, stripeTransferId, amount')
        .eq('orderId', order.id)
        .eq('status', 'paid')
        .not('stripeTransferId', 'is', null)
        .limit(1)
        .maybeSingle<{ id: string; stripeTransferId: string; amount: number }>();
      if (payoutLookupError) throw payoutLookupError;

      const netSellerAmount = Math.max(0, Number(order.total) - Number(order.commission || 0));
      if (!Number.isFinite(netSellerAmount) || netSellerAmount <= 0) {
        console.error(`escrow-release: ${order.orderNumber} has invalid release amount`);
        continue;
      }

      let transferId = existingPaidPayout?.stripeTransferId ?? null;

      if (!transferId) {
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

        const transfer = await stripe.transfers.create(
          {
            amount: Math.round(netSellerAmount * 100),
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
        transferId = transfer.id;

        const { error: payoutInsertError } = await supabase
          .from('payouts')
          .insert({
            sellerId: order.sellerId,
            orderId: order.id,
            amount: netSellerAmount,
            currency: 'GBP',
            status: 'paid',
            stripeTransferId: transfer.id,
            paidAt: new Date().toISOString(),
            notes: `Released after ${ESCROW_WINDOW_DAYS}-day protection window.`,
          });

        if (payoutInsertError && payoutInsertError.code !== '23505') {
          // Stripe idempotency guarantees the same transfer is returned on the
          // next run, so leaving the order held is safer than falsely releasing.
          throw payoutInsertError;
        }
      }

      if (!transferId) continue;

      const now = new Date().toISOString();
      const { data: releasedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          escrowStatus: 'released',
          escrowReleasedAt: now,
        })
        .eq('id', order.id)
        .eq('status', 'delivered')
        .eq('escrowStatus', 'held')
        .select('id')
        .maybeSingle<{ id: string }>();

      if (updateError) throw updateError;
      if (!releasedOrder) continue;

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

      console.log(`escrow-release: ${order.orderNumber} released via transfer ${transferId}`);
    } catch (error) {
      console.error(`escrow-release: ${order.orderNumber} release failed and remains held:`, error);
    }
  }

  return { statusCode: 200 };
});
