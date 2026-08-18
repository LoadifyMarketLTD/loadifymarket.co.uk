import Stripe from 'stripe';
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { releaseHeldOrder } from './_shared/escrowRelease';

/**
 * Scheduled protection-window release. The actual Stripe transfer, payout ledger,
 * dispute/refund race checks, compensation and final order state are centralized
 * in _shared/escrowRelease so buyer-confirmed release uses the identical path.
 */

const ESCROW_WINDOW_DAYS = (() => {
  const parsed = Number(process.env.ESCROW_WINDOW_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
})();

type CandidateOrder = {
  id: string;
  orderNumber: string;
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

  const candidateFields = 'id, orderNumber';

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
      const result = await releaseHeldOrder({
        supabase,
        stripe,
        orderId: order.id,
        reason: 'protection_window_elapsed',
        protectionWindowDays: ESCROW_WINDOW_DAYS,
      });

      if (result.released) {
        if (!result.alreadyReleased) {
          console.log(`escrow-release: ${result.orderNumber} released via transfer ${result.transferId}`);
        }
        continue;
      }

      if (result.reason === 'open_dispute') {
        console.log(`escrow-release: ${order.orderNumber} held because a dispute is open`);
      } else {
        console.warn(`escrow-release: ${order.orderNumber} retained (${result.reason})`);
      }
    } catch (error) {
      console.error(`escrow-release: ${order.orderNumber} release failed and remains held:`, error);
    }
  }

  return { statusCode: 200 };
});
