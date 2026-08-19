-- 607_lock_shipment_writes_to_server.sql
--
-- Canonical shipment contract:
--   * buyers/sellers/admin clients may read shipment state only through RLS;
--   * shipment creation, mutation, POD confirmation and lifecycle transitions are
--     server-managed through authenticated Netlify functions using service_role;
--   * direct client writes must not bypass order ownership, payment-backed guards,
--     rate limits, notifications or append-safe shipment events;
--   * one customer order has at most one canonical shipment record in this model;
--   * shipment/order status changes and their audit event are committed atomically;
--   * proof-of-delivery evidence is immutable once attached by this canonical path.

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

-- The application has always treated order_id as singular (.single()). Enforce
-- that assumption in the database so concurrent requests cannot create two
-- shipment truths for one customer order.
CREATE UNIQUE INDEX IF NOT EXISTS shipments_one_per_order
  ON public.shipments (order_id);

COMMENT ON INDEX public.shipments_one_per_order IS
  'Canonical shipment invariant: one shipment row per customer order.';

-- ---------------------------------------------------------------------------
-- Atomic server mutation: create/update shipment details + append audit event.
-- Auth/payment/rate-limit checks remain at the Netlify boundary; this function
-- independently rechecks actor ownership and derives seller/buyer from orders.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.server_upsert_shipment(
  p_order_id uuid,
  p_actor_id uuid,
  p_courier_name text,
  p_set_courier_name boolean,
  p_tracking_number text,
  p_set_tracking_number boolean,
  p_dispatched_at timestamptz,
  p_set_dispatched_at boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor_role text;
  v_order_seller uuid;
  v_order_buyer uuid;
  v_order_status text;
  v_shipment public.shipments%ROWTYPE;
  v_created boolean := false;
  v_event_message text;
BEGIN
  SELECT u.role
    INTO v_actor_role
    FROM public.users u
   WHERE u.id = p_actor_id;

  SELECT o."sellerId", o."buyerId", o.status
    INTO v_order_seller, v_order_buyer, v_order_status
    FROM public.orders o
   WHERE o.id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_upsert_shipment: order not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role IS DISTINCT FROM 'admin'
     AND v_order_seller IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'server_upsert_shipment: actor is not authorized for this order'
      USING ERRCODE = '42501';
  END IF;

  IF v_order_status = ANY (ARRAY['cancelled', 'refunded', 'disputed', 'completed']) THEN
    RAISE EXCEPTION 'server_upsert_shipment: terminal order cannot be mutated'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT s.*
    INTO v_shipment
    FROM public.shipments s
   WHERE s.order_id = p_order_id
   FOR UPDATE;

  IF FOUND THEN
    UPDATE public.shipments s
       SET courier_name = CASE
             WHEN p_set_courier_name THEN p_courier_name
             ELSE s.courier_name
           END,
           tracking_number = CASE
             WHEN p_set_tracking_number THEN p_tracking_number
             ELSE s.tracking_number
           END,
           dispatched_at = CASE
             WHEN p_set_dispatched_at THEN p_dispatched_at
             ELSE s.dispatched_at
           END,
           updated_at = now()
     WHERE s.id = v_shipment.id
     RETURNING s.* INTO v_shipment;

    v_event_message := 'Shipment details updated';
  ELSE
    INSERT INTO public.shipments (
      order_id,
      seller_id,
      buyer_id,
      courier_name,
      tracking_number,
      dispatched_at,
      status
    ) VALUES (
      p_order_id,
      v_order_seller,
      v_order_buyer,
      CASE WHEN p_set_courier_name THEN p_courier_name ELSE NULL END,
      CASE WHEN p_set_tracking_number THEN p_tracking_number ELSE NULL END,
      CASE WHEN p_set_dispatched_at THEN p_dispatched_at ELSE NULL END,
      CASE
        WHEN p_set_dispatched_at AND p_dispatched_at IS NOT NULL THEN 'Dispatched'
        ELSE 'Pending'
      END
    )
    RETURNING * INTO v_shipment;

    v_created := true;
    v_event_message := CASE
      WHEN v_shipment.status = 'Dispatched' THEN 'Shipment created and dispatched'
      ELSE 'Shipment created'
    END;
  END IF;

  INSERT INTO public.shipment_events (
    shipment_id,
    status,
    message,
    changed_by,
    source
  ) VALUES (
    v_shipment.id,
    v_shipment.status,
    v_event_message,
    p_actor_id,
    'system'
  );

  RETURN jsonb_build_object(
    'shipment', to_jsonb(v_shipment),
    'created', v_created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_upsert_shipment(
  uuid, uuid, text, boolean, text, boolean, timestamptz, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_upsert_shipment(
  uuid, uuid, text, boolean, text, boolean, timestamptz, boolean
) TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic server mutation: shipment status + audit event + mapped order status.
-- External side effects (notifications/email) happen only after this transaction
-- succeeds, so they cannot make partial database state look successful.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.server_transition_shipment(
  p_shipment_id uuid,
  p_actor_id uuid,
  p_status text,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor_role text;
  v_order_id uuid;
  v_order_status text;
  v_shipment public.shipments%ROWTYPE;
BEGIN
  IF p_status IS NULL OR NOT (
    p_status = ANY (ARRAY[
      'Pending',
      'Processing',
      'Dispatched',
      'In Transit',
      'Out for Delivery',
      'Delivered',
      'Returned',
      'Delivery Failed'
    ])
  ) THEN
    RAISE EXCEPTION 'server_transition_shipment: invalid shipment status'
      USING ERRCODE = '22023';
  END IF;

  SELECT s.order_id
    INTO v_order_id
    FROM public.shipments s
   WHERE s.id = p_shipment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_transition_shipment: shipment not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Lock the order first so every canonical shipment mutation uses the same
  -- lock order and concurrent create/update/transition requests serialize.
  SELECT o.status
    INTO v_order_status
    FROM public.orders o
   WHERE o.id = v_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_transition_shipment: order not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT s.*
    INTO v_shipment
    FROM public.shipments s
   WHERE s.id = p_shipment_id
     AND s.order_id = v_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_transition_shipment: shipment changed during transition'
      USING ERRCODE = '40001';
  END IF;

  SELECT u.role
    INTO v_actor_role
    FROM public.users u
   WHERE u.id = p_actor_id;

  IF v_actor_role IS DISTINCT FROM 'admin'
     AND v_shipment.seller_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'server_transition_shipment: actor is not authorized'
      USING ERRCODE = '42501';
  END IF;

  -- Protect terminal customer-order truth from fulfilment regression. Returned
  -- remains available after delivered/refunded because return/recovery is tracked
  -- separately from the original successful delivery event.
  IF v_order_status = ANY (ARRAY['cancelled', 'disputed', 'completed']) THEN
    RAISE EXCEPTION 'server_transition_shipment: terminal order cannot be mutated'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order_status = 'refunded' AND p_status <> 'Returned' THEN
    RAISE EXCEPTION 'server_transition_shipment: refunded order may only move shipment to Returned'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order_status = 'delivered' AND p_status <> ALL (ARRAY['Delivered', 'Returned']) THEN
    RAISE EXCEPTION 'server_transition_shipment: delivered order cannot regress to a pre-delivery shipment state'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.shipments s
     SET status = p_status,
         updated_at = now()
   WHERE s.id = p_shipment_id
   RETURNING s.* INTO v_shipment;

  INSERT INTO public.shipment_events (
    shipment_id,
    status,
    message,
    changed_by,
    source
  ) VALUES (
    p_shipment_id,
    p_status,
    COALESCE(NULLIF(BTRIM(p_message), ''), 'Status updated to ' || p_status),
    p_actor_id,
    'system'
  );

  IF p_status = 'Delivered' THEN
    UPDATE public.orders o
       SET status = 'delivered',
           "deliveredAt" = COALESCE(o."deliveredAt", now()),
           "updatedAt" = now()
     WHERE o.id = v_order_id;
  ELSIF p_status = ANY (ARRAY['Dispatched', 'In Transit']) THEN
    UPDATE public.orders o
       SET status = 'shipped',
           "updatedAt" = now()
     WHERE o.id = v_order_id;
  END IF;

  RETURN jsonb_build_object('shipment', to_jsonb(v_shipment));
END;
$$;

REVOKE ALL ON FUNCTION public.server_transition_shipment(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_transition_shipment(uuid, uuid, text, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Atomic server mutation: immutable POD pointer + append-only audit event.
-- Storage-object validation happens in Netlify before this RPC is invoked.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.server_attach_shipment_proof(
  p_shipment_id uuid,
  p_actor_id uuid,
  p_file_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor_role text;
  v_shipment public.shipments%ROWTYPE;
BEGIN
  IF p_file_path IS NULL OR BTRIM(p_file_path) = '' THEN
    RAISE EXCEPTION 'server_attach_shipment_proof: file path is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT s.*
    INTO v_shipment
    FROM public.shipments s
   WHERE s.id = p_shipment_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_attach_shipment_proof: shipment not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT u.role
    INTO v_actor_role
    FROM public.users u
   WHERE u.id = p_actor_id;

  IF v_actor_role IS DISTINCT FROM 'admin'
     AND v_shipment.seller_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'server_attach_shipment_proof: actor is not authorized'
      USING ERRCODE = '42501';
  END IF;

  IF v_shipment.proof_of_delivery_url IS NOT NULL THEN
    RAISE EXCEPTION 'server_attach_shipment_proof: proof of delivery is already attached and cannot be overwritten'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.shipments s
     SET proof_of_delivery_url = p_file_path,
         updated_at = now()
   WHERE s.id = p_shipment_id
   RETURNING s.* INTO v_shipment;

  INSERT INTO public.shipment_events (
    shipment_id,
    status,
    message,
    changed_by,
    source
  ) VALUES (
    p_shipment_id,
    v_shipment.status,
    'Proof of delivery uploaded',
    p_actor_id,
    'system'
  );

  RETURN jsonb_build_object('shipment', to_jsonb(v_shipment));
END;
$$;

REVOKE ALL ON FUNCTION public.server_attach_shipment_proof(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_attach_shipment_proof(uuid, uuid, text)
  TO service_role;

-- Remove all client shipment mutation policies.
DROP POLICY IF EXISTS "shipments_insert" ON public.shipments;
DROP POLICY IF EXISTS "shipments_update" ON public.shipments;
DROP POLICY IF EXISTS "shipments_delete" ON public.shipments;
DROP POLICY IF EXISTS "Sellers can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Sellers can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Sellers can delete shipments" ON public.shipments;

-- Preserve participant/admin SELECT while removing every underlying write-like
-- privilege that should never belong to browser/mobile roles.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.shipments FROM anon, authenticated;
GRANT SELECT ON TABLE public.shipments TO authenticated;
REVOKE SELECT ON TABLE public.shipments FROM anon;

-- Shipment events are append-only server history. Client roles already have no
-- INSERT/UPDATE/DELETE policy; also revoke TRUNCATE/TRIGGER/REFERENCES so RLS
-- cannot be bypassed by a non-row operation.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.shipment_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.shipment_events TO authenticated;
REVOKE SELECT ON TABLE public.shipment_events FROM anon;

-- Canonical server handlers operate with service_role and retain required access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipment_events TO service_role;

COMMENT ON TABLE public.shipments IS
  'Shipment records. Client roles are read-only under participant/admin RLS; canonical writes use service-role-only atomic shipment RPCs.';
COMMENT ON TABLE public.shipment_events IS
  'Append-only shipment lifecycle history. Client roles may read participant-visible rows; writes are canonical server operations only.';

COMMENT ON FUNCTION public.server_upsert_shipment(
  uuid, uuid, text, boolean, text, boolean, timestamptz, boolean
) IS
  'Service-role-only atomic create/update of one shipment per order plus audit event; seller/buyer ownership is derived from the order.';
COMMENT ON FUNCTION public.server_transition_shipment(uuid, uuid, text, text) IS
  'Service-role-only atomic shipment status transition, audit event and mapped order status update.';
COMMENT ON FUNCTION public.server_attach_shipment_proof(uuid, uuid, text) IS
  'Service-role-only immutable proof-of-delivery attachment plus audit event.';
