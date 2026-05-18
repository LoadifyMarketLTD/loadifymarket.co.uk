-- =============================================================================
-- 591_rebuild_offer_action_rpcs.sql
-- Full deterministic rebuild of offer-action RPCs used by Netlify offer handlers.
-- =============================================================================

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
  v_conversation   conversations%ROWTYPE;
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

  SELECT * INTO v_conversation
  FROM   conversations
  WHERE  id = v_offer."conversationId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation_not_found';
  END IF;

  IF p_actor_id <> v_conversation."user1Id" AND p_actor_id <> v_conversation."user2Id" THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_offer."recipientId" <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_offer.status = 'accepted' THEN
    SELECT id INTO v_order_id
    FROM   orders
    WHERE  "offerId" = p_offer_id
    LIMIT  1;

    RETURN jsonb_build_object(
      'ok', TRUE,
      'offerId', v_offer.id,
      'status', 'accepted',
      'orderId', v_order_id,
      'alreadyDone', TRUE
    );
  END IF;

  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer_not_actionable:%', v_offer.status;
  END IF;

  IF v_offer."expiresAt" <= NOW() THEN
    UPDATE offers
    SET    status = 'expired'
    WHERE  id = p_offer_id;

    RAISE EXCEPTION 'offer_expired';
  END IF;

  SELECT * INTO v_listing
  FROM   products
  WHERE  id = v_offer."listingId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  IF v_listing."listingStatus" <> 'active' THEN
    RAISE EXCEPTION 'listing_not_available:%', v_listing."listingStatus";
  END IF;

  UPDATE offers
  SET    status = 'accepted'
  WHERE  id = p_offer_id;

  v_amount_pounds := v_offer."amountPence"::NUMERIC / 100;

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
    'offerId',     v_offer.id,
    'orderId',     v_order_id,
    'amountPence', v_offer."amountPence"
  )::TEXT;

  INSERT INTO messages (
    "conversationId", "senderId", "receiverId", message, "orderId"
  ) VALUES (
    v_offer."conversationId",
    p_actor_id,
    CASE
      WHEN p_actor_id = v_offer."recipientId" THEN v_offer."proposedById"
      ELSE v_offer."recipientId"
    END,
    v_system_msg,
    v_order_id
  );

  INSERT INTO order_events ("orderId", "actorId", event, metadata)
  VALUES (
    v_order_id,
    p_actor_id,
    'offer_accepted',
    jsonb_build_object(
      'offerId',     v_offer.id,
      'amountPence', v_offer."amountPence"
    )
  );

  UPDATE conversations
  SET    "lastMessageAt" = NOW()
  WHERE  id = v_offer."conversationId";

  RETURN jsonb_build_object(
    'ok', TRUE,
    'offerId', v_offer.id,
    'status', 'accepted',
    'orderId', v_order_id,
    'alreadyDone', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION decline_offer(
  p_offer_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer        offers%ROWTYPE;
  v_conversation conversations%ROWTYPE;
  v_system_msg   TEXT;
  v_target_status TEXT;
BEGIN
  SELECT * INTO v_offer
  FROM   offers
  WHERE  id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  SELECT * INTO v_conversation
  FROM   conversations
  WHERE  id = v_offer."conversationId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation_not_found';
  END IF;

  IF p_actor_id <> v_conversation."user1Id" AND p_actor_id <> v_conversation."user2Id" THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_offer."recipientId" <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_offer.status = 'declined' OR v_offer.status = 'rejected' THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'offerId', v_offer.id,
      'status', 'declined',
      'orderId', NULL,
      'alreadyDone', TRUE
    );
  END IF;

  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer_not_actionable:%', v_offer.status;
  END IF;

  IF v_offer."expiresAt" <= NOW() THEN
    UPDATE offers
    SET    status = 'expired'
    WHERE  id = p_offer_id;

    RAISE EXCEPTION 'offer_expired';
  END IF;

  v_target_status := 'declined';

  UPDATE offers
  SET    status = v_target_status
  WHERE  id = p_offer_id;

  v_system_msg := json_build_object(
    '_t',          'system',
    'event',       'offer_declined',
    'offerId',     v_offer.id,
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

  UPDATE conversations
  SET    "lastMessageAt" = NOW()
  WHERE  id = v_offer."conversationId";

  RETURN jsonb_build_object(
    'ok', TRUE,
    'offerId', v_offer.id,
    'status', v_target_status,
    'orderId', NULL,
    'alreadyDone', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION counter_offer(
  p_offer_id UUID,
  p_actor_id UUID,
  p_amount_pence INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer          offers%ROWTYPE;
  v_listing        products%ROWTYPE;
  v_conversation   conversations%ROWTYPE;
  v_counter_offer  offers%ROWTYPE;
  v_message        TEXT;
  v_other_party_id UUID;
BEGIN
  IF p_amount_pence IS NULL OR p_amount_pence <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_amount_pence > 9999900 THEN
    RAISE EXCEPTION 'amount_too_large';
  END IF;

  SELECT * INTO v_offer
  FROM   offers
  WHERE  id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  SELECT * INTO v_conversation
  FROM   conversations
  WHERE  id = v_offer."conversationId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation_not_found';
  END IF;

  IF p_actor_id <> v_conversation."user1Id" AND p_actor_id <> v_conversation."user2Id" THEN
    RAISE EXCEPTION 'not_participant';
  END IF;

  IF v_offer."recipientId" <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_offer.status = 'countered' THEN
    SELECT * INTO v_counter_offer
    FROM   offers
    WHERE  "parentOfferId" = v_offer.id
      AND  "proposedById" = p_actor_id
      AND  status = 'pending'
    ORDER BY "createdAt" DESC
    LIMIT  1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'offerId', v_counter_offer.id,
        'status', 'pending',
        'orderId', NULL,
        'alreadyDone', TRUE
      );
    END IF;
  END IF;

  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer_not_actionable:%', v_offer.status;
  END IF;

  IF v_offer."expiresAt" <= NOW() THEN
    UPDATE offers
    SET    status = 'expired'
    WHERE  id = p_offer_id;

    RAISE EXCEPTION 'offer_expired';
  END IF;

  SELECT * INTO v_listing
  FROM   products
  WHERE  id = v_offer."listingId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;

  IF v_listing."listingStatus" <> 'active' THEN
    RAISE EXCEPTION 'listing_not_available:%', v_listing."listingStatus";
  END IF;

  UPDATE offers
  SET    status = 'countered'
  WHERE  id = p_offer_id
    AND  status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_actionable';
  END IF;

  IF p_actor_id = v_offer."proposedById" THEN
    v_other_party_id := v_offer."recipientId";
  ELSE
    v_other_party_id := v_offer."proposedById";
  END IF;

  INSERT INTO offers (
    "conversationId",
    "listingId",
    "proposedById",
    "recipientId",
    "amountPence",
    "parentOfferId",
    status
  ) VALUES (
    v_offer."conversationId",
    v_offer."listingId",
    p_actor_id,
    v_other_party_id,
    p_amount_pence,
    v_offer.id,
    'pending'
  )
  RETURNING * INTO v_counter_offer;

  v_message := json_build_object(
    '_t', 'offer',
    'offerId', v_counter_offer.id,
    'amount_pence', p_amount_pence,
    'parentOfferId', v_offer.id
  )::TEXT;

  INSERT INTO messages (
    "conversationId", "senderId", "receiverId", message
  ) VALUES (
    v_offer."conversationId",
    p_actor_id,
    v_other_party_id,
    v_message
  );

  UPDATE conversations
  SET    "lastMessageAt" = NOW()
  WHERE  id = v_offer."conversationId";

  RETURN jsonb_build_object(
    'ok', TRUE,
    'offerId', v_counter_offer.id,
    'status', 'pending',
    'orderId', NULL,
    'alreadyDone', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION accept_offer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION decline_offer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION counter_offer(UUID, UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION accept_offer(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION decline_offer(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION counter_offer(UUID, UUID, INTEGER) TO service_role;
