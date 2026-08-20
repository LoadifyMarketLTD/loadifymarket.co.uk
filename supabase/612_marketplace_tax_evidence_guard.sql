-- 612_marketplace_tax_evidence_guard.sql
--
-- P1 fiscal/payment guard discovered during Supplier Commerce Gate B preparation.
-- This migration does NOT implement the future tax engine. It makes the current
-- marketplace fail closed unless the existing independent-seller transaction has
-- enough immutable evidence to prove the narrow supported tax treatment.
--
-- Supported by this P1 only:
--   * Stripe Connect account country captured as GB
--   * seller explicitly declares NOT VAT registered and has no VAT number
--   * physical product listing
--   * product tax evidence = seller_non_vat_declared
--   * GB delivery/billing destination
--   * no reverse charge
--
-- Everything else remains blocked until the canonical Gate B / Phase G contract
-- explicitly authorises it. Historical paid orders are not rewritten.

BEGIN;

-- Atomic cutover guard. Never replace the materializer underneath a payment that
-- was created with the pre-P1 snapshot shape. Deployment must be retried only
-- after the existing payment reaches a terminal state.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payment_sessions ps
     WHERE ps.status = 'pending'
  ) THEN
    RAISE EXCEPTION '612 tax cutover blocked: pending payment_sessions exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders o
     WHERE o.status = 'awaiting_payment'
  ) THEN
    RAISE EXCEPTION '612 tax cutover blocked: awaiting_payment orders exist';
  END IF;
END;
$$;

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "taxCountry" text,
  ADD COLUMN IF NOT EXISTS "taxCountrySource" text,
  ADD COLUMN IF NOT EXISTS "taxCountryCapturedAt" timestamptz;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "taxTreatmentStatus" text,
  ADD COLUMN IF NOT EXISTS "taxTreatmentSource" text,
  ADD COLUMN IF NOT EXISTS "taxEvidenceVersion" integer,
  ADD COLUMN IF NOT EXISTS "taxEvidenceCapturedAt" timestamptz;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "sellerVatRegisteredSnapshot" boolean,
  ADD COLUMN IF NOT EXISTS "sellerVatNumberSnapshot" text,
  ADD COLUMN IF NOT EXISTS "sellerTaxCountrySnapshot" text,
  ADD COLUMN IF NOT EXISTS "taxTreatmentSnapshot" text,
  ADD COLUMN IF NOT EXISTS "taxSnapshotSource" text,
  ADD COLUMN IF NOT EXISTS "taxSnapshotCapturedAt" timestamptz;

-- ---------------------------------------------------------------------------
-- Stripe-derived tax-country evidence is server-only. seller_profiles is edited
-- from authenticated browser flows elsewhere in the product, so these three
-- evidence columns must not be forgeable by a seller/admin browser JWT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.protect_seller_tax_country_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW."taxCountry" := NULL;
      NEW."taxCountrySource" := NULL;
      NEW."taxCountryCapturedAt" := NULL;
    ELSE
      NEW."taxCountry" := OLD."taxCountry";
      NEW."taxCountrySource" := OLD."taxCountrySource";
      NEW."taxCountryCapturedAt" := OLD."taxCountryCapturedAt";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_seller_tax_country_evidence_v1()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_protect_seller_tax_country_evidence_v1
  ON public.seller_profiles;
CREATE TRIGGER trg_protect_seller_tax_country_evidence_v1
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.protect_seller_tax_country_evidence_v1();

