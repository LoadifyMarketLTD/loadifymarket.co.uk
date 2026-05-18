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

interface AcceptOfferRpcResult {
  order_id: string | null;
  already_done: boolean;
}

function jsonResponse(statusCode: number, payload: Record<string, unknown>) {
  return { statusCode, body: JSON.stringify(payload) };
}

function getServerConfig():
  | { supabaseUrl: string; serviceRoleKey: string }
  | { errorResponse: { statusCode: number; body: string } } {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return { errorResponse: jsonResponse(500, { error: 'Database configuration is missing' }) };
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== 'https:') {
      return { errorResponse: jsonResponse(500, { error: 'Database configuration is invalid' }) };
    }
  } catch {
    return { errorResponse: jsonResponse(500, { error: 'Database configuration is invalid' }) };
  }

  if (/\s/.test(serviceRoleKey) || !serviceRoleKey.startsWith('eyJ')) {
    return { errorResponse: jsonResponse(500, { error: 'Database configuration is invalid' }) };
  }

  return { supabaseUrl, serviceRoleKey };
}

function normalizeAcceptOfferResult(value: unknown): AcceptOfferRpcResult | null {
  if (Array.isArray(value)) {
    return normalizeAcceptOfferResult(value[0] ?? null);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if ('accept_offer' in candidate) {
    return normalizeAcceptOfferResult(candidate.accept_offer);
  }

  if (typeof candidate.already_done !== 'boolean') {
    return null;
  }

  return {
    order_id: typeof candidate.order_id === 'string' ? candidate.order_id : null,
    already_done: candidate.already_done,
  };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed' });
    }

    const config = getServerConfig();
    if ('errorResponse' in config) {
      return config.errorResponse;
    }

    const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false },
    });

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = event.headers['authorization'] ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return jsonResponse(401, { error: 'Invalid authentication token' });
    }
    const callerId = authUser.id;

    // ── Rate limiting — 20 accepts per hour per user ──────────────────────────
    const rl = await checkRateLimit({
      supabase,
      tableName: 'offer_accept_rate_limits',
      identifier: callerId,
      windowMinutes: 60,
      maxAttempts: 20,
    });
    if (rl.exceeded) {
      return jsonResponse(429, { error: 'Too many requests. Please try again later.' });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: RequestBody;
    try {
      body = JSON.parse(event.body ?? '{}') as RequestBody;
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const { offerId } = body;
    if (!offerId || typeof offerId !== 'string') {
      return jsonResponse(400, { error: 'offerId is required' });
    }

    // ── Fetch offer to pre-validate caller is recipient ──────────────────────
    const { data: offer, error: fetchError } = await supabase
      .from('offers')
      .select('id, conversationId, listingId, proposedById, recipientId, amountPence, status, expiresAt')
      .eq('id', offerId)
      .maybeSingle<OfferRow>();

    if (fetchError || !offer) {
      return jsonResponse(404, { error: 'Offer not found' });
    }

    if (offer.recipientId !== callerId) {
      return jsonResponse(403, { error: 'Only the offer recipient may accept this offer' });
    }

    if (offer.status === 'pending' && offer.expiresAt && new Date(offer.expiresAt).getTime() <= Date.now()) {
      await expireStaleOffers(supabase, { conversationId: offer.conversationId }).catch((err: unknown) => {
        console.warn('offer-accept: expireStaleOffers failed (non-fatal):', err);
      });
      return jsonResponse(409, { error: 'Offer has already expired' });
    }

    if (offer.status !== 'pending' && offer.status !== 'accepted') {
      return jsonResponse(409, { error: `Offer cannot be accepted (current status: ${offer.status})` });
    }

    await supabase.rpc('release_stale_unpaid_listing_locks').catch((err: unknown) => {
      console.warn('offer-accept: release_stale_unpaid_listing_locks RPC failed (non-fatal):', err);
    });

    // ── Call the atomic accept_offer RPC ─────────────────────────────────────
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('accept_offer', { p_offer_id: offerId, p_actor_id: callerId });

    if (rpcError) {
      console.error('offer-accept: accept_offer RPC error:', rpcError.code, rpcError.message, rpcError.details, rpcError.hint);

      const msg = rpcError.message ?? '';
      if (msg.includes('offer_not_found')) return jsonResponse(404, { error: 'Offer not found' });
      if (msg.includes('not_authorized')) return jsonResponse(403, { error: 'Not authorized' });
      if (msg.includes('offer_not_pending')) return jsonResponse(409, { error: 'Offer is no longer pending' });
      if (msg.includes('listing_not_found')) return jsonResponse(404, { error: 'Listing not found' });
      if (msg.includes('listing_not_available')) return jsonResponse(409, { error: 'Listing is no longer available' });
      if (msg.includes('invalid_offer_participants')) return jsonResponse(409, { error: 'Offer participants are invalid' });
      if (rpcError.code === '23505') return jsonResponse(409, { error: 'An active order already exists for this listing' });

      return jsonResponse(500, { error: 'Failed to accept offer' });
    }

    const normalizedResult = normalizeAcceptOfferResult(rpcResult);
    if (!normalizedResult) {
      console.error('offer-accept: unexpected accept_offer RPC payload:', rpcResult);
      return jsonResponse(500, { error: 'Failed to accept offer' });
    }

    const { order_id: orderId, already_done: alreadyDone } = normalizedResult;

    // ── Buyer notification side-effects (non-fatal) ──────────────────────────
    if (!alreadyDone) {
      try {
        const { data: listing } = await supabase
          .from('products')
          .select('title, sellerId')
          .eq('id', offer.listingId)
          .maybeSingle<ProductRow>();

        const pounds = (offer.amountPence / 100).toFixed(2);
        const title = listing?.title ?? 'your item';
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

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            userId: offer.proposedById,
            type: 'offer_accepted',
            title: 'Your offer was accepted',
            message: `Your £${pounds} offer for ${title} was accepted.`,
            link,
          });

        if (notificationError) {
          console.warn('offer-accept: notification insert failed (non-fatal):', notificationError.message);
        }

        await sendPushToUser(supabase, offer.proposedById, {
          title: 'Your offer was accepted! 🎉',
          body: `Your £${pounds} offer for ${title} was accepted. Tap to pay.`,
          data: {
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
      } catch (notificationErr) {
        console.warn('offer-accept: post-accept notification flow failed (non-fatal):', notificationErr);
      }
    }

    return jsonResponse(200, { orderId, alreadyDone });
  } catch (err) {
    console.error('offer-accept: unhandled error:', err);
    return jsonResponse(500, { error: 'Failed to accept offer' });
  }
};
