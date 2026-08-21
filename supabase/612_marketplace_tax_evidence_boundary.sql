-- 612_marketplace_tax_evidence_boundary.sql
--
-- P1 tax/payment evidence repair.
--
-- Scope is intentionally narrow and fail-closed. This does NOT implement the
-- future Supplier Commerce tax engine. It removes the unsafe blanket 20% VAT /
-- buyer-VAT reverse-charge assumption from the currently supported marketplace
-- checkout path and requires versioned tax evidence before payment can proceed.
--
-- Supported P1 transaction class:
--   * GB-established marketplace seller
--   * seller explicitly declares they are NOT VAT registered
--   * physical product carrying versioned non-VAT evidence
--   * GB delivery/billing destination
--
-- Everything else remains blocked until Gate B authorises the broader tax model.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "taxTreatmentStatus" text,
  ADD COLUMN IF NOT EXISTS "taxTreatmentSource" text,
  ADD COLUMN IF NOT EXISTS "taxEvidenceVersion" integer,
  ADD COLUMN IF NOT EXISTS "taxEvidenceCapturedAt" timestamptz;

-- The historical default of 20% is unsafe for newly-created evidence. Preserve
-- legacy row values but stop creating a tax conclusion by column default.
ALTER TABLE public.products
  ALTER COLUMN "vatRate" DROP DEFAULT,
  ALTER COLUMN "vatRate" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_tax_evidence_coherence_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_tax_evidence_coherence_check
      CHECK (
        (
          "taxTreatmentStatus" IS NULL
          AND "taxTreatmentSource" IS NULL
          AND "taxEvidenceVersion" IS NULL
          AND "taxEvidenceCapturedAt" IS NULL
        )
        OR (
          "taxTreatmentStatus" = 'seller_non_vat_declared'
          AND "taxTreatmentSource" = 'seller_profile_non_vat_declaration_v1'
          AND "taxEvidenceVersion" = 1
          AND "taxEvidenceCapturedAt" IS NOT NULL
          AND "vatRate" = 0
          AND "priceExVat" IS NOT NULL
          AND round("priceExVat"::numeric, 2) = round(price::numeric, 2)
        )
      );
  END IF;