-- ---------------------------------------------------------------------------
-- Product tax evidence is server-derived from the seller profile. Seller-facing
-- create/update payloads can never force a VAT rate/treatment through this guard.
-- The trigger runs on every product write so direct client updates cannot mutate
-- only vatRate/taxTreatment fields while avoiding re-derivation.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.apply_marketplace_product_tax_evidence_v1()
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

  NEW."taxEvidenceVersion" := 1;
  NEW."taxEvidenceCapturedAt" := now();
  NEW."taxTreatmentSource" := 'seller_profile_declaration_v1';

  IF COALESCE(NEW."listingContext", 'product') <> 'product' THEN
    NEW."taxTreatmentStatus" := 'unsupported_service';
    RETURN NEW;
  END IF;

  IF v_is_vat_registered IS FALSE AND v_vat_number IS NULL THEN
    NEW."taxTreatmentStatus" := 'seller_non_vat_declared';
    NEW."vatRate" := 0;
    NEW."priceExVat" := NEW.price;
  ELSIF v_is_vat_registered IS TRUE THEN
    NEW."taxTreatmentStatus" := 'vat_verification_required';
  ELSE
    NEW."taxTreatmentStatus" := 'tax_profile_incomplete';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_marketplace_product_tax_evidence_v1()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_apply_marketplace_product_tax_evidence_v1 ON public.products;
CREATE TRIGGER trg_apply_marketplace_product_tax_evidence_v1
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.apply_marketplace_product_tax_evidence_v1();

-- Correct currently mutable listing tax fields prospectively. This is catalogue
-- state, not historical order state. No paid-order snapshot is rewritten.
UPDATE public.products p
   SET "taxEvidenceVersion" = 1,
       "taxEvidenceCapturedAt" = now(),
       "taxTreatmentSource" = 'seller_profile_declaration_v1',
       "taxTreatmentStatus" = CASE
         WHEN COALESCE(p."listingContext", 'product') <> 'product' THEN 'unsupported_service'
         WHEN sp."isVatRegistered" IS FALSE AND NULLIF(BTRIM(sp."vatNumber"), '') IS NULL THEN 'seller_non_vat_declared'
         WHEN sp."isVatRegistered" IS TRUE THEN 'vat_verification_required'
         ELSE 'tax_profile_incomplete'
       END,
       "vatRate" = CASE
         WHEN COALESCE(p."listingContext", 'product') = 'product'
          AND sp."isVatRegistered" IS FALSE
          AND NULLIF(BTRIM(sp."vatNumber"), '') IS NULL
         THEN 0
         ELSE p."vatRate"
       END,
       "priceExVat" = CASE
         WHEN COALESCE(p."listingContext", 'product') = 'product'
          AND sp."isVatRegistered" IS FALSE
          AND NULLIF(BTRIM(sp."vatNumber"), '') IS NULL
         THEN p.price
         ELSE p."priceExVat"
       END
  FROM public.seller_profiles sp
 WHERE sp."userId" = p."sellerId";

