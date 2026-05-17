import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { expireStaleOffers, notifyOfferStateChange, type OfferLifecycleRow } from './_shared/offerLifecycle';

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const authHeader = event.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }
  const callerId = authUser.id;

  const rl = await checkRateLimit({
    supabase,
    tableName: 'offer_cancel_rate_limits',
    identifier: callerId,
    windowMinutes: 60,
    maxAttempts: 20,
  });
  if (rl.exceeded) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };
  }

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

  const { data: offer, error: fetchError } = await supabase
    .from('offers')
    .select('id, conversationId, listingId, proposedById, recipientId, amountPence, status, expiresAt')
    .eq('id', offerId)
    .maybeSingle<OfferRow>();

  if (fetchError || !offer) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Offer not found' }) };
  }

  if (offer.proposedById !== callerId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the offer sender may cancel this offer' }) };
  }

  if (offer.status === 'pending' && offer.expiresAt && new Date(offer.expiresAt).getTime() <= Date.now()) {
    await expireStaleOffers(supabase, { conversationId: offer.conversationId }).catch((err: unknown) => {
      console.warn('offer-cancel: expireStaleOffers failed (non-fatal):', err);
    });
    return { statusCode: 409, body: JSON.stringify({ error: 'Offer has already expired' }) };
  }

  if (offer.status !== 'pending') {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: `Offer cannot be cancelled (current status: ${offer.status})` }),
    };
  }

  const { data: updatedOffer, error: updateError } = await supabase
    .from('offers')
    .update({ status: 'cancelled' })
    .eq('id', offerId)
    .eq('status', 'pending')
    .select('id, conversationId, listingId, proposedById, recipientId, amountPence')
    .maybeSingle<OfferLifecycleRow>();

  if (updateError) {
    console.error('offer-cancel: update failed:', updateError.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to cancel offer' }) };
  }

  if (!updatedOffer) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Offer is no longer pending' }) };
  }

  await notifyOfferStateChange({
    supabase,
    offer: updatedOffer,
    status: 'cancelled',
    event: 'offer_cancelled',
    title: 'Offer cancelled',
    message: `A £${(updatedOffer.amountPence / 100).toFixed(2)} offer was cancelled.`,
    notifyUserIds: [updatedOffer.recipientId],
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