END;
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "taxDecisionSnapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "taxDecisionSource" text,
  ADD COLUMN IF NOT EXISTS "taxDecisionCapturedAt" timestamptz;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "taxTreatmentSnapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "taxTreatmentSource" text,
  ADD COLUMN IF NOT EXISTS "taxTreatmentCapturedAt" timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_tax_decision_snapshot_coherence_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_tax_decision_snapshot_coherence_check
      CHECK (
        (
          "taxDecisionSnapshot" IS NULL
          AND "taxDecisionSource" IS NULL
          AND "taxDecisionCapturedAt" IS NULL
        )
        OR (
          jsonb_typeof("taxDecisionSnapshot") = 'object'
          AND "taxDecisionSource" = 'checkout_verified_tax_v1'
          AND "taxDecisionCapturedAt" IS NOT NULL
          AND "taxDecisionSnapshot" ->> 'version' = '1'
          AND "taxDecisionSnapshot" ->> 'jurisdiction' = 'GB'
          AND "taxDecisionSnapshot" ->> 'destinationCountry' = 'GB'
          AND "taxDecisionSnapshot" ->> 'treatment' = 'seller_non_vat_declared'
          AND "taxDecisionSnapshot" ->> 'sellerVatRegistered' = 'false'
          AND "taxDecisionSnapshot" ->> 'reverseCharge' = 'false'
          AND "taxDecisionSnapshot" ->> 'vatAmountPence' = '0'
          AND "taxDecisionSnapshot" ->> 'evidenceVersion' = '1'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_tax_treatment_snapshot_coherence_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_tax_treatment_snapshot_coherence_check
      CHECK (
        (
          "taxTreatmentSnapshot" IS NULL
          AND "taxTreatmentSource" IS NULL
          AND "taxTreatmentCapturedAt" IS NULL
        )
        OR (
          jsonb_typeof("taxTreatmentSnapshot") = 'object'
          AND "taxTreatmentSource" = 'checkout_verified_tax_v1'
          AND "taxTreatmentCapturedAt" IS NOT NULL
          AND "taxTreatmentSnapshot" ->> 'treatment' = 'seller_non_vat_declared'
          AND "taxTreatmentSnapshot" ->> 'evidenceVersion' = '1'
          AND "taxTreatmentSnapshot" ->> 'vatRate' = '0'
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_order_tax_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."taxDecisionSource" IS NOT NULL
       AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
    THEN
      RAISE EXCEPTION 'order tax snapshot may only be captured by the canonical server boundary';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."taxDecisionSource" IS NULL
     AND NEW."taxDecisionSource" IS NOT NULL
     AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
  THEN
    RAISE EXCEPTION 'order tax snapshot may only be captured by the canonical server boundary';
  END IF;

  IF OLD."taxDecisionSource" IS NOT NULL THEN
    IF NEW."taxDecisionSnapshot" IS DISTINCT FROM OLD."taxDecisionSnapshot"
       OR NEW."taxDecisionSource" IS DISTINCT FROM OLD."taxDecisionSource"
       OR NEW."taxDecisionCapturedAt" IS DISTINCT FROM OLD."taxDecisionCapturedAt"
    THEN
      RAISE EXCEPTION 'order tax snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_order_tax_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_order_tax_snapshot ON public.orders;
CREATE TRIGGER trg_protect_order_tax_snapshot
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.protect_order_tax_snapshot();

CREATE OR REPLACE FUNCTION private.protect_order_item_tax_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."taxTreatmentSource" IS NOT NULL
       AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
    THEN
      RAISE EXCEPTION 'order item tax snapshot may only be captured by the canonical server boundary';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."taxTreatmentSource" IS NULL
     AND NEW."taxTreatmentSource" IS NOT NULL
     AND COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated')
  THEN
    RAISE EXCEPTION 'order item tax snapshot may only be captured by the canonical server boundary';
  END IF;

  IF OLD."taxTreatmentSource" IS NOT NULL THEN
    IF NEW."taxTreatmentSnapshot" IS DISTINCT FROM OLD."taxTreatmentSnapshot"
       OR NEW."taxTreatmentSource" IS DISTINCT FROM OLD."taxTreatmentSource"
       OR NEW."taxTreatmentCapturedAt" IS DISTINCT FROM OLD."taxTreatmentCapturedAt"
    THEN
      RAISE EXCEPTION 'order item tax snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_order_item_tax_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_order_item_tax_snapshot ON public.order_items;
CREATE TRIGGER trg_protect_order_item_tax_snapshot
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION private.protect_order_item_tax_snapshot();

CREATE OR REPLACE FUNCTION private.payment_session_has_marketplace_tax_snapshot_v1(p_metadata jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_tax jsonb;
  v_item jsonb;
BEGIN
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) IS DISTINCT FROM 'object' THEN
    RETURN false;
  END IF;

  v_tax := p_metadata -> 'taxSnapshot';
  IF jsonb_typeof(v_tax) IS DISTINCT FROM 'object'
     OR v_tax ->> 'version' IS DISTINCT FROM '1'
     OR v_tax ->> 'jurisdiction' IS DISTINCT FROM 'GB'
     OR v_tax ->> 'destinationCountry' IS DISTINCT FROM 'GB'
     OR v_tax ->> 'treatment' IS DISTINCT FROM 'seller_non_vat_declared'
     OR v_tax ->> 'sellerVatRegistered' IS DISTINCT FROM 'false'
     OR v_tax ->> 'reverseCharge' IS DISTINCT FROM 'false'
     OR v_tax ->> 'vatAmountPence' IS DISTINCT FROM '0'
     OR v_tax ->> 'evidenceSource' IS DISTINCT FROM 'seller_profile_and_product_tax_evidence_v1'
     OR v_tax ->> 'evidenceVersion' IS DISTINCT FROM '1'
  THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(p_metadata -> 'applyReverseCharge') IS DISTINCT FROM 'boolean'
     OR (p_metadata ->> 'applyReverseCharge')::boolean IS DISTINCT FROM false
  THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(p_metadata -> 'items') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_metadata -> 'items') = 0
  THEN
    RETURN false;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_metadata -> 'items')
  LOOP
    IF v_item ->> 'listingContext' IS DISTINCT FROM 'product'
       OR v_item ->> 'taxTreatmentStatus' IS DISTINCT FROM 'seller_non_vat_declared'
       OR v_item ->> 'taxTreatmentSource' IS DISTINCT FROM 'seller_profile_non_vat_declaration_v1'
       OR v_item ->> 'taxEvidenceVersion' IS DISTINCT FROM '1'
       OR NULLIF(BTRIM(v_item ->> 'taxEvidenceCapturedAt'), '') IS NULL
       OR jsonb_typeof(v_item -> 'vatRate') IS DISTINCT FROM 'number'
       OR (v_item ->> 'vatRate')::numeric IS DISTINCT FROM 0::numeric
       OR jsonb_typeof(v_item -> 'price') IS DISTINCT FROM 'number'
       OR jsonb_typeof(v_item -> 'priceExVat') IS DISTINCT FROM 'number'
       OR round((v_item ->> 'price')::numeric, 2) IS DISTINCT FROM round((v_item ->> 'priceExVat')::numeric, 2)
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

REVOKE ALL ON FUNCTION private.payment_session_has_marketplace_tax_snapshot_v1(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

-- Strengthen the existing Checkpoint A payment-session cutover rather than
-- creating a second payment-session truth.
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
  IF private.payment_session_has_marketplace_tax_snapshot_v1(NEW.metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'payment session rejected: complete marketplace tax evidence v1 is required after cutover';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_payment_session_commercial_snapshot_v1()
  FROM PUBLIC, anon, authenticated, service_role;

-- Replace the existing atomic materialiser in-place. There remains exactly one
-- public paid-order persistence boundary; this migration removes its hard-coded
-- 20% VAT maths for post-cutover marketplace payments.
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
  v_tax jsonb;
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
  v_item_tax jsonb;
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

  SELECT ps.* INTO v_session
    FROM public.payment_sessions ps
   WHERE ps.id = p_payment_session_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_session.status NOT IN ('pending', 'completed') THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session status % is not processable', v_session.status USING ERRCODE = 'P0001';
  END IF;

  v_metadata := v_session.metadata;
  IF private.payment_session_has_commercial_snapshot_v1(v_metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: complete commercial snapshot evidence v1 is required' USING ERRCODE = '22023';
  END IF;
  IF private.payment_session_has_marketplace_tax_snapshot_v1(v_metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: complete marketplace tax evidence v1 is required' USING ERRCODE = '22023';
  END IF;
  IF lower(COALESCE(v_session.currency, '')) <> 'gbp' THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session currency must be GBP' USING ERRCODE = '22023';
  END IF;

  v_buyer := v_metadata -> 'buyerSnapshot';
  v_seller := v_metadata -> 'sellerSnapshot';
  v_tax := v_metadata -> 'taxSnapshot';
  v_buyer_id := (v_buyer ->> 'id')::uuid;
  v_seller_id := (v_seller ->> 'id')::uuid;
  v_is_b2b := (v_buyer ->> 'isB2B')::boolean;
  v_reverse_charge := (v_buyer ->> 'reverseCharge')::boolean;

  IF v_reverse_charge THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: reverse charge is not authorised by marketplace tax evidence v1' USING ERRCODE = '22023';
  END IF;
  IF v_session."userId" IS DISTINCT FROM v_buyer_id THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session user does not match buyer evidence' USING ERRCODE = '22023';
  END IF;
  IF v_session."stripePaymentIntent" IS NOT NULL AND v_session."stripePaymentIntent" IS DISTINCT FROM p_payment_intent_id THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: PaymentIntent conflicts with persisted session evidence' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_metadata -> 'totalPence') IS DISTINCT FROM 'number'
     OR jsonb_typeof(v_metadata -> 'shippingAmountPence') IS DISTINCT FROM 'number'
  THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: integer pence totals are required' USING ERRCODE = '22023';
  END IF;

  v_total_pence := (v_metadata ->> 'totalPence')::bigint;
  v_shipping_pence := (v_metadata ->> 'shippingAmountPence')::bigint;
  IF v_total_pence < 0 OR v_shipping_pence < 0 OR v_shipping_pence > v_total_pence THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid monetary totals' USING ERRCODE = '22023';
  END IF;
  IF round(v_session.amount * 100)::bigint IS DISTINCT FROM v_total_pence THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session amount conflicts with metadata total' USING ERRCODE = '22023';
  END IF;

  v_product_paid := (v_total_pence - v_shipping_pence)::numeric / 100;
  v_subtotal := round(v_product_paid, 2);
  v_vat := 0;
  v_shipping := v_shipping_pence::numeric / 100;
  v_total := v_total_pence::numeric / 100;
  v_commission := round(v_subtotal * p_commission_rate, 2);

  SELECT count(*)::integer,
         count(DISTINCT value ->> 'productId')::integer,
         COALESCE(sum((value ->> 'quantity')::numeric), 0)::integer
    INTO v_item_count, v_distinct_product_count, v_total_quantity
    FROM jsonb_array_elements(v_metadata -> 'items');

  IF v_item_count <= 0 OR v_distinct_product_count <> v_item_count THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: duplicate or missing product lines' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_metadata -> 'items')
  LOOP
    IF (v_item ->> 'quantity')::numeric <= 0
       OR (v_item ->> 'quantity')::numeric <> trunc((v_item ->> 'quantity')::numeric)
       OR (v_item ->> 'price')::numeric <= 0
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid item quantity/price' USING ERRCODE = '22023';
    END IF;
    IF (v_item ->> 'sellerId')::uuid IS DISTINCT FROM v_seller_id THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: multi-seller or conflicting seller evidence' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_primary_product_id := ((v_metadata -> 'items' -> 0) ->> 'productId')::uuid;
  v_reservation_token := NULLIF(v_metadata ->> 'reservationToken', '')::uuid;

  SELECT o.* INTO v_order
    FROM public.orders o
   WHERE o."stripePaymentIntentId" = p_payment_intent_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_order."buyerId" IS DISTINCT FROM v_buyer_id
       OR v_order."sellerId" IS DISTINCT FROM v_seller_id
       OR v_order.total IS DISTINCT FROM v_total
       OR v_order."commercialSnapshotSource" IS DISTINCT FROM 'checkout_verified'
       OR v_order."taxDecisionSource" IS DISTINCT FROM 'checkout_verified_tax_v1'
       OR v_order."taxDecisionSnapshot" IS DISTINCT FROM v_tax
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: existing order conflicts with payment evidence' USING ERRCODE = 'P0001';
    END IF;
    IF v_order.status NOT IN ('awaiting_payment', 'paid') THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: existing order status % is not processable', v_order.status USING ERRCODE = 'P0001';
    END IF;
  ELSE
    INSERT INTO public.orders (
      "buyerId", "sellerId", "productId", quantity, subtotal, "vatAmount", "shippingAmount", total, commission,
      status, "escrowStatus", "shippingAddress", "billingAddress", "shippingMethod", "isB2B", "stripePaymentIntentId",
      "buyerNameSnapshot", "buyerEmailSnapshot", "buyerCompanyNameSnapshot", "buyerVatNumberSnapshot",
      "sellerBusinessNameSnapshot", "isB2BSnapshot", "reverseChargeSnapshot", "commercialSnapshotSource", "commercialSnapshotCapturedAt",
      "taxDecisionSnapshot", "taxDecisionSource", "taxDecisionCapturedAt"
    ) VALUES (
      v_buyer_id, v_seller_id, v_primary_product_id, v_total_quantity, v_subtotal, v_vat, v_shipping, v_total, v_commission,
      'awaiting_payment', 'held',
      CASE WHEN jsonb_typeof(v_metadata -> 'shippingAddress') = 'object' THEN v_metadata -> 'shippingAddress' ELSE '{}'::jsonb END,
      CASE WHEN jsonb_typeof(v_metadata -> 'billingAddress') = 'object' THEN v_metadata -> 'billingAddress' ELSE '{}'::jsonb END,
      COALESCE(NULLIF(BTRIM(v_metadata ->> 'shippingMethod'), ''), 'Standard'), v_is_b2b, p_payment_intent_id,
      v_buyer ->> 'name', v_buyer ->> 'email', NULLIF(BTRIM(v_buyer ->> 'companyName'), ''), NULLIF(BTRIM(v_buyer ->> 'vatNumber'), ''),
      v_seller ->> 'businessName', v_is_b2b, false, 'checkout_verified', v_session."createdAt",
      v_tax, 'checkout_verified_tax_v1', v_session."createdAt"
    ) RETURNING * INTO v_order;
  END IF;

  v_order_id := v_order.id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_metadata -> 'items')
  LOOP
    v_item_product_id := (v_item ->> 'productId')::uuid;
    v_item_seller_id := (v_item ->> 'sellerId')::uuid;
    v_item_quantity := (v_item ->> 'quantity')::integer;
    v_item_price := (v_item ->> 'price')::numeric;
    v_item_context := v_item ->> 'listingContext';
    v_item_image := CASE WHEN jsonb_typeof(v_item -> 'image') = 'null' THEN NULL ELSE v_item ->> 'image' END;
    v_item_tax := jsonb_build_object(
      'treatment', v_item ->> 'taxTreatmentStatus',
      'source', v_item ->> 'taxTreatmentSource',
      'evidenceVersion', (v_item ->> 'taxEvidenceVersion')::integer,
      'evidenceCapturedAt', v_item ->> 'taxEvidenceCapturedAt',
      'vatRate', 0
    );

    IF v_item_seller_id IS DISTINCT FROM v_seller_id THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: item seller mismatch' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.order_items (
      "orderId", "productId", quantity, "pricePerUnit", "vatRate", subtotal,
      "productTitleSnapshot", "productImageSnapshot", "listingContextSnapshot", "productSnapshotSource", "productSnapshotCapturedAt",
      "taxTreatmentSnapshot", "taxTreatmentSource", "taxTreatmentCapturedAt"
    ) VALUES (
      v_order_id, v_item_product_id, v_item_quantity, v_item_price, 0,
      round(v_item_price * v_item_quantity, 2),
      v_item ->> 'title', v_item_image, v_item_context, 'checkout_verified', v_session."createdAt",
      v_item_tax, 'checkout_verified_tax_v1', v_session."createdAt"
    ) ON CONFLICT ("orderId", "productId") DO NOTHING;

    SELECT oi.* INTO v_existing_item
      FROM public.order_items oi
     WHERE oi."orderId" = v_order_id
       AND oi."productId" = v_item_product_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_existing_item.quantity IS DISTINCT FROM v_item_quantity
       OR v_existing_item."pricePerUnit" IS DISTINCT FROM v_item_price
       OR v_existing_item."vatRate" IS DISTINCT FROM 0::numeric
       OR v_existing_item.subtotal IS DISTINCT FROM round(v_item_price * v_item_quantity, 2)
       OR v_existing_item."productTitleSnapshot" IS DISTINCT FROM (v_item ->> 'title')
       OR v_existing_item."productImageSnapshot" IS DISTINCT FROM v_item_image
       OR v_existing_item."listingContextSnapshot" IS DISTINCT FROM v_item_context
       OR v_existing_item."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'
       OR v_existing_item."taxTreatmentSource" IS DISTINCT FROM 'checkout_verified_tax_v1'
       OR v_existing_item."taxTreatmentSnapshot" IS DISTINCT FROM v_item_tax
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: persisted order item conflicts with payment evidence' USING ERRCODE = 'P0001';
    END IF;

    PERFORM public.finalize_paid_order_item(v_order_id, v_item_product_id, v_reservation_token);
  END LOOP;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE "stockFinalizedAt" IS NOT NULL)::integer
    INTO v_persisted_item_count, v_finalized_item_count
    FROM public.order_items
   WHERE "orderId" = v_order_id;

  IF v_persisted_item_count <> v_item_count OR v_finalized_item_count <> v_item_count THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: complete finalized item set was not materialized' USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status = 'awaiting_payment' THEN
    UPDATE public.orders
       SET status = 'paid', "updatedAt" = now()
     WHERE id = v_order_id AND status = 'awaiting_payment'
    RETURNING * INTO v_order;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: paid transition lost its expected state' USING ERRCODE = '40001';
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

COMMENT ON COLUMN public.products."taxTreatmentStatus" IS
  'Versioned product tax treatment. P1 supports seller_non_vat_declared only; legacy unknowns remain NULL.';
COMMENT ON COLUMN public.products."taxTreatmentSource" IS
  'Evidence source for the product tax treatment; NULL means no verified tax conclusion.';
COMMENT ON COLUMN public.products."taxEvidenceVersion" IS
  'Version of the product tax evidence contract.';
COMMENT ON COLUMN public.products."taxEvidenceCapturedAt" IS
  'Timestamp when the versioned product tax evidence was captured.';
COMMENT ON COLUMN public.orders."taxDecisionSnapshot" IS
  'Immutable checkout-time transaction tax decision. NULL on legacy orders without authoritative evidence.';
COMMENT ON COLUMN public.orders."taxDecisionSource" IS
  'Source boundary for the immutable tax decision.';
COMMENT ON COLUMN public.order_items."taxTreatmentSnapshot" IS
  'Immutable checkout-time line tax evidence. NULL on legacy rows without authoritative evidence.';

DO $$
BEGIN
  IF to_regprocedure('public.server_materialize_paid_order_v1(uuid,text,numeric)') IS NULL THEN
    RAISE EXCEPTION 'canonical paid-order materializer is missing after tax reconciliation';
  END IF;
  IF to_regprocedure('private.payment_session_has_marketplace_tax_snapshot_v1(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'marketplace tax evidence validator is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_require_payment_session_commercial_snapshot_v1'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'payment-session fail-closed trigger is missing';
  END IF;
END;
$$;