-- ---------------------------------------------------------------------------
-- Tax snapshot validation/enrichment on payment-session insert.
-- Checkout may only create a payable session when every required tax fact is
-- supported by server-side evidence. A client B2B/VAT flag can never establish
-- reverse charge by itself.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.marketplace_address_country_v1(p_address jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE upper(BTRIM(COALESCE(
    p_address ->> 'countryCode',
    p_address ->> 'country_code',
    p_address ->> 'country',
    ''
  )))
    WHEN 'GB' THEN 'GB'
    WHEN 'GBR' THEN 'GB'
    WHEN 'UK' THEN 'GB'
    WHEN 'UNITED KINGDOM' THEN 'GB'
    WHEN 'GREAT BRITAIN' THEN 'GB'
    ELSE NULLIF(upper(BTRIM(COALESCE(
      p_address ->> 'countryCode',
      p_address ->> 'country_code',
      p_address ->> 'country',
      ''
    ))), '')
  END;
$$;

REVOKE ALL ON FUNCTION private.marketplace_address_country_v1(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enrich_marketplace_payment_tax_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_metadata jsonb;
  v_buyer jsonb;
  v_seller jsonb;
  v_item jsonb;
  v_seller_id uuid;
  v_product_id uuid;
  v_destination_country text;
  v_tax_country text;
  v_tax_country_source text;
  v_tax_country_captured_at timestamptz;
  v_is_vat_registered boolean;
  v_vat_number text;
  v_product public.products%ROWTYPE;
BEGIN
  v_metadata := NEW.metadata;

  IF private.payment_session_has_commercial_snapshot_v1(v_metadata) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'payment session rejected: complete commercial snapshot evidence v1 is required before tax evaluation';
  END IF;

  v_buyer := v_metadata -> 'buyerSnapshot';
  v_seller := v_metadata -> 'sellerSnapshot';
  v_seller_id := (v_seller ->> 'id')::uuid;

  -- The old automatic rule "VAT-verified B2B buyer => reverse charge" is not
  -- authoritative. If checkout attempted it, fail closed rather than charging a
  -- reduced amount under an unproved tax treatment.
  IF COALESCE((v_metadata ->> 'applyReverseCharge')::boolean, false)
     OR COALESCE((v_buyer ->> 'reverseCharge')::boolean, false)
  THEN
    RAISE EXCEPTION 'payment session rejected: reverse charge requires explicit versioned tax-engine evidence';
  END IF;

  SELECT
    NULLIF(upper(BTRIM(sp."taxCountry")), ''),
    NULLIF(BTRIM(sp."taxCountrySource"), ''),
    sp."taxCountryCapturedAt",
    sp."isVatRegistered",
    NULLIF(BTRIM(sp."vatNumber"), '')
  INTO
    v_tax_country,
    v_tax_country_source,
    v_tax_country_captured_at,
    v_is_vat_registered,
    v_vat_number
  FROM public.seller_profiles sp
  WHERE sp."userId" = v_seller_id;

  IF v_tax_country IS DISTINCT FROM 'GB'
     OR v_tax_country_source IS DISTINCT FROM 'stripe_connect_account_v1'
     OR v_tax_country_captured_at IS NULL
  THEN
    RAISE EXCEPTION 'payment session rejected: seller tax country is not verified from Stripe Connect';
  END IF;

  IF v_is_vat_registered IS DISTINCT FROM false OR v_vat_number IS NOT NULL THEN
    RAISE EXCEPTION 'payment session rejected: seller VAT treatment requires verification';
  END IF;

  v_destination_country := COALESCE(
    private.marketplace_address_country_v1(v_metadata -> 'shippingAddress'),
    private.marketplace_address_country_v1(v_metadata -> 'billingAddress')
  );
  IF v_destination_country IS DISTINCT FROM 'GB' THEN
    RAISE EXCEPTION 'payment session rejected: destination tax country is not supported';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_metadata -> 'items')
  LOOP
    IF COALESCE(v_item ->> 'listingContext', '') <> 'product' THEN
      RAISE EXCEPTION 'payment session rejected: service tax treatment is not enabled';
    END IF;

    v_product_id := (v_item ->> 'productId')::uuid;
    SELECT p.* INTO v_product
      FROM public.products p
     WHERE p.id = v_product_id;

    IF NOT FOUND
       OR v_product."sellerId" IS DISTINCT FROM v_seller_id
       OR v_product."taxTreatmentStatus" IS DISTINCT FROM 'seller_non_vat_declared'
       OR v_product."taxTreatmentSource" IS DISTINCT FROM 'seller_profile_declaration_v1'
       OR v_product."taxEvidenceVersion" IS DISTINCT FROM 1
       OR v_product."taxEvidenceCapturedAt" IS NULL
       OR v_product."vatRate" IS DISTINCT FROM 0
       OR v_product."priceExVat" IS NULL
       OR round(v_product."priceExVat" * 100)::bigint IS DISTINCT FROM round(v_product.price * 100)::bigint
    THEN
      RAISE EXCEPTION 'payment session rejected: product tax evidence is incomplete or conflicting';
    END IF;
  END LOOP;

  -- Add immutable tax identity to the existing commercial snapshot. Existing
  -- checkout monetary totals remain valid for this treatment because no VAT is
  -- removed from the catalogue price and reverse charge is false.
  v_seller := v_seller || jsonb_build_object(
    'taxCountry', 'GB',
    'taxCountrySource', v_tax_country_source,
    'isVatRegistered', false,
    'vatNumber', NULL
  );
  v_buyer := jsonb_set(v_buyer, '{reverseCharge}', 'false'::jsonb, true);

  v_metadata := jsonb_set(v_metadata, '{sellerSnapshot}', v_seller, true);
  v_metadata := jsonb_set(v_metadata, '{buyerSnapshot}', v_buyer, true);
  v_metadata := jsonb_set(v_metadata, '{applyReverseCharge}', 'false'::jsonb, true);
  v_metadata := jsonb_set(v_metadata, '{taxSnapshotVersion}', '1'::jsonb, true);
  v_metadata := jsonb_set(
    v_metadata,
    '{taxSnapshot}',
    jsonb_build_object(
      'version', 1,
      'jurisdiction', 'GB',
      'destinationCountry', 'GB',
      'treatment', 'seller_non_vat_declared',
      'sellerVatRegistered', false,
      'sellerVatNumber', NULL,
      'reverseCharge', false,
      'vatAmountPence', 0,
      'evidenceSource', 'stripe_country_plus_seller_profile_plus_product_tax_evidence_v1',
      'evidenceVersion', 1,
      'capturedAt', now()
    ),
    true
  );

  NEW.metadata := v_metadata;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enrich_marketplace_payment_tax_snapshot_v1()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_00_enrich_marketplace_payment_tax_snapshot_v1
  ON public.payment_sessions;
CREATE TRIGGER trg_00_enrich_marketplace_payment_tax_snapshot_v1
BEFORE INSERT ON public.payment_sessions
FOR EACH ROW
EXECUTE FUNCTION private.enrich_marketplace_payment_tax_snapshot_v1();

CREATE OR REPLACE FUNCTION private.require_marketplace_payment_tax_snapshot_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_tax jsonb;
BEGIN
  IF NEW.metadata ->> 'taxSnapshotVersion' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'payment session rejected: tax snapshot evidence v1 is required';
  END IF;

  v_tax := NEW.metadata -> 'taxSnapshot';
  IF jsonb_typeof(v_tax) IS DISTINCT FROM 'object'
     OR v_tax ->> 'jurisdiction' IS DISTINCT FROM 'GB'
     OR v_tax ->> 'destinationCountry' IS DISTINCT FROM 'GB'
     OR v_tax ->> 'treatment' IS DISTINCT FROM 'seller_non_vat_declared'
     OR (v_tax ->> 'sellerVatRegistered')::boolean IS DISTINCT FROM false
     OR (v_tax ->> 'reverseCharge')::boolean IS DISTINCT FROM false
     OR (v_tax ->> 'vatAmountPence')::bigint IS DISTINCT FROM 0
     OR NULLIF(BTRIM(v_tax ->> 'evidenceSource'), '') IS NULL
     OR v_tax ->> 'evidenceVersion' IS DISTINCT FROM '1'
     OR NULLIF(BTRIM(v_tax ->> 'capturedAt'), '') IS NULL
  THEN
    RAISE EXCEPTION 'payment session rejected: invalid or incomplete tax snapshot evidence v1';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'payment session rejected: malformed tax snapshot evidence v1';
END;
$$;

REVOKE ALL ON FUNCTION private.require_marketplace_payment_tax_snapshot_v1()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_require_marketplace_payment_tax_snapshot_v1
  ON public.payment_sessions;
CREATE TRIGGER trg_require_marketplace_payment_tax_snapshot_v1
BEFORE INSERT ON public.payment_sessions
FOR EACH ROW
EXECUTE FUNCTION private.require_marketplace_payment_tax_snapshot_v1();

-- ---------------------------------------------------------------------------
-- Replace the existing atomic materializer implementation without changing its
-- signature or the webhook contract. It now consumes tax evidence instead of the
-- historical hard-coded 20% reconstruction.
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
  IF v_metadata ->> 'taxSnapshotVersion' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: tax snapshot evidence v1 is required'
      USING ERRCODE = '22023';
  END IF;
  IF lower(COALESCE(v_session.currency, '')) <> 'gbp' THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: payment session currency must be GBP'
      USING ERRCODE = '22023';
  END IF;

  v_buyer := v_metadata -> 'buyerSnapshot';
  v_seller := v_metadata -> 'sellerSnapshot';
  v_tax := v_metadata -> 'taxSnapshot';
  v_buyer_id := (v_buyer ->> 'id')::uuid;
  v_seller_id := (v_seller ->> 'id')::uuid;
  v_is_b2b := (v_buyer ->> 'isB2B')::boolean;
  v_reverse_charge := (v_tax ->> 'reverseCharge')::boolean;

  IF v_tax ->> 'treatment' IS DISTINCT FROM 'seller_non_vat_declared'
     OR v_tax ->> 'jurisdiction' IS DISTINCT FROM 'GB'
     OR v_tax ->> 'destinationCountry' IS DISTINCT FROM 'GB'
     OR (v_tax ->> 'sellerVatRegistered')::boolean IS DISTINCT FROM false
     OR v_reverse_charge IS DISTINCT FROM false
     OR (v_tax ->> 'vatAmountPence')::bigint IS DISTINCT FROM 0
  THEN
    RAISE EXCEPTION 'server_materialize_paid_order_v1: unsupported or conflicting tax snapshot'
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
       OR (v_item ->> 'sellerId')::uuid IS DISTINCT FROM v_seller_id
       OR COALESCE(v_item ->> 'listingContext', '') <> 'product'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: invalid item tax/commercial evidence'
        USING ERRCODE = '22023';
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
       OR v_order."taxTreatmentSnapshot" IS DISTINCT FROM 'seller_non_vat_declared'
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
      "buyerId", "sellerId", "productId", quantity,
      subtotal, "vatAmount", "shippingAmount", total, commission,
      status, "escrowStatus", "shippingAddress", "billingAddress", "shippingMethod", "isB2B",
      "stripePaymentIntentId",
      "buyerNameSnapshot", "buyerEmailSnapshot", "buyerCompanyNameSnapshot", "buyerVatNumberSnapshot",
      "sellerBusinessNameSnapshot", "isB2BSnapshot", "reverseChargeSnapshot",
      "commercialSnapshotSource", "commercialSnapshotCapturedAt",
      "sellerVatRegisteredSnapshot", "sellerVatNumberSnapshot", "sellerTaxCountrySnapshot",
      "taxTreatmentSnapshot", "taxSnapshotSource", "taxSnapshotCapturedAt"
    ) VALUES (
      v_buyer_id, v_seller_id, v_primary_product_id, v_total_quantity,
      v_subtotal, v_vat, v_shipping, v_total, v_commission,
      'awaiting_payment', 'held',
      CASE WHEN jsonb_typeof(v_metadata -> 'shippingAddress') = 'object' THEN v_metadata -> 'shippingAddress' ELSE '{}'::jsonb END,
      CASE WHEN jsonb_typeof(v_metadata -> 'billingAddress') = 'object' THEN v_metadata -> 'billingAddress' ELSE '{}'::jsonb END,
      COALESCE(NULLIF(BTRIM(v_metadata ->> 'shippingMethod'), ''), 'Standard'),
      v_is_b2b,
      p_payment_intent_id,
      v_buyer ->> 'name', v_buyer ->> 'email',
      NULLIF(BTRIM(v_buyer ->> 'companyName'), ''), NULLIF(BTRIM(v_buyer ->> 'vatNumber'), ''),
      v_seller ->> 'businessName', v_is_b2b, false,
      'checkout_verified', v_session."createdAt",
      false, NULL, 'GB',
      'seller_non_vat_declared', v_tax ->> 'evidenceSource',
      COALESCE(NULLIF(v_tax ->> 'capturedAt', '')::timestamptz, v_session."createdAt")
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
    v_item_image := CASE WHEN jsonb_typeof(v_item -> 'image') = 'null' THEN NULL ELSE v_item ->> 'image' END;

    INSERT INTO public.order_items (
      "orderId", "productId", quantity, "pricePerUnit", "vatRate", subtotal,
      "productTitleSnapshot", "productImageSnapshot", "listingContextSnapshot",
      "productSnapshotSource", "productSnapshotCapturedAt"
    ) VALUES (
      v_order_id, v_item_product_id, v_item_quantity, v_item_price, 0,
      round(v_item_price * v_item_quantity, 2),
      v_item ->> 'title', v_item_image, v_item_context,
      'checkout_verified', v_session."createdAt"
    )
    ON CONFLICT ("orderId", "productId") DO NOTHING;

    SELECT oi.* INTO v_existing_item
      FROM public.order_items oi
     WHERE oi."orderId" = v_order_id
       AND oi."productId" = v_item_product_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_existing_item.quantity IS DISTINCT FROM v_item_quantity
       OR v_existing_item."pricePerUnit" IS DISTINCT FROM v_item_price
       OR v_existing_item."vatRate" IS DISTINCT FROM 0
       OR v_existing_item.subtotal IS DISTINCT FROM round(v_item_price * v_item_quantity, 2)
       OR v_existing_item."productTitleSnapshot" IS DISTINCT FROM (v_item ->> 'title')
       OR v_existing_item."productImageSnapshot" IS DISTINCT FROM v_item_image
       OR v_existing_item."listingContextSnapshot" IS DISTINCT FROM v_item_context
       OR v_existing_item."productSnapshotSource" IS DISTINCT FROM 'checkout_verified'
    THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: persisted order item conflicts with payment/tax evidence'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM public.finalize_paid_order_item(v_order_id, v_item_product_id, v_reservation_token);
  END LOOP;

  SELECT count(*)::integer,
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
       SET status = 'paid', "updatedAt" = now()
     WHERE id = v_order_id AND status = 'awaiting_payment'
    RETURNING * INTO v_order;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'server_materialize_paid_order_v1: paid transition lost its expected state'
        USING ERRCODE = '40001';
    END IF;
    v_first_paid_transition := true;
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
  'Service-role-only atomic post-payment materialization using immutable commercial snapshot v1 plus marketplace tax snapshot v1. P1 supports only GB non-VAT seller product transactions and fails closed otherwise.';

COMMENT ON COLUMN public.seller_profiles."taxCountry" IS
  'Server-captured seller tax-country evidence. P1 accepts only GB from Stripe Connect account country.';
COMMENT ON COLUMN public.seller_profiles."taxCountrySource" IS
  'Evidence source for seller tax country; P1 requires stripe_connect_account_v1.';
COMMENT ON COLUMN public.seller_profiles."taxCountryCapturedAt" IS
  'Timestamp when server captured seller tax-country evidence.';
COMMENT ON COLUMN public.products."taxTreatmentStatus" IS
  'Current server-derived listing tax treatment. Historical order tax is snapshotted separately.';
COMMENT ON COLUMN public.products."taxTreatmentSource" IS
  'Source used to derive current listing tax treatment.';
COMMENT ON COLUMN public.products."taxEvidenceVersion" IS
  'Version of current listing tax evidence derivation.';
COMMENT ON COLUMN public.products."taxEvidenceCapturedAt" IS
  'Timestamp of current listing tax evidence derivation.';
COMMENT ON COLUMN public.orders."taxTreatmentSnapshot" IS
  'Immutable checkout-time tax treatment snapshot for post-P1 paid orders.';
COMMENT ON COLUMN public.orders."taxSnapshotSource" IS
  'Immutable source summary for checkout-time tax evidence.';
COMMENT ON COLUMN public.orders."taxSnapshotCapturedAt" IS
  'Immutable checkout-time tax evidence capture timestamp.';

DO $$
BEGIN
  IF to_regprocedure('private.protect_seller_tax_country_evidence_v1()') IS NULL THEN
    RAISE EXCEPTION 'seller tax-country evidence protection function is missing';
  END IF;
  IF to_regprocedure('private.enrich_marketplace_payment_tax_snapshot_v1()') IS NULL THEN
    RAISE EXCEPTION 'marketplace tax enrichment trigger function is missing';
  END IF;
  IF to_regprocedure('private.require_marketplace_payment_tax_snapshot_v1()') IS NULL THEN
    RAISE EXCEPTION 'marketplace tax snapshot validator is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.seller_profiles'::regclass
       AND tgname = 'trg_protect_seller_tax_country_evidence_v1'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'seller tax-country evidence protection trigger is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_00_enrich_marketplace_payment_tax_snapshot_v1'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'marketplace tax enrichment trigger is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.payment_sessions'::regclass
       AND tgname = 'trg_require_marketplace_payment_tax_snapshot_v1'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'marketplace tax snapshot trigger is missing';
  END IF;
END;
$$;

COMMIT;
