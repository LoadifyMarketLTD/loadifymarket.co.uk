-- 612_reconcile_marketplace_vat_contract.sql
--
-- Foundation P1 repair discovered during Gate B review.
--
-- Existing Marketplace Seller legal/commercial contract:
--   * the independent marketplace seller is the seller to the buyer;
--   * Loadify is the marketplace intermediary/payment platform;
--   * VAT must therefore never be invented from buyer account type alone or from
--     Loadify's own VAT registration.
--
-- Safe supported route after this migration:
--   MARKETPLACE SELLER + seller explicitly NOT VAT registered
--   -> seller-entered product price is the final item price
--   -> VAT = 0
--   -> generic B2B reverse charge is NOT supported
--   -> immutable seller/tax evidence is snapshotted before paid-order materialisation.
--
-- VAT-registered marketplace sellers and special/cross-border tax routes remain
-- fail-closed until an explicit, verified tax-treatment contract is implemented.
-- Historical orders are not rewritten.

-- ---------------------------------------------------------------------------
-- 1. Product tax truth: remove the unsafe universal 20% assumption.
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ALTER COLUMN "vatRate" SET DEFAULT 0;

-- All seller profiles in production at the cutover are explicitly non-VAT-
-- registered. Reconcile only rows whose seller has explicitly declared false;
-- do not infer unknown history or rewrite orders/order_items.
UPDATE public.products p
   SET "vatRate" = 0,
       "priceExVat" = p.price
  FROM public.seller_profiles sp
 WHERE sp."userId" = p."sellerId"
   AND sp."isVatRegistered" = false
   AND (
     p."vatRate" IS DISTINCT FROM 0::numeric
     OR p."priceExVat" IS DISTINCT FROM p.price
   );

CREATE OR REPLACE FUNCTION private.enforce_marketplace_product_tax_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_is_vat_registered boolean;
  v_vat_number text;
BEGIN
  SELECT sp."isVatRegistered", NULLIF(BTRIM(sp."vatNumber"), '')
    INTO v_is_vat_registered, v_vat_number
    FROM public.seller_profiles sp
   WHERE sp."userId" = NEW."sellerId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace tax contract: seller profile is required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Drafts remain editable, but a VAT-registered seller cannot publish under a
  -- guessed 20% rule. Gate B must explicitly authorise the future treatment.
  IF v_is_vat_registered = true AND COALESCE(NEW."isActive", false) = true THEN
    RAISE EXCEPTION 'marketplace tax contract: VAT-registered seller listings require explicit verified tax treatment before publication'
      USING ERRCODE = 'P0001';
  END IF;

  -- Current supported Marketplace Seller path: seller is explicitly not VAT
  -- registered. The seller-entered price is the final item price; no VAT is
  -- split out or added by Loadify.
  IF COALESCE(v_is_vat_registered, false) = false THEN
    NEW."vatRate" := 0;
    NEW."priceExVat" := NEW.price;
    RETURN NEW;
  END IF;

  -- VAT-registered draft: keep it non-sellable and do not manufacture a rate.
  NEW."vatRate" := 0;
  NEW."priceExVat" := NEW.price;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_marketplace_product_tax_contract()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_00_enforce_marketplace_product_tax_contract
  ON public.products;
CREATE TRIGGER trg_00_enforce_marketplace_product_tax_contract
BEFORE INSERT OR UPDATE OF price, "sellerId", "vatRate", "priceExVat", "isActive"
ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.enforce_marketplace_product_tax_contract();

