-- 610_snapshot_order_commercial_identity.sql
--
-- Checkpoint A commercial-history integrity + fail-closed snapshot cutover.
--
-- Legacy rows are never reconstructed from today's mutable product/profile state.
-- New payment-backed commerce is allowed only when complete verified checkout
-- evidence is persisted and the resulting order/order-items materialise immutable
-- snapshots from that evidence.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "buyerNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "buyerEmailSnapshot" text,
  ADD COLUMN IF NOT EXISTS "buyerCompanyNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "buyerVatNumberSnapshot" text,
  ADD COLUMN IF NOT EXISTS "sellerBusinessNameSnapshot" text,
  ADD COLUMN IF NOT EXISTS "isB2BSnapshot" boolean,
  ADD COLUMN IF NOT EXISTS "reverseChargeSnapshot" boolean,
  ADD COLUMN IF NOT EXISTS "commercialSnapshotSource" text,
  ADD COLUMN IF NOT EXISTS "commercialSnapshotCapturedAt" timestamptz;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "productTitleSnapshot" text,
  ADD COLUMN IF NOT EXISTS "productImageSnapshot" text,
  ADD COLUMN IF NOT EXISTS "listingContextSnapshot" text,
  ADD COLUMN IF NOT EXISTS "productSnapshotSource" text,
  ADD COLUMN IF NOT EXISTS "productSnapshotCapturedAt" timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_commercial_snapshot_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_commercial_snapshot_source_check
      CHECK (
        "commercialSnapshotSource" IS NULL
        OR "commercialSnapshotSource" IN ('checkout_verified', 'payment_session_backfill')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_commercial_snapshot_coherence_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_commercial_snapshot_coherence_check
      CHECK (
        (
          "commercialSnapshotSource" IS NULL
          AND "commercialSnapshotCapturedAt" IS NULL
          AND "buyerNameSnapshot" IS NULL
          AND "buyerEmailSnapshot" IS NULL
          AND "buyerCompanyNameSnapshot" IS NULL
          AND "buyerVatNumberSnapshot" IS NULL
          AND "sellerBusinessNameSnapshot" IS NULL
          AND "isB2BSnapshot" IS NULL
          AND "reverseChargeSnapshot" IS NULL
        )
        OR (
          "commercialSnapshotSource" IS NOT NULL
          AND "commercialSnapshotCapturedAt" IS NOT NULL
          AND NULLIF(BTRIM("buyerNameSnapshot"), '') IS NOT NULL
          AND NULLIF(BTRIM("buyerEmailSnapshot"), '') IS NOT NULL
          AND NULLIF(BTRIM("sellerBusinessNameSnapshot"), '') IS NOT NULL
          AND "isB2BSnapshot" IS NOT NULL
          AND "reverseChargeSnapshot" IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_reverse_charge_snapshot_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_reverse_charge_snapshot_check
      CHECK (
        COALESCE("reverseChargeSnapshot", false) = false
        OR COALESCE("isB2BSnapshot", false) = true
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_snapshot_source_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_snapshot_source_check
      CHECK (
        "productSnapshotSource" IS NULL
        OR "productSnapshotSource" IN ('checkout_verified', 'payment_session_backfill')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_listing_context_snapshot_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_listing_context_snapshot_check
      CHECK (
        "listingContextSnapshot" IS NULL
        OR "listingContextSnapshot" IN ('product', 'service')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_product_snapshot_coherence_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_snapshot_coherence_check
      CHECK (
        (
          "productSnapshotSource" IS NULL
          AND "productSnapshotCapturedAt" IS NULL
          AND "productTitleSnapshot" IS NULL
          AND "productImageSnapshot" IS NULL
          AND "listingContextSnapshot" IS NULL
        )
        OR (
          "productSnapshotSource" IS NOT NULL
          AND "productSnapshotCapturedAt" IS NOT NULL
          AND NULLIF(BTRIM("productTitleSnapshot"), '') IS NOT NULL
          AND "listingContextSnapshot" IS NOT NULL
          AND "listingContextSnapshot" IN ('product', 'service')
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_order_commercial_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."commercialSnapshotSource" IS NOT NULL
       AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
    THEN
      RAISE EXCEPTION 'order commercial snapshot may only be captured by the canonical server boundary';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."commercialSnapshotSource" IS NULL
     AND NEW."commercialSnapshotSource" IS NOT NULL
     AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
  THEN
    RAISE EXCEPTION 'order commercial snapshot may only be captured by the canonical server boundary';
  END IF;

  IF OLD."commercialSnapshotSource" IS NOT NULL THEN
    IF NEW."buyerNameSnapshot" IS DISTINCT FROM OLD."buyerNameSnapshot"
       OR NEW."buyerEmailSnapshot" IS DISTINCT FROM OLD."buyerEmailSnapshot"
       OR NEW."buyerCompanyNameSnapshot" IS DISTINCT FROM OLD."buyerCompanyNameSnapshot"
       OR NEW."buyerVatNumberSnapshot" IS DISTINCT FROM OLD."buyerVatNumberSnapshot"
       OR NEW."sellerBusinessNameSnapshot" IS DISTINCT FROM OLD."sellerBusinessNameSnapshot"
       OR NEW."isB2BSnapshot" IS DISTINCT FROM OLD."isB2BSnapshot"
       OR NEW."reverseChargeSnapshot" IS DISTINCT FROM OLD."reverseChargeSnapshot"
       OR NEW."commercialSnapshotSource" IS DISTINCT FROM OLD."commercialSnapshotSource"
       OR NEW."commercialSnapshotCapturedAt" IS DISTINCT FROM OLD."commercialSnapshotCapturedAt"
    THEN
      RAISE EXCEPTION 'order commercial snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_order_commercial_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_order_commercial_snapshot ON public.orders;
CREATE TRIGGER trg_protect_order_commercial_snapshot
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.protect_order_commercial_snapshot();

CREATE OR REPLACE FUNCTION private.protect_order_item_product_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."productSnapshotSource" IS NOT NULL
       AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
    THEN
      RAISE EXCEPTION 'order item product snapshot may only be captured by the canonical server boundary';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."productSnapshotSource" IS NULL
     AND NEW."productSnapshotSource" IS NOT NULL
     AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
  THEN
    RAISE EXCEPTION 'order item product snapshot may only be captured by the canonical server boundary';
  END IF;

  IF OLD."productSnapshotSource" IS NOT NULL THEN
    IF NEW."productTitleSnapshot" IS DISTINCT FROM OLD."productTitleSnapshot"
       OR NEW."productImageSnapshot" IS DISTINCT FROM OLD."productImageSnapshot"
       OR NEW."listingContextSnapshot" IS DISTINCT FROM OLD."listingContextSnapshot"
       OR NEW."productSnapshotSource" IS DISTINCT FROM OLD."productSnapshotSource"
       OR NEW."productSnapshotCapturedAt" IS DISTINCT FROM OLD."productSnapshotCapturedAt"
    THEN
      RAISE EXCEPTION 'order item product snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_order_item_product_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_order_item_product_snapshot ON public.order_items;
CREATE TRIGGER trg_protect_order_item_product_snapshot
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION private.protect_order_item_product_snapshot();

CREATE OR REPLACE FUNCTION private.payment_session_has_commercial_snapshot_v1(p_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_buyer jsonb;
  v_seller jsonb;
  v_item jsonb;
  v_buyer_id text;
  v_seller_id text;
  v_is_b2b boolean;
  v_reverse_charge boolean;
BEGIN
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) IS DISTINCT FROM 'object' THEN
    RETURN false;
  END IF;

  IF p_metadata ->> 'commercialSnapshotVersion' IS DISTINCT FROM '1' THEN
    RETURN false;
  END IF;

  v_buyer := p_metadata -> 'buyerSnapshot';
  v_seller := p_metadata -> 'sellerSnapshot';

  IF jsonb_typeof(v_buyer) IS DISTINCT FROM 'object'
     OR NULLIF(BTRIM(v_buyer ->> 'id'), '') IS NULL
     OR NULLIF(BTRIM(v_buyer ->> 'name'), '') IS NULL
     OR NULLIF(BTRIM(v_buyer ->> 'email'), '') IS NULL
     OR jsonb_typeof(v_buyer -> 'isB2B') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(v_buyer -> 'reverseCharge') IS DISTINCT FROM 'boolean'
  THEN
    RETURN false;
  END IF;

  v_buyer_id := v_buyer ->> 'id';
  v_is_b2b := (v_buyer ->> 'isB2B')::boolean;
  v_reverse_charge := (v_buyer ->> 'reverseCharge')::boolean;

  IF v_buyer_id IS DISTINCT FROM p_metadata ->> 'buyerId'
     OR (v_reverse_charge AND NOT v_is_b2b)
     OR jsonb_typeof(p_metadata -> 'isB2B') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(p_metadata -> 'applyReverseCharge') IS DISTINCT FROM 'boolean'
     OR (p_metadata ->> 'isB2B')::boolean IS DISTINCT FROM v_is_b2b
     OR (p_metadata ->> 'applyReverseCharge')::boolean IS DISTINCT FROM v_reverse_charge
  THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(v_seller) IS DISTINCT FROM 'object'
     OR NULLIF(BTRIM(v_seller ->> 'id'), '') IS NULL
     OR NULLIF(BTRIM(v_seller ->> 'businessName'), '') IS NULL
  THEN
    RETURN false;
  END IF;
  v_seller_id := v_seller ->> 'id';

  IF jsonb_typeof(p_metadata -> 'items') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_metadata -> 'items') = 0
  THEN
    RETURN false;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_metadata -> 'items')
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR NULLIF(BTRIM(v_item ->> 'productId'), '') IS NULL
       OR NULLIF(BTRIM(v_item ->> 'sellerId'), '') IS NULL
       OR NULLIF(BTRIM(v_item ->> 'title'), '') IS NULL
       OR (v_item ->> 'sellerId') IS DISTINCT FROM v_seller_id
       OR COALESCE(v_item ->> 'listingContext', '') NOT IN ('product', 'service')
       OR NOT (v_item ? 'image')
       OR jsonb_typeof(v_item -> 'image') NOT IN ('string', 'null')
       OR jsonb_typeof(v_item -> 'quantity') IS DISTINCT FROM 'number'
       OR jsonb_typeof(v_item -> 'price') IS DISTINCT FROM 'number'
    THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION private.payment_session_has_commercial_snapshot_v1(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enforce_payment_session_commercial_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF private.payment_session_has_commercial_snapshot_v1(NEW.metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'payment session rejected: complete commercial snapshot evidence v1 is required after cutover';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_payment_session_commercial_snapshot_v1()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_require_payment_session_commercial_snapshot_v1
  ON public.payment_sessions;
CREATE TRIGGER trg_require_payment_session_commercial_snapshot_v1
BEFORE INSERT ON public.payment_sessions
FOR EACH ROW
EXECUTE FUNCTION private.enforce_payment_session_commercial_snapshot_v1();

CREATE OR REPLACE FUNCTION private.require_paid_order_commercial_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW."stripePaymentIntentId" IS NOT NULL THEN
    IF NEW."commercialSnapshotSource" IS DISTINCT FROM 'checkout_verified'
       OR NEW."commercialSnapshotCapturedAt" IS NULL
       OR NULLIF(BTRIM(NEW."buyerNameSnapshot"), '') IS NULL
       OR NULLIF(BTRIM(NEW."buyerEmailSnapshot"), '') IS NULL
       OR NULLIF(BTRIM(NEW."sellerBusinessNameSnapshot"), '') IS NULL
       OR NEW."isB2BSnapshot" IS NULL
       OR NEW."reverseChargeSnapshot" IS NULL
       OR (NEW."reverseChargeSnapshot" AND NOT NEW."isB2BSnapshot")
    THEN
      RAISE EXCEPTION 'paid order rejected: immutable commercial snapshot is required after cutover';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.require_paid_order_commercial_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_require_paid_order_commercial_snapshot ON public.orders;
CREATE TRIGGER trg_require_paid_order_commercial_snapshot
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.require_paid_order_commercial_snapshot();

CREATE OR REPLACE FUNCTION private.require_paid_order_item_product_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payment_intent text;
BEGIN
  SELECT o."stripePaymentIntentId"
    INTO v_payment_intent
    FROM public.orders o
   WHERE o.id = NEW."orderId";

  IF v_payment_intent IS NOT NULL THEN
    IF NEW."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'
       OR NEW."productSnapshotCapturedAt" IS NULL
       OR NULLIF(BTRIM(NEW."productTitleSnapshot"), '') IS NULL
       OR NEW."listingContextSnapshot" IS NULL
       OR NEW."listingContextSnapshot" NOT IN ('product', 'service')
    THEN
      RAISE EXCEPTION 'paid order item rejected: immutable product snapshot is required after cutover';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.require_paid_order_item_product_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_require_paid_order_item_product_snapshot
  ON public.order_items;
CREATE TRIGGER trg_require_paid_order_item_product_snapshot
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION private.require_paid_order_item_product_snapshot();

CREATE OR REPLACE FUNCTION public.server_materialize_paid_order_v1(
  p_payment_session_id uuid,
  p_payment_intent_id text,
  p_commission_rate numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE;
  v_metadata jsonb;
  v_buyer jsonb;
  v_seller jsonb;
  v_item jsonb;
  v_order public.orders%ROWTYPE;
  v_order_id uuid;
  v_buyer_id uuid;
  v_seller_id uuid;
  v_primary_product_id uuid;
  v_reservation_token uuid;
  v_item_product_id uuid;
  v_item_seller_id uuid;
  v_item_quantity integer;
  v_item_price numeric;
  v_item_image text;
  v_item_context text;
  v_item_count integer;
  v_distinct_product_count integer;
  v_total_quantity integer;
  v_persisted_item_count integer;
  v_finalized_item_count integer;
  v_total_pence bigint;
  v_shipping_pence bigint;
  v_product_paid numeric;
  v_subtotal numeric;
  v_vat numeric;
  v_shipping numeric;
  v_total numeric;
  v_commission numeric;
  v_reverse_charge boolean;
  v_is_b2b boolean;
  v_first_paid_transition boolean := false;
  v_existing_item public.order_items%ROWTYPE;
BEGIN
  IF p_payment_session_id IS NULL OR NULLIF(BTRIM(p_payment_intent_id), '') IS NULL THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session and PaymentIntent are required'
      USING ERRCODE = '22023';
  END IF;
  IF p_commission_rate IS NULL OR p_commission_rate < 0 OR p_commission_rate > 1 THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid commission rate'
      USING ERRCODE = '22023';
  END IF;

  SELECT ps.*
    INTO v_session
    FROM public.payment_sessions ps
   WHERE ps.id = p_payment_session_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_session.status NOT IN ('pending', 'completed') THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session status % is not processable', v_session.status
      USING ERRCODE = 'P0001';
  END IF;

  v_metadata := v_session.metadata;
  IF private.payment_session_has_commercial_snapshot_v1(v_metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: complete commercial snapshot evidence v1 is required'
      USING ERRCODE = '22023';
  END IF;

  IF lower(COALESCE(v_session.currency, '')) <> 'gbp' THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session currency must be GBP'
      USING ERRCODE = '22023';
  END IF;

  v_buyer := v_metadata -> 'buyerSnapshot';
  v_seller := v_metadata -> 'sellerSnapshot';
  v_buyer_id := (v_buyer ->> 'id')::uuid;
  v_seller_id := (v_seller ->> 'id')::uuid;
  v_is_b2b := (v_buyer ->> 'isB2B')::boolean;
  v_reverse_charge := (v_buyer ->> 'reverseCharge')::boolean;

  IF v_session."userId" IS DISTINCT FROM v_buyer_id THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session user does not match buyer evidence'
      USING ERRCODE = '22023';
  END IF;

  IF v_session."stripePaymentIntent" IS NOT NULL
     AND v_session."stripePaymentIntent" IS DISTINCT FROM p_payment_intent_id
  THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: PaymentIntent conflicts with persisted session evidence'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata -> 'totalPence') IS DISTINCT FROM 'number'
     OR jsonb_typeof(v_metadata -> 'shippingAmountPence') IS DISTINCT FROM 'number'
  THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: integer pence totals are required'
      USING ERRCODE = '22023';
  END IF;

  v_total_pence := (v_metadata ->> 'totalPence')::bigint;
  v_shipping_pence := (v_metadata ->> 'shippingAmountPence')::bigint;
  IF v_total_pence < 0 OR v_shipping_pence < 0 OR v_shipping_pence > v_total_pence THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid monetary totals'
      USING ERRCODE = '22023';
  END IF;
  IF round(v_session.amount * 100)::bigint IS DISTINCT FROM v_total_pence THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session amount conflicts with metadata total'
      USING ERRCODE = '22023';
  END IF;

  v_product_paid := (v_total_pence - v_shipping_pence)::numeric / 100;
  v_subtotal := CASE
    WHEN v_reverse_charge THEN round(v_product_paid, 2)
    ELSE round(v_product_paid / 1.20, 2)
  END;
  v_vat := CASE
    WHEN v_reverse_charge THEN 0
    ELSE round(v_product_paid - v_subtotal, 2)
  END;
  v_shipping := v_shipping_pence::numeric / 100;
  v_total := v_total_pence::numeric / 100;
  v_commission := round(v_subtotal * p_commission_rate, 2);

  SELECT
    count(*)::integer,
    count(DISTINCT value ->> 'productId')::integer,
    COALESCE(sum((value ->> 'quantity')::numeric), 0)::integer
  INTO v_item_count, v_distinct_product_count, v_total_quantity
  FROM jsonb_array_elements(v_metadata -> 'items');

  IF v_item_count <= 0 OR v_distinct_product_count <> v_item_count THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: duplicate or missing product lines'
      USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_metadata -> 'items')
  LOOP
    IF (v_item ->> 'quantity')::numeric <= 0
       OR (v_item ->> 'quantity')::numeric <> trunc((v_item ->> 'quantity')::numeric)
       OR (v_item ->> 'price')::numeric <= 0
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid item quantity/price'
        USING ERRCODE = '22023';
    END IF;
    IF (v_item ->> 'sellerId')::uuid IS DISTINCT FROM v_seller_id THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: multi-seller or conflicting seller evidence'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_primary_product_id := ((v_metadata -> 'items' -> 0) ->> 'productId')::uuid;
  v_reservation_token := NULLIF(v_metadata ->> 'reservationToken', '')::uuid;

  SELECT o.*
    INTO v_order
    FROM public.orders o
   WHERE o."stripePaymentIntentId" = p_payment_intent_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_order."buyerId" IS DISTINCT FROM v_buyer_id
       OR v_order."sellerId" IS DISTINCT FROM v_seller_id
       OR v_order.total IS DISTINCT FROM v_total
       OR v_order."commercialSnapshotSource" IS DISTINCT FROM 'checkout_verified'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: existing order conflicts with payment evidence'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_order.status NOT IN ('awaiting_payment', 'paid') THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: existing order status % is not processable', v_order.status
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    INSERT INTO public.orders (
      "buyerId",
      "sellerId",
      "productId",
      quantity,
      subtotal,
      "vatAmount",
      "shippingAmount",
      total,
      commission,
      status,
      "escrowStatus",
      "shippingAddress",
      "billingAddress",
      "shippingMethod",
      "isB2B",
      "stripePaymentIntentId",
      "buyerNameSnapshot",
      "buyerEmailSnapshot",
      "buyerCompanyNameSnapshot",
      "buyerVatNumberSnapshot",
      "sellerBusinessNameSnapshot",
      "isB2BSnapshot",
      "reverseChargeSnapshot",
      "commercialSnapshotSource",
      "commercialSnapshotCapturedAt"
    ) VALUES (
      v_buyer_id,
      v_seller_id,
      v_primary_product_id,
      v_total_quantity,
      v_subtotal,
      v_vat,
      v_shipping,
      v_total,
      v_commission,
      'awaiting_payment',
      'held',
      CASE WHEN jsonb_typeof(v_metadata -> 'shippingAddress') = 'object' THEN v_metadata -> 'shippingAddress' ELSE '{}'::jsonb END,
      CASE WHEN jsonb_typeof(v_metadata -> 'billingAddress') = 'object' THEN v_metadata -> 'billingAddress' ELSE '{}'::jsonb END,
      COALESCE(NULLIF(BTRIM(v_metadata ->> 'shippingMethod'), ''), 'Standard'),
      v_is_b2b,
      p_payment_intent_id,
      v_buyer ->> 'name',
      v_buyer ->> 'email',
      NULLIF(BTRIM(v_buyer ->> 'companyName'), ''),
      NULLIF(BTRIM(v_buyer ->> 'vatNumber'), ''),
      v_seller ->> 'businessName',
      v_is_b2b,
      v_reverse_charge,
      'checkout_verified',
      v_session."createdAt"
    )
    RETURNING * INTO v_order;
  END IF;

  v_order_id := v_order.id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_metadata -> 'items')
  LOOP
    v_item_product_id := (v_item ->> 'productId')::uuid;
    v_item_seller_id := (v_item ->> 'sellerId')::uuid;
    v_item_quantity := (v_item ->> 'quantity')::integer;
    v_item_price := (v_item ->> 'price')::numeric;
    v_item_context := v_item ->> 'listingContext';
    v_item_image := CASE
      WHEN jsonb_typeof(v_item -> 'image') = 'null' THEN NULL
      ELSE v_item ->> 'image'
    END;

    IF v_item_seller_id IS DISTINCT FROM v_seller_id THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: item seller mismatch'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.order_items (
      "orderId",
      "productId",
      quantity,
      "pricePerUnit",
      "vatRate",
      subtotal,
      "productTitleSnapshot",
      "productImageSnapshot",
      "listingContextSnapshot",
      "productSnapshotSource",
      "productSnapshotCapturedAt"
    ) VALUES (
      v_order_id,
      v_item_product_id,
      v_item_quantity,
      v_item_price,
      0.20,
      round((v_item_price / 1.20) * v_item_quantity, 2),
      v_item ->> 'title',
      v_item_image,
      v_item_context,
      'checkout_verified',
      v_session."createdAt"
    )
    ON CONFLICT ("orderId", "productId") DO NOTHING;

    SELECT oi.*
      INTO v_existing_item
      FROM public.order_items oi
     WHERE oi."orderId" = v_order_id
       AND oi."productId" = v_item_product_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_existing_item.quantity IS DISTINCT FROM v_item_quantity
       OR v_existing_item."pricePerUnit" IS DISTINCT FROM v_item_price
       OR v_existing_item."productTitleSnapshot" IS DISTINCT FROM (v_item ->> 'title')
       OR v_existing_item."productImageSnapshot" IS DISTINCT FROM v_item_image
       OR v_existing_item."listingContextSnapshot" IS DISTINCT FROM v_item_context
       OR v_existing_item."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: persisted order item conflicts with payment evidence'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM public.finalize_paid_order_item(
      v_order_id,
      v_item_product_id,
      v_reservation_token
    );
  END LOOP;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE "stockFinalizedAt" IS NOT NULL)::integer
  INTO v_persisted_item_count, v_finalized_item_count
  FROM public.order_items
  WHERE "orderId" = v_order_id;

  IF v_persisted_item_count <> v_item_count OR v_finalized_item_count <> v_item_count THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: complete finalized item set was not materialized'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status = 'awaiting_payment' THEN
    UPDATE public.orders
       SET status = 'paid',
           "updatedAt" = now()
     WHERE id = v_order_id
       AND status = 'awaiting_payment'
    RETURNING * INTO v_order;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: paid transition lost its expected state'
        USING ERRCODE = '40001';
    END IF;
    v_first_paid_transition := true;
  ELSE
    v_first_paid_transition := false;
  END IF;

  UPDATE public.payment_sessions
     SET "orderId" = v_order_id,
         "stripePaymentIntent" = p_payment_intent_id,
         amount = v_total,
         status = 'completed',
         "updatedAt" = now()
   WHERE id = p_payment_session_id;

  RETURN jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order."orderNumber",
    'sellerId', v_seller_id,
    'sellerTotal', v_total,
    'firstPaidTransition', v_first_paid_transition
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_materialize_paid_order_v1(uuid, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_materialize_paid_order_v1(uuid, text, numeric)
  TO service_role;

COMMENT ON FUNCTION public.server_materialize_paid_order_v1(uuid, text, numeric) IS
  'Service-role-only atomic post-payment materialization: locks verified payment evidence and commits order snapshot, complete item snapshots, stock finalization, paid transition and payment-session completion together; retry is idempotent.';

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.orders, public.order_items
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.orders."buyerNameSnapshot" IS
  'Immutable checkout-time buyer display-name snapshot; NULL on legacy rows without authoritative evidence.';
COMMENT ON COLUMN public.orders."buyerEmailSnapshot" IS
  'Immutable checkout-time buyer email snapshot; NULL on legacy rows without authoritative evidence.';
COMMENT ON COLUMN public.orders."buyerCompanyNameSnapshot" IS
  'Immutable checkout-time buyer company snapshot when applicable.';
COMMENT ON COLUMN public.orders."buyerVatNumberSnapshot" IS
  'Immutable checkout-time buyer VAT snapshot when applicable.';
COMMENT ON COLUMN public.orders."sellerBusinessNameSnapshot" IS
  'Immutable checkout-time seller business identity snapshot.';
COMMENT ON COLUMN public.orders."isB2BSnapshot" IS
  'Immutable checkout-time B2B classification.';
COMMENT ON COLUMN public.orders."reverseChargeSnapshot" IS
  'Immutable checkout-time reverse-charge decision.';
COMMENT ON COLUMN public.orders."commercialSnapshotSource" IS
  'Evidence source for immutable order commercial identity. Legacy unknowns stay NULL.';
COMMENT ON COLUMN public.orders."commercialSnapshotCapturedAt" IS
  'Timestamp of authoritative commercial snapshot capture.';
COMMENT ON COLUMN public.order_items."productTitleSnapshot" IS
  'Immutable verified checkout-time product title.';
COMMENT ON COLUMN public.order_items."productImageSnapshot" IS
  'Immutable verified checkout-time primary product image/path; may be NULL when no image existed.';
COMMENT ON COLUMN public.order_items."listingContextSnapshot" IS
  'Immutable checkout-time product/service context.';
COMMENT ON COLUMN public.order_items."productSnapshotSource" IS
  'Evidence source for immutable product identity/context. Legacy unknowns stay NULL.';
COMMENT ON COLUMN public.order_items."productSnapshotCapturedAt" IS
  'Timestamp of authoritative product snapshot capture.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.payment_sessions'::regclass
      AND tgname = 'trg_require_payment_session_commercial_snapshot_v1'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'payment session commercial snapshot cutover trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.orders'::regclass
      AND tgname = 'trg_require_paid_order_commercial_snapshot'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'paid order commercial snapshot cutover trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.order_items'::regclass
      AND tgname = 'trg_require_paid_order_item_product_snapshot'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'paid order item product snapshot cutover trigger is missing';
  END IF;

  IF to_regprocedure('public.server_materialize_paid_order_v1(uuid,text,numeric)') IS NULL THEN
    RAISE EXCEPTION 'atomic paid-order materialization RPC is missing';
  END IF;
END;
$$;;
