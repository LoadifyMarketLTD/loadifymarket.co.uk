import type { SupabaseClient } from '@supabase/supabase-js';
import { buildOfferLink, buildOfferPushData } from './offerLinks';
import { sendPushToUser } from './pushNotifications';

export interface OfferLifecycleRow {
  id: string;
  conversationId: string;
  listingId: string;
  proposedById: string;
  recipientId: string;
  amountPence: number;
}

interface ProductMetaRow {
  id: string;
  title: string | null;
  sellerId: string | null;
}

interface NotifyOfferStateChangeArgs {
  supabase: SupabaseClient;
  offer: OfferLifecycleRow;
  status: 'cancelled' | 'expired';
  event: 'offer_cancelled' | 'offer_expired';
  title: string;
  message: string;
  notifyUserIds: string[];
}

function deriveBuyerAndSellerIds(offer: OfferLifecycleRow, sellerId: string | null): {
  buyerId: string;
  sellerId: string;
} {
  const resolvedSellerId = sellerId?.trim() || offer.recipientId;
  return {
    sellerId: resolvedSellerId,
    buyerId: offer.proposedById === resolvedSellerId ? offer.recipientId : offer.proposedById,
  };
}

export async function notifyOfferStateChange({
  supabase,
  offer,
  status,
  event,
  title,
  message,
  notifyUserIds,
}: NotifyOfferStateChangeArgs): Promise<void> {
  const { data: listing } = await supabase
    .from('products')
    .select('id, title, sellerId')
    .eq('id', offer.listingId)
    .maybeSingle<ProductMetaRow>();

  const { buyerId, sellerId } = deriveBuyerAndSellerIds(offer, listing?.sellerId ?? null);
  const link = buildOfferLink({
    conversationId: offer.conversationId,
    offerId: offer.id,
    listingId: offer.listingId,
    buyerId,
    sellerId,
    amountPence: offer.amountPence,
    status,
  });

  await supabase
    .from('messages')
    .insert({
      conversationId: offer.conversationId,
      senderId: offer.proposedById,
      receiverId: offer.recipientId,
      message: JSON.stringify({
        _t: 'system',
        event,
        offerId: offer.id,
        amountPence: offer.amountPence,
      }),
    })
    .then(({ error }) => {
      if (error) {
        console.warn(`offer lifecycle: failed to insert ${event} system message:`, error.message);
      }
    });

  const uniqueNotifyUserIds = [...new Set(notifyUserIds.filter(Boolean))];
  if (uniqueNotifyUserIds.length === 0) return;

  await supabase
    .from('notifications')
    .insert(uniqueNotifyUserIds.map((userId) => ({
      userId,
      type: 'system',
      title,
      message,
      link,
    })))
    .then(({ error }) => {
      if (error) {
        console.warn(`offer lifecycle: failed to insert ${event} notifications:`, error.message);
      }
    });

  await Promise.allSettled(uniqueNotifyUserIds.map((userId) =>
    sendPushToUser(supabase, userId, {
      title,
      body: message,
      data: {
        ...buildOfferPushData({
          conversationId: offer.conversationId,
          offerId: offer.id,
          listingId: offer.listingId,
          buyerId,
          sellerId,
          amountPence: offer.amountPence,
          status,
        }),
        type: 'offer_update',
      },
    }),
  ));
}

export async function expireStaleOffers(
  supabase: SupabaseClient,
  options: { conversationId?: string } = {},
): Promise<string[]> {
  let query = supabase
    .from('offers')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expiresAt', new Date().toISOString())
    .select('id, conversationId, listingId, proposedById, recipientId, amountPence');

  if (options.conversationId) {
    query = query.eq('conversationId', options.conversationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to expire stale offers: ${error.message}`);
  }

  const expiredOffers = (data ?? []) as OfferLifecycleRow[];
  if (expiredOffers.length === 0) return [];

  await Promise.allSettled(expiredOffers.map((offer) =>
    notifyOfferStateChange({
      supabase,
      offer,
      status: 'expired',
      event: 'offer_expired',
      title: 'Offer expired',
      message: `A £${(offer.amountPence / 100).toFixed(2)} offer has expired.`,
      notifyUserIds: [offer.proposedById, offer.recipientId],
    }),
  ));

  return expiredOffers.map((offer) => offer.id);
}
