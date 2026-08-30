CREATE OR REPLACE FUNCTION public.accept_offer(
  p_offer_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_offer public.offers%ROWTYPE;
  v_listing public.products%ROWTYPE;
  v_order_id UUID;
  v_reserved_until TIMESTAMPTZ;
  v_system_msg TEXT;
  v_amount_pounds NUMERIC;
  v_buyer_id UUID;
BEGIN
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  IF v_offer.status = 'accepted' THEN
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE "offerId" = p_offer_id
    LIMIT 1;
    RETURN jsonb_build_object('order_id', v_order_id, 'already_done', TRUE);
  END IF;

  IF v_offer."recipientId" <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer_not_pending: %', v_offer.status;
  END IF;

  SELECT * INTO v_listing
  FROM public.products
  WHERE id = v_offer."listingId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  IF v_listing."listingStatus" <> 'active' THEN
    RAISE EXCEPTION 'listing_not_available: %', v_listing."listingStatus";
  END IF;

  UPDATE public.offers
  SET status = 'accepted'
  WHERE id = p_offer_id;

  v_amount_pounds := v_offer."amountPence"::NUMERIC / 100;

  IF v_offer."proposedById" = v_listing."sellerId" THEN
    v_buyer_id := v_offer."recipientId";
  ELSE
    v_buyer_id := v_offer."proposedById";
  END IF;

  IF v_buyer_id = v_listing."sellerId" THEN
    RAISE EXCEPTION 'invalid_offer_participants';
  END IF;

  INSERT INTO public.orders (
    "buyerId", "sellerId", "productId",
    quantity, subtotal, "vatAmount", "shippingAmount", total,
    status, "escrowStatus", "shippingAddress", "billingAddress", "offerId"
  ) VALUES (
    v_buyer_id, v_listing."sellerId", v_offer."listingId",
    1, v_amount_pounds, 0.00, 0.00, v_amount_pounds,
    'awaiting_payment', 'held', '{}', '{}', p_offer_id
  )
  RETURNING id INTO v_order_id;

  v_reserved_until := NOW() + INTERVAL '15 minutes';

  UPDATE public.products
  SET "listingStatus" = 'reserved',
      "reservedUntil" = v_reserved_until
  WHERE id = v_offer."listingId";

  v_system_msg := json_build_object(
    '_t', 'system',
    'event', 'offer_accepted',
    'orderId', v_order_id,
    'amountPence', v_offer."amountPence"
  )::TEXT;

  INSERT INTO public.messages (
    "conversationId", "senderId", "receiverId", message
  ) VALUES (
    v_offer."conversationId",
    p_actor_id,
    CASE
      WHEN p_actor_id = v_offer."recipientId" THEN v_offer."proposedById"
      ELSE v_offer."recipientId"
    END,
    v_system_msg
  );

  INSERT INTO public.order_events ("orderId", "actorId", event, metadata)
  VALUES (
    v_order_id,
    p_actor_id,
    'offer_accepted',
    jsonb_build_object('offerId', p_offer_id, 'amountPence', v_offer."amountPence")
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'already_done', FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_offer(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_offer(UUID, UUID) TO service_role;;
