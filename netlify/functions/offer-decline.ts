/**
 * offer-decline
 *
 * Declines a pending offer.  Only the offer recipient (seller) may decline.
 *
 * Marks the offer as 'declined', inserts a system message into the
 * conversation so the buyer sees the outcome in chat, and sends a push
 * notification to the buyer.
 *
 * Body: { offerId: string }
 * Returns: { success: true }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';
import { checkRateLimit } from './_shared/rateLimiter';
import { buildOfferLink, buildOfferPushData } from './_shared/offerLinks';
import { expireStaleOffers } from './_shared/offerLifecycle';

interface RequestBody {
  offerId?: string;
}

interface OfferRow {
  id: string;
  conversationId: string;
  listingId: string;
  proposedById: string;
  recipientId: string;
  amountPence: number;
  status: string;
  expiresAt?: string | null;
}

interface ProductRow {
  title: string;
  sellerId: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Environment guards ──────────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = event.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }
  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }
  const callerId = authUser.id;

  // ── Rate limiting — 20 declines per hour per user ───────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'offer_decline_rate_limits',
    identifier:    callerId,
    windowMinutes: 60,
    maxAttempts:   20,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = JSON.parse(event.body ?? '{}') as RequestBody;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { offerId } = body;
  if (!offerId || typeof offerId !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'offerId is required' }) };
  }

  // ── Fetch offer ─────────────────────────────────────────────────────────────
  const { data: offer, error: fetchError } = await supabase
    .from('offers')
    .select('id, conversationId, listingId, proposedById, recipientId, amountPence, status, expiresAt')
    .eq('id', offerId)
    .maybeSingle<OfferRow>();

  if (fetchError || !offer) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Offer not found' }) };
  }

  if (offer.recipientId !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the offer recipient may reject this offer' }) };
  }

  if (offer.status === 'pending' && offer.expiresAt && new Date(offer.expiresAt).getTime() <= Date.now()) {
    await expireStaleOffers(supabase, { conversationId: offer.conversationId }).catch((err: unknown) => {
      console.warn('offer-decline: expireStaleOffers failed (non-fatal):', err);
    });
    return { statusCode: 409, body: JSON.stringify({ error: 'Offer has already expired' }) };
  }

  if (offer.status !== 'pending') {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: `Offer cannot be rejected (current status: ${offer.status})` }),
    };
  }

  // ── Update offer status ─────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('offers')
    .update({ status: 'rejected' })
    .eq('id', offerId)
    .eq('status', 'pending'); // idempotency guard

  if (updateError) {
    console.error('offer-decline: update failed:', updateError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to decline offer' }) };
  }

  // ── Insert system message ───────────────────────────────────────────────────
  const systemMsg = JSON.stringify({
    _t:    'system',
    event: 'offer_rejected',
    offerId,
    amountPence: offer.amountPence,
  });

  await supabase
    .from('messages')
    .insert({
      conversationId: offer.conversationId,
      senderId:       offer.recipientId,   // seller declines
      receiverId:     offer.proposedById,  // buyer notified
      message:        systemMsg,
    })
    .then(({ error }) => {
      if (error) console.warn('offer-decline: system message insert failed (non-fatal):', error.message);
    });

  // ── Push notification to buyer ──────────────────────────────────────────────
  const { data: listing } = await supabase
    .from('products')
    .select('title, sellerId')
    .eq('id', offer.listingId)
    .maybeSingle<ProductRow>();

  const pounds = (offer.amountPence / 100).toFixed(2);
  const title  = listing?.title ?? 'your item';
  const sellerId = listing?.sellerId ?? offer.recipientId;
  const buyerId = sellerId === offer.proposedById ? offer.recipientId : offer.proposedById;
  const link = buildOfferLink({
    conversationId: offer.conversationId,
    offerId,
    listingId: offer.listingId,
    buyerId,
    sellerId,
    amountPence: offer.amountPence,
    status: 'rejected',
  });

  await supabase
    .from('notifications')
    .insert({
      userId: offer.proposedById,
      type: 'offer_rejected',
      title: 'Offer rejected',
      message: `Your £${pounds} offer for ${title} was rejected.`,
      link,
    });

  await sendPushToUser(supabase, offer.proposedById, {
    title: 'Offer rejected',
    body:  `Your £${pounds} offer for ${title} was rejected.`,
    data:  {
      ...buildOfferPushData({
        conversationId: offer.conversationId,
        offerId,
        listingId: offer.listingId,
        buyerId,
        sellerId,
        amountPence: offer.amountPence,
        status: 'rejected',
      }),
      type: 'offer_rejected',
    },
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
