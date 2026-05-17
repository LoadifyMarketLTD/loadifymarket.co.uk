interface OfferLinkPayload {
  conversationId: string;
  offerId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountPence: number;
  status: string;
}

export function buildOfferLink(payload: OfferLinkPayload): string {
  const params = new URLSearchParams({
    offerId: payload.offerId,
    listingId: payload.listingId,
    buyerId: payload.buyerId,
    sellerId: payload.sellerId,
    amountPence: String(payload.amountPence),
    status: payload.status,
    target: 'offer-card',
  });
  return `/inbox/${payload.conversationId}?${params.toString()}`;
}

export function buildOfferPushData(payload: OfferLinkPayload): Record<string, string> {
  return {
    type: 'offer_update',
    conversationId: payload.conversationId,
    offerId: payload.offerId,
    listingId: payload.listingId,
    buyerId: payload.buyerId,
    sellerId: payload.sellerId,
    amountPence: String(payload.amountPence),
    status: payload.status,
    targetRoute: `/inbox/${payload.conversationId}`,
    target: 'offer-card',
  };
}
