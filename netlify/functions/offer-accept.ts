/**
 * offer-accept
 *
 * Accepts a pending offer via the `accept_offer()` PL/pgSQL RPC, which
 * atomically:
 *   - validates offer + listing state with SELECT FOR UPDATE locks
 *   - sets offer → accepted
 *   - creates an order (awaiting_payment)
 *   - reserves the listing (15 min)
 *   - inserts a system message + order_event
 *
 * Must be called by the offer recipient (seller).
 *
 * Body: { offerId: string }
 * Returns: { orderId: string, alreadyDone: boolean }
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from './_shared/pushNotifications';
import { checkRateLimit } from './_shared/rateLimiter';
import { buildOfferLink, buildOfferPushData } from './_shared/offerLinks';

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

  // ── Rate limiting — 20 accepts per hour per user ────────────────────────────
  const rl = await checkRateLimit({
    supabase,
    tableName:     'offer_accept_rate_limits',
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

  // ── Fetch offer to pre-validate caller is recipient ────────────────────────
  // The RPC also validates this but an early check avoids an unnecessary RPC
  // round-trip for non-recipients.
  const { data: offer, error: fetchError } = await supabase
    .from('offers')
    .select('id, conversationId, listingId, proposedById, recipientId, amountPence, status')
    .eq('id', offerId)
    .maybeSingle<OfferRow>();

  if (fetchError || !offer) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Offer not found' }) };
  }

  if (offer.recipientId !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the offer recipient may accept this offer' }) };
  }

  if (offer.status !== 'pending' && offer.status !== 'accepted') {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: `Offer cannot be accepted (current status: ${offer.status})` }),
    };
  }

  // ── Call the atomic accept_offer RPC ───────────────────────────────────────
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('accept_offer', { p_offer_id: offerId, p_actor_id: callerId })
    .single<{ order_id: string; already_done: boolean }>();

  if (rpcError) {
    console.error('offer-accept: accept_offer RPC error:', rpcError.message);

    // Map RPC exceptions to HTTP codes.
    const msg = rpcError.message ?? '';
    if (msg.includes('offer_not_found'))        return { statusCode: 404, body: JSON.stringify({ error: 'Offer not found' }) };
    if (msg.includes('not_authorized'))          return { statusCode: 403, body: JSON.stringify({ error: 'Not authorized' }) };
    if (msg.includes('offer_not_pending'))       return { statusCode: 409, body: JSON.stringify({ error: 'Offer is no longer pending' }) };
    if (msg.includes('listing_not_found'))       return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };
    if (msg.includes('listing_not_available'))   return { statusCode: 409, body: JSON.stringify({ error: 'Listing is no longer available' }) };
    if (rpcError.code === '23505')               return { statusCode: 409, body: JSON.stringify({ error: 'An active order already exists for this listing' }) };

    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to accept offer' }) };
  }

  const { order_id: orderId, already_done: alreadyDone } = rpcResult;

  // ── Push notification to buyer ──────────────────────────────────────────────
  // Non-fatal — push failure must never break the accept flow.
  if (!alreadyDone) {
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
      offerId: offer.id,
      listingId: offer.listingId,
      buyerId,
      sellerId,
      amountPence: offer.amountPence,
      status: 'accepted',
    });

    await supabase
      .from('notifications')
      .insert({
        userId: offer.proposedById,
        type: 'offer_accepted',
        title: 'Your offer was accepted',
        message: `Your £${pounds} offer for ${title} was accepted.`,
        link,
      });

    await sendPushToUser(supabase, offer.proposedById, {
      title: 'Your offer was accepted! 🎉',
      body:  `Your £${pounds} offer for ${title} was accepted. Tap to pay.`,
      data:  {
        ...buildOfferPushData({
          conversationId: offer.conversationId,
          offerId: offer.id,
          listingId: offer.listingId,
          buyerId,
          sellerId,
          amountPence: offer.amountPence,
          status: 'accepted',
        }),
        type: 'offer_accepted',
        orderId,
      },
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ orderId, alreadyDone }),
  };
};