-- ---------------------------------------------------------------------------
-- 2. Immutable seller/tax snapshot columns for future payment-backed orders.
-- Legacy rows stay NULL and are not reconstructed from current seller data.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "sellerBusinessAddressSnapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "sellerVatRegisteredSnapshot" boolean,
  ADD COLUMN IF NOT EXISTS "sellerVatNumberSnapshot" text,
  ADD COLUMN IF NOT EXISTS "taxSnapshotVersion" integer,
  ADD COLUMN IF NOT EXISTS "taxTreatmentSnapshot" text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS "taxTreatmentSnapshot" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_marketplace_tax_snapshot_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_marketplace_tax_snapshot_check
      CHECK (
        (
          "commercialSnapshotSource" IS NULL
          AND "sellerBusinessAddressSnapshot" IS NULL
          AND "sellerVatRegisteredSnapshot" IS NULL
          AND "sellerVatNumberSnapshot" IS NULL
          AND "taxSnapshotVersion" IS NULL
          AND "taxTreatmentSnapshot" IS NULL
        )
        OR (
          "commercialSnapshotSource" IS NOT NULL
          AND jsonb_typeof("sellerBusinessAddressSnapshot") = 'object'
          AND "sellerVatRegisteredSnapshot" IS NOT NULL
          AND "taxSnapshotVersion" = 1
          AND "taxTreatmentSnapshot" = 'seller_not_vat_registered'
          AND "sellerVatRegisteredSnapshot" = false
          AND "sellerVatNumberSnapshot" IS NULL
          AND COALESCE("reverseChargeSnapshot", false) = false
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_marketplace_tax_snapshot_check'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_marketplace_tax_snapshot_check
      CHECK (
        "productSnapshotSource" IS NULL
        OR (
          "vatRate" = 0
          AND "taxTreatmentSnapshot" = 'seller_not_vat_registered'
        )
      );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Enrich and validate payment-session tax evidence BEFORE the existing v1
-- commercial-snapshot trigger runs. PostgreSQL fires same-event triggers by
-- name, therefore trg_00_* runs before trg_require_*.
--
-- Old Web/Mobile producers may still send applyReverseCharge=true. Such sessions
-- fail closed, the producer expires/cancels its newly-created Stripe state, and
-- no paid order can be materialised from guessed tax treatment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.enrich_marketplace_payment_tax_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seller jsonb;
  v_seller_id uuid;
  v_is_vat_registered boolean;
  v_vat_number text;
  v_business_address jsonb;
  v_items jsonb;
  v_bad_items integer;
BEGIN
  IF NEW.metadata IS NULL OR jsonb_typeof(NEW.metadata) IS DISTINCT FROM 'object' THEN
    RETURN NEW; -- existing commercial-snapshot trigger will fail closed.
  END IF;

  v_seller := NEW.metadata -> 'sellerSnapshot';
  IF jsonb_typeof(v_seller) IS DISTINCT FROM 'object'
     OR NULLIF(BTRIM(v_seller ->> 'id'), '') IS NULL
  THEN
    RETURN NEW; -- existing commercial-snapshot trigger will fail closed.
  END IF;

  -- Generic buyer-account reverse charge is not a supported marketplace tax
  -- route. It depends on transaction facts that the current contract does not
  -- prove (supplier establishment, goods location, transaction class, etc.).
  IF (
       jsonb_typeof(NEW.metadata -> 'applyReverseCharge') = 'boolean'
       AND (NEW.metadata ->> 'applyReverseCharge')::boolean
     )
     OR (
       jsonb_typeof(NEW.metadata -> 'buyerSnapshot' -> 'reverseCharge') = 'boolean'
       AND (NEW.metadata -> 'buyerSnapshot' ->> 'reverseCharge')::boolean
     )
  THEN
    RAISE EXCEPTION 'payment session rejected: generic marketplace VAT reverse charge is not an authorised tax route'
      USING ERRCODE = 'P0001';
  END IF;

  v_seller_id := (v_seller ->> 'id')::uuid;

  SELECT
    sp."isVatRegistered",
    NULLIF(BTRIM(sp."vatNumber"), ''),
    sp."businessAddress"
  INTO
    v_is_vat_registered,
    v_vat_number,
    v_business_address
  FROM public.seller_profiles sp
  JOIN public.users u ON u.id = sp."userId"
  WHERE sp."userId" = v_seller_id
    AND u.role = 'seller'
    AND u."isActive" = true
    AND sp."sellerStatus" = 'active'
    AND COALESCE(sp."isPaused", false) = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment session rejected: active seller tax identity is unavailable'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_is_vat_registered = true THEN
    RAISE EXCEPTION 'payment session rejected: VAT-registered marketplace seller requires explicit verified tax treatment'
      USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(v_business_address) IS DISTINCT FROM 'object'
     OR NULLIF(BTRIM(v_business_address ->> 'postcode'), '') IS NULL
     OR NULLIF(BTRIM(v_business_address ->> 'city'), '') IS NULL
     OR (
       NULLIF(BTRIM(v_business_address ->> 'address'), '') IS NULL
       AND NULLIF(BTRIM(v_business_address ->> 'streetAddress'), '') IS NULL
     )
  THEN
    RAISE EXCEPTION 'payment session rejected: seller business address is incomplete for immutable invoice evidence'
      USING ERRCODE = 'P0001';
  END IF;

  -- The current supported seller is explicitly non-VAT-registered. Every item
  -- must therefore still belong to that seller and have canonical vatRate=0.
  SELECT count(*)::integer
    INTO v_bad_items
    FROM jsonb_array_elements(NEW.metadata -> 'items') item
    LEFT JOIN public.products p
      ON p.id = NULLIF(BTRIM(item ->> 'productId'), '')::uuid
   WHERE p.id IS NULL
      OR p."sellerId" IS DISTINCT FROM v_seller_id
      OR p."vatRate" IS DISTINCT FROM 0::numeric
      OR p.price IS DISTINCT FROM (item ->> 'price')::numeric;

  IF v_bad_items <> 0 THEN
    RAISE EXCEPTION 'payment session rejected: item price/tax evidence conflicts with canonical non-VAT seller listing'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_agg(
    item || jsonb_build_object(
      'vatRate', 0,
      'priceExVat', (item ->> 'price')::numeric,
      'taxTreatment', 'seller_not_vat_registered'
    )
    ORDER BY ord
  )
  INTO v_items
  FROM jsonb_array_elements(NEW.metadata -> 'items') WITH ORDINALITY AS x(item, ord);

  NEW.metadata := jsonb_set(NEW.metadata, '{items}', COALESCE(v_items, '[]'::jsonb), true);
  NEW.metadata := jsonb_set(
    NEW.metadata,
    '{sellerSnapshot}',
    v_seller || jsonb_build_object(
      'businessAddress', v_business_address,
      'isVatRegistered', false,
      'vatNumber', NULL,
      'taxTreatment', 'seller_not_vat_registered'
    ),
    true
  );
  NEW.metadata := NEW.metadata || jsonb_build_object(
    'taxSnapshotVersion', 1,
    'taxTreatment', 'seller_not_vat_registered'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enrich_marketplace_payment_tax_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_00_enrich_marketplace_payment_tax_snapshot
  ON public.payment_sessions;
CREATE TRIGGER trg_00_enrich_marketplace_payment_tax_snapshot
BEFORE INSERT ON public.payment_sessions
FOR EACH ROW
EXECUTE FUNCTION private.enrich_marketplace_payment_tax_snapshot();

-- ---------------------------------------------------------------------------
-- 4. Extend immutable snapshot protection to the new seller/tax evidence.
-- ---------------------------------------------------------------------------
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
       OR NEW."sellerBusinessAddressSnapshot" IS DISTINCT FROM OLD."sellerBusinessAddressSnapshot"
       OR NEW."sellerVatRegisteredSnapshot" IS DISTINCT FROM OLD."sellerVatRegisteredSnapshot"
       OR NEW."sellerVatNumberSnapshot" IS DISTINCT FROM OLD."sellerVatNumberSnapshot"
       OR NEW."taxSnapshotVersion" IS DISTINCT FROM OLD."taxSnapshotVersion"
       OR NEW."taxTreatmentSnapshot" IS DISTINCT FROM OLD."taxTreatmentSnapshot"
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
       OR NEW."vatRate" IS DISTINCT FROM OLD."vatRate"
       OR NEW."taxTreatmentSnapshot" IS DISTINCT FROM OLD."taxTreatmentSnapshot"
       OR NEW."productSnapshotSource" IS DISTINCT FROM OLD."productSnapshotSource"
       OR NEW."productSnapshotCapturedAt" IS DISTINCT FROM OLD."productSnapshotCapturedAt"
    THEN
      RAISE EXCEPTION 'order item product/tax snapshot is immutable once captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_order_item_product_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

-- Existing triggers created by 610 point to these function OIDs and therefore
-- automatically execute the replaced definitions.

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
       OR jsonb_typeof(NEW."sellerBusinessAddressSnapshot") IS DISTINCT FROM 'object'
       OR NEW."sellerVatRegisteredSnapshot" IS DISTINCT FROM false
       OR NEW."sellerVatNumberSnapshot" IS NOT NULL
       OR NEW."taxSnapshotVersion" IS DISTINCT FROM 1
       OR NEW."taxTreatmentSnapshot" IS DISTINCT FROM 'seller_not_vat_registered'
       OR NEW."isB2BSnapshot" IS NULL
       OR NEW."reverseChargeSnapshot" IS DISTINCT FROM false
    THEN
      RAISE EXCEPTION 'paid order rejected: immutable marketplace commercial/tax snapshot is required after cutover';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.require_paid_order_commercial_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

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
       OR NEW."vatRate" IS DISTINCT FROM 0::numeric
       OR NEW."taxTreatmentSnapshot" IS DISTINCT FROM 'seller_not_vat_registered'
    THEN
      RAISE EXCEPTION 'paid order item rejected: immutable product/tax snapshot is required after cutover';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.require_paid_order_item_product_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Replace atomic paid-order materialisation so it consumes the DB-enriched
-- tax snapshot and never invents 20% VAT or generic reverse charge.
-- ---------------------------------------------------------------------------
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
  v_tax_snapshot_version integer;
  v_tax_treatment text;
  v_seller_vat_registered boolean;
  v_seller_vat_number text;
  v_seller_business_address jsonb;
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

  v_tax_snapshot_version := NULLIF(v_metadata ->> 'taxSnapshotVersion', '')::integer;
  v_tax_treatment := v_metadata ->> 'taxTreatment';
  v_buyer := v_metadata -> 'buyerSnapshot';
  v_seller := v_metadata -> 'sellerSnapshot';
  v_buyer_id := (v_buyer ->> 'id')::uuid;
  v_seller_id := (v_seller ->> 'id')::uuid;
  v_is_b2b := (v_buyer ->> 'isB2B')::boolean;
  v_reverse_charge := (v_buyer ->> 'reverseCharge')::boolean;
  v_seller_vat_registered := COALESCE((v_seller ->> 'isVatRegistered')::boolean, false);
  v_seller_vat_number := NULLIF(BTRIM(v_seller ->> 'vatNumber'), '');
  v_seller_business_address := v_seller -> 'businessAddress';

  IF v_tax_snapshot_version IS DISTINCT FROM 1
     OR v_tax_treatment IS DISTINCT FROM 'seller_not_vat_registered'
     OR v_seller_vat_registered IS DISTINCT FROM false
     OR v_seller_vat_number IS NOT NULL
     OR jsonb_typeof(v_seller_business_address) IS DISTINCT FROM 'object'
     OR v_reverse_charge IS DISTINCT FROM false
     OR (v_metadata ->> 'applyReverseCharge')::boolean IS DISTINCT FROM false
  THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: unsupported or incomplete marketplace tax snapshot'
      USING ERRCODE = '22023';
  END IF;

  IF lower(COALESCE(v_session.currency, '')) <> 'gbp' THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session currency must be GBP'
      USING ERRCODE = '22023';
  END IF;

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

  -- Current supported Marketplace Seller route has no VAT charged by the seller.
  -- The seller-entered item price is therefore already the full commercial item
  -- amount and must never be divided by 1.20.
  v_product_paid := (v_total_pence - v_shipping_pence)::numeric / 100;
  v_subtotal := round(v_product_paid, 2);
  v_vat := 0;
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
       OR (v_item ->> 'vatRate')::numeric IS DISTINCT FROM 0::numeric
       OR (v_item ->> 'taxTreatment') IS DISTINCT FROM 'seller_not_vat_registered'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid item quantity/price/tax evidence'
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
       OR v_order."taxSnapshotVersion" IS DISTINCT FROM 1
       OR v_order."taxTreatmentSnapshot" IS DISTINCT FROM 'seller_not_vat_registered'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: existing order conflicts with payment/tax evidence'
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
      "sellerBusinessAddressSnapshot",
      "sellerVatRegisteredSnapshot",
      "sellerVatNumberSnapshot",
      "taxSnapshotVersion",
      "taxTreatmentSnapshot",
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
      v_seller_business_address,
      false,
      NULL,
      1,
      'seller_not_vat_registered',
      v_is_b2b,
      false,
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
      "taxTreatmentSnapshot",
      "productSnapshotSource",
      "productSnapshotCapturedAt"
    ) VALUES (
      v_order_id,
      v_item_product_id,
      v_item_quantity,
      v_item_price,
      0,
      round(v_item_price * v_item_quantity, 2),
      v_item ->> 'title',
      v_item_image,
      v_item_context,
      'seller_not_vat_registered',
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
       OR v_existing_item."vatRate" IS DISTINCT FROM 0::numeric
       OR v_existing_item."taxTreatmentSnapshot" IS DISTINCT FROM 'seller_not_vat_registered'
       OR v_existing_item."productTitleSnapshot" IS DISTINCT FROM (v_item ->> 'title')
       OR v_existing_item."productImageSnapshot" IS DISTINCT FROM v_item_image
       OR v_existing_item."listingContextSnapshot" IS DISTINCT FROM v_item_context
       OR v_existing_item."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: persisted order item conflicts with payment/tax evidence'
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
  'Service-role-only atomic post-payment materialization. Marketplace tax evidence is fail-closed: current supported seller path is explicitly non-VAT-registered, VAT=0, generic reverse charge forbidden.';

COMMENT ON COLUMN public.orders."sellerBusinessAddressSnapshot" IS
  'Immutable seller business-address evidence captured before payment-backed order materialisation; NULL on legacy rows.';
COMMENT ON COLUMN public.orders."sellerVatRegisteredSnapshot" IS
  'Immutable seller VAT-registration state used by the transaction tax contract; NULL on legacy rows.';
COMMENT ON COLUMN public.orders."sellerVatNumberSnapshot" IS
  'Immutable seller VAT number when the authorised tax route requires it; NULL for non-VAT seller route and legacy rows.';
COMMENT ON COLUMN public.orders."taxSnapshotVersion" IS
  'Version of immutable transaction tax evidence; NULL on legacy rows.';
COMMENT ON COLUMN public.orders."taxTreatmentSnapshot" IS
  'Immutable transaction tax-treatment identifier; current supported marketplace value is seller_not_vat_registered.';
COMMENT ON COLUMN public.order_items."taxTreatmentSnapshot" IS
  'Immutable item tax-treatment identifier associated with vatRate; NULL on legacy rows.';

-- ---------------------------------------------------------------------------
-- 6. Migration assertions. These inspect structure only; no runtime data is
-- invented or rewritten beyond the explicit product reconciliation above.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_bad_non_vat_products integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.products'::regclass
      AND tgname = 'trg_00_enforce_marketplace_product_tax_contract'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'marketplace product tax contract trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.payment_sessions'::regclass
      AND tgname = 'trg_00_enrich_marketplace_payment_tax_snapshot'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'marketplace payment tax snapshot trigger is missing';
  END IF;

  SELECT count(*)::integer
    INTO v_bad_non_vat_products
    FROM public.products p
    JOIN public.seller_profiles sp ON sp."userId" = p."sellerId"
   WHERE sp."isVatRegistered" = false
     AND (
       p."vatRate" IS DISTINCT FROM 0::numeric
       OR p."priceExVat" IS DISTINCT FROM p.price
     );

  IF v_bad_non_vat_products <> 0 THEN
    RAISE EXCEPTION 'non-VAT seller product reconciliation incomplete: % row(s)', v_bad_non_vat_products;
  END IF;

  IF to_regprocedure('public.server_materialize_paid_order_v1(uuid,text,numeric)') IS NULL THEN
    RAISE EXCEPTION 'atomic paid-order materialization RPC is missing';
  END IF;
END;
$$;
