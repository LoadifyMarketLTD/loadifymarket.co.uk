import Stripe from 'stripe';
import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const PAYMENT_WINDOW_MINUTES = 30;
const MAX_SESSIONS_PER_RUN = 10;

interface PendingPaymentSession {
  id: string;
  stripeSessionId: string;
  stripePaymentIntent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function productIdsFromMetadata(metadata: Record<string, unknown> | null): string[] {
  const items = metadata?.items;
  if (!Array.isArray(items)) return [];

  return [...new Set(
    items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const productId = (item as Record<string, unknown>).productId;
        return typeof productId === 'string' && productId ? productId : null;
      })
      .filter((id): id is string => Boolean(id)),
  )];
}

export const handler = schedule('*/5 * * * *', async () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!stripeKey.startsWith('sk_') || !supabaseUrl || !serviceRoleKey) {
    console.error('payment-session-cleanup: missing Stripe or Supabase configuration');
    return { statusCode: 200 };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Accepted-offer flows can create an awaiting_payment order before any Stripe
  // payment_session exists. Release those stale unpaid order locks on the same
  // five-minute cadence as abandoned Stripe sessions so they cannot remain in
  // seller/buyer dashboards indefinitely when checkout is never started.
  const { data: releasedOrderCount, error: staleOrderError } = await supabase
    .rpc('release_stale_unpaid_listing_locks');
  if (staleOrderError) {
    console.error('payment-session-cleanup: stale unpaid order cleanup failed:', staleOrderError.message);
  } else if (typeof releasedOrderCount === 'number' && releasedOrderCount > 0) {
    console.log(`payment-session-cleanup: released ${releasedOrderCount} stale unpaid order lock(s)`);
  }

  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('payment_sessions')
    .select('id, stripeSessionId, stripePaymentIntent, metadata, createdAt')
    .eq('status', 'pending')
    .lt('createdAt', cutoff)
    .order('createdAt', { ascending: true })
    .limit(MAX_SESSIONS_PER_RUN);

  if (error) {
    console.error('payment-session-cleanup: pending session query failed:', error.message);
    return { statusCode: 200 };
  }

  const sessions = (data ?? []) as PendingPaymentSession[];
  if (sessions.length === 0) return { statusCode: 200 };

  for (const sessionRow of sessions) {
    let stripeConfirmedUnpayable = false;

    try {
      if (sessionRow.stripeSessionId.startsWith('cs_')) {
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionRow.stripeSessionId);

        if (checkoutSession.payment_status === 'paid' || checkoutSession.status === 'complete') {
          console.warn(
            `payment-session-cleanup: Checkout ${sessionRow.stripeSessionId} is complete/paid while DB session ${sessionRow.id} is pending; leaving for webhook recovery`,
          );
          continue;
        }

        if (checkoutSession.status === 'expired') {
          stripeConfirmedUnpayable = true;
        } else if (checkoutSession.status === 'open') {
          await stripe.checkout.sessions.expire(sessionRow.stripeSessionId);
          stripeConfirmedUnpayable = true;
        } else {
          console.warn(
            `payment-session-cleanup: Checkout ${sessionRow.stripeSessionId} has unexpected status ${String(checkoutSession.status)}; stock remains reserved`,
          );
          continue;
        }
      } else {
        const paymentIntentId = sessionRow.stripePaymentIntent ||
          (sessionRow.stripeSessionId.startsWith('pi_') ? sessionRow.stripeSessionId : null);

        if (!paymentIntentId) {
          console.warn(`payment-session-cleanup: DB session ${sessionRow.id} has no recognised Stripe payment object`);
          continue;
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === 'succeeded') {
          console.warn(
            `payment-session-cleanup: PaymentIntent ${paymentIntentId} succeeded while DB session ${sessionRow.id} is pending; leaving for webhook recovery`,
          );
          continue;
        }

        if (paymentIntent.status === 'canceled') {
          stripeConfirmedUnpayable = true;
        } else if (
          paymentIntent.status === 'requires_payment_method' ||
          paymentIntent.status === 'requires_confirmation' ||
          paymentIntent.status === 'requires_action' ||
          paymentIntent.status === 'requires_capture'
        ) {
          await stripe.paymentIntents.cancel(paymentIntentId, {
            cancellation_reason: 'abandoned',
          });
          stripeConfirmedUnpayable = true;
        } else {
          console.warn(
            `payment-session-cleanup: PaymentIntent ${paymentIntentId} is ${paymentIntent.status}; stock remains reserved`,
          );
          continue;
        }
      }

      if (!stripeConfirmedUnpayable) continue;

      const { data: cancelledSession, error: cancelDbError } = await supabase
        .from('payment_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionRow.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle<{ id: string }>();
      if (cancelDbError) throw cancelDbError;
      if (!cancelledSession) continue;

      const productIds = productIdsFromMetadata(sessionRow.metadata);
      const reservationToken = typeof sessionRow.metadata?.reservationToken === 'string'
        ? sessionRow.metadata.reservationToken
        : null;

      if (reservationToken && productIds.length > 0) {
        const { error: releaseError } = await supabase
          .from('products')
          .update({ listingStatus: 'active', reservedUntil: null, reservationToken: null })
          .in('id', productIds)
          .eq('listingStatus', 'reserved')
          .eq('reservationToken', reservationToken);
        if (releaseError) throw releaseError;
      } else {
        const { error: releaseError } = await supabase.rpc('release_expired_reservations');
        if (releaseError) throw releaseError;
      }

      console.log(`payment-session-cleanup: cancelled abandoned DB session ${sessionRow.id}`);
    } catch (cleanupError) {
      console.error(`payment-session-cleanup: session ${sessionRow.id} cleanup failed:`, cleanupError);
    }
  }

  return { statusCode: 200 };
});