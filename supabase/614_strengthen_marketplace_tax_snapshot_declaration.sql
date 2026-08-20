-- 614_strengthen_marketplace_tax_snapshot_declaration.sql
--
-- Bind every supported P1 payment tax snapshot to the explicit seller
-- self-declaration introduced by migration 613.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_tax_decision_snapshot_coherence_check;

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
      AND "taxDecisionSnapshot" ->> 'sellerDeclarationVersion' = '1'
      AND "taxDecisionSnapshot" ->> 'sellerDeclarationSource' = 'seller_self_declaration_v1'
      AND NULLIF(BTRIM("taxDecisionSnapshot" ->> 'sellerDeclarationCapturedAt'), '') IS NOT NULL
      AND "taxDecisionSnapshot" ->> 'reverseCharge' = 'false'
      AND "taxDecisionSnapshot" ->> 'vatAmountPence' = '0'
      AND "taxDecisionSnapshot" ->> 'evidenceSource' = 'seller_profile_and_product_tax_evidence_v1'
      AND "taxDecisionSnapshot" ->> 'evidenceVersion' = '1'
    )
  );

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
     OR v_tax ->> 'sellerDeclarationVersion' IS DISTINCT FROM '1'
     OR v_tax ->> 'sellerDeclarationSource' IS DISTINCT FROM 'seller_self_declaration_v1'
     OR NULLIF(BTRIM(v_tax ->> 'sellerDeclarationCapturedAt'), '') IS NULL
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

DO $$
BEGIN
  IF to_regprocedure('private.payment_session_has_marketplace_tax_snapshot_v1(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'seller-declaration-aware marketplace tax validator is missing';
  END IF;
END;
$$;
