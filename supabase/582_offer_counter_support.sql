-- 582_offer_counter_support.sql
--
-- Adds explicit `countered` offer status support and updates accept_offer()
-- so orders are created with the real buyer even when a seller-originated
-- counter offer is accepted by the buyer.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM   pg_constraint c
    JOIN   pg_class      t ON t.oid = c.conrelid
    JOIN   pg_namespace  n ON n.oid = t.relnamespace
    WHERE  n.nspname = 'public'
      AND  t.relname = 'offers'
      AND  c.contype = 'c'
      AND  pg_get_constraintdef(c.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE offers
  ADD CONSTRAINT offers_status_check
  CHECK (status IN (
    'pending',
    'countered',
    'accepted',
    'declined',
    'rejected',
    'expired',
    'cancelled'
  ));

CREATE OR REPLACE FUNCTION accept_offer(
  p_offer_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer          offers%ROWTYPE;
  v_listing        products%ROWTYPE;
  v_order_id       UUID;
  v_reserved_until TIMESTAMPTZ;
  v_system_msg     TEXT;
  v_amount_pounds  NUMERIC;
  v_buyer_id       UUID;
BEGIN
  SELECT * INTO v_offer
  FROM   offers
  WHERE  id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  IF v_offer.status = 'accepted' THEN
    SELECT id INTO v_order_id
    FROM   orders
    WHERE  "offerId" = p_offer_id
    LIMIT  1;
    RETURN jsonb_build_object('order_id', v_order_id, 'already_done', TRUE);
  END IF;

  IF v_offer."recipientId" <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer_not_pending: %', v_offer.status;
  END IF;

  SELECT * INTO v_listing
  FROM   products
  WHERE  id = v_offer."listingId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  IF v_listing."listingStatus" <> 'active' THEN
    RAISE EXCEPTION 'listing_not_available: %', v_listing."listingStatus";
  END IF;

  UPDATE offers
  SET    status = 'accepted'
  WHERE  id = p_offer_id;

  v_amount_pounds := v_offer."amountPence"::NUMERIC / 100;

  -- The buyer is whichever offer participant is NOT the listing seller.
  IF v_offer."proposedById" = v_listing."sellerId" THEN
    v_buyer_id := v_offer."recipientId";
  ELSE
    v_buyer_id := v_offer."proposedById";
  END IF;

  IF v_buyer_id = v_listing."sellerId" THEN
    RAISE EXCEPTION 'invalid_offer_participants';
  END IF;

  INSERT INTO orders (
    "buyerId", "sellerId", "productId",
    quantity,
    subtotal, "vatAmount", "shippingAmount", total,
    status, "escrowStatus",
    "shippingAddress", "billingAddress",
    "offerId"
  ) VALUES (
    v_buyer_id,
    v_listing."sellerId",
    v_offer."listingId",
    1,
    v_amount_pounds,
    0.00,
    0.00,
    v_amount_pounds,
    'awaiting_payment',
    'held',
    '{}',
    '{}',
    p_offer_id
  )
  RETURNING id INTO v_order_id;

  v_reserved_until := NOW() + INTERVAL '15 minutes';

  UPDATE products
  SET    "listingStatus" = 'reserved',
         "reservedUntil" = v_reserved_until
  WHERE  id = v_offer."listingId";

  v_system_msg := json_build_object(
    '_t',          'system',
    'event',       'offer_accepted',
    'orderId',     v_order_id,
    'amountPence', v_offer."amountPence"
  )::TEXT;

  INSERT INTO messages (
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

  INSERT INTO order_events ("orderId", "actorId", event, metadata)
  VALUES (
    v_order_id,
    p_actor_id,
    'offer_accepted',
    jsonb_build_object(
      'offerId',     p_offer_id,
      'amountPence', v_offer."amountPence"
    )
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'already_done', FALSE);
END;
$$;

REVOKE ALL ON FUNCTION accept_offer(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION accept_offer(UUID, UUID) TO service_role;
