-- 615_authoritative_seller_tax_location_evidence.sql
--
-- Final P1 Branch Guard hardening.
--
-- The seller-facing `country` and `businessAddress` fields are editable profile
-- data and therefore cannot, by themselves, establish tax location evidence.
-- This migration adds server-only Stripe Connect location evidence and binds the
-- explicit seller tax declaration to that evidence before it may be stamped.
--
-- P1 remains intentionally narrow: Stripe country GB + a Stripe-captured
-- mainland-GB postcode + explicit seller declaration + non-VAT physical goods.

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "taxCountry" text,
  ADD COLUMN IF NOT EXISTS "taxPostcode" text,
  ADD COLUMN IF NOT EXISTS "taxCountrySource" text,
  ADD COLUMN IF NOT EXISTS "taxCountryCapturedAt" timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'seller_profiles_tax_country_evidence_coherence_check'
       AND conrelid = 'public.seller_profiles'::regclass
  ) THEN
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_tax_country_evidence_coherence_check
      CHECK (
        (
          "taxCountry" IS NULL
          AND "taxPostcode" IS NULL
          AND "taxCountrySource" IS NULL
          AND "taxCountryCapturedAt" IS NULL
        )
        OR (
          NULLIF(BTRIM("taxCountry"), '') IS NOT NULL
          AND "taxCountrySource" = 'stripe_connect_account_v1'
          AND "taxCountryCapturedAt" IS NOT NULL
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.protect_seller_tax_location_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_location_changed boolean := false;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW."taxCountry" := NULL;
      NEW."taxPostcode" := NULL;
      NEW."taxCountrySource" := NULL;
      NEW."taxCountryCapturedAt" := NULL;
    ELSE
      NEW."taxCountry" := OLD."taxCountry";
      NEW."taxPostcode" := OLD."taxPostcode";
      NEW."taxCountrySource" := OLD."taxCountrySource";
      NEW."taxCountryCapturedAt" := OLD."taxCountryCapturedAt";
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_location_changed :=
      NEW."taxCountry" IS DISTINCT FROM OLD."taxCountry"
      OR NEW."taxPostcode" IS DISTINCT FROM OLD."taxPostcode"
      OR NEW."taxCountrySource" IS DISTINCT FROM OLD."taxCountrySource";

    -- A seller declaration is bound to the authoritative Stripe tax location.
    -- If that location changes, force a fresh explicit declaration.
    IF v_location_changed THEN
      NEW."taxDeclarationConfirmed" := false;
      NEW."taxDeclarationVersion" := NULL;
      NEW."taxDeclarationSource" := NULL;
      NEW."taxDeclarationCapturedAt" := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_seller_tax_location_evidence_v1()
  FROM PUBLIC, anon, authenticated, service_role;

-- Prefix 00 ensures this protection runs before the declaration-capture trigger.
DROP TRIGGER IF EXISTS trg_00_protect_seller_tax_location_evidence_v1
  ON public.seller_profiles;
CREATE TRIGGER trg_00_protect_seller_tax_location_evidence_v1
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.protect_seller_tax_location_evidence_v1();

-- If an earlier partial application ever stamped a declaration before this
-- authoritative-location guard existed, invalidate it rather than laundering
-- mutable profile data into P1 tax evidence.
UPDATE public.seller_profiles
   SET "taxDeclarationConfirmed" = false,
       "taxDeclarationVersion" = NULL,
       "taxDeclarationSource" = NULL,
       "taxDeclarationCapturedAt" = NULL
 WHERE "taxDeclarationConfirmed" = true
   AND (
     upper(BTRIM(COALESCE("taxCountry", ''))) <> 'GB'
     OR "taxCountrySource" IS DISTINCT FROM 'stripe_connect_account_v1'
     OR "taxCountryCapturedAt" IS NULL
     OR NULLIF(BTRIM(COALESCE("taxPostcode", '')), '') IS NULL
     OR upper(regexp_replace(COALESCE("taxPostcode", ''), '\s+', '', 'g')) ~ '^(BT|GY|JE|IM|GX|BF)'
   );

CREATE OR REPLACE FUNCTION private.capture_seller_tax_declaration_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_declaration_changed boolean;
  v_profile_country text;
  v_tax_country text;
  v_tax_postcode text;
BEGIN
  IF v_actor_role = 'authenticated' AND NOT public.is_admin() THEN
    v_profile_country := upper(BTRIM(COALESCE(NEW.country, '')));
    v_tax_country := upper(BTRIM(COALESCE(NEW."taxCountry", '')));
    v_tax_postcode := upper(regexp_replace(COALESCE(NEW."taxPostcode", ''), '\s+', '', 'g'));

    IF NEW."taxDeclarationConfirmed" = true THEN
      IF v_tax_country IS DISTINCT FROM 'GB'
         OR NEW."taxCountrySource" IS DISTINCT FROM 'stripe_connect_account_v1'
         OR NEW."taxCountryCapturedAt" IS NULL
         OR NULLIF(v_tax_postcode, '') IS NULL
         OR v_tax_postcode ~ '^(BT|GY|JE|IM|GX|BF)'
         OR v_profile_country NOT IN ('GB', 'GBR', 'UK', 'UNITED KINGDOM', 'GREAT BRITAIN')
      THEN
        RAISE EXCEPTION 'seller tax declaration requires verified Stripe Connect Great Britain tax-location evidence';
      END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW."taxDeclarationConfirmed" = true THEN
        NEW."taxDeclarationVersion" := 1;
        NEW."taxDeclarationSource" := 'seller_self_declaration_v1';
        NEW."taxDeclarationCapturedAt" := now();
      ELSE
        NEW."taxDeclarationVersion" := NULL;
        NEW."taxDeclarationSource" := NULL;
        NEW."taxDeclarationCapturedAt" := NULL;
      END IF;
      RETURN NEW;
    END IF;

    v_declaration_changed :=
      NEW."taxDeclarationConfirmed" IS DISTINCT FROM OLD."taxDeclarationConfirmed"
      OR NEW."isVatRegistered" IS DISTINCT FROM OLD."isVatRegistered"
      OR NEW."vatNumber" IS DISTINCT FROM OLD."vatNumber"
      OR NEW.country IS DISTINCT FROM OLD.country;

    IF NEW."taxDeclarationConfirmed" = true THEN
      IF v_declaration_changed
         OR OLD."taxDeclarationVersion" IS DISTINCT FROM 1
         OR OLD."taxDeclarationSource" IS DISTINCT FROM 'seller_self_declaration_v1'
         OR OLD."taxDeclarationCapturedAt" IS NULL
      THEN
        NEW."taxDeclarationVersion" := 1;
        NEW."taxDeclarationSource" := 'seller_self_declaration_v1';
        NEW."taxDeclarationCapturedAt" := now();
      ELSE
        NEW."taxDeclarationVersion" := OLD."taxDeclarationVersion";
        NEW."taxDeclarationSource" := OLD."taxDeclarationSource";
        NEW."taxDeclarationCapturedAt" := OLD."taxDeclarationCapturedAt";
      END IF;
    ELSE
      NEW."taxDeclarationVersion" := NULL;
      NEW."taxDeclarationSource" := NULL;
      NEW."taxDeclarationCapturedAt" := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.capture_seller_tax_declaration_v1()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON COLUMN public.seller_profiles."taxCountry" IS
  'Server-only tax country captured from the seller Stripe Connect account.';
COMMENT ON COLUMN public.seller_profiles."taxPostcode" IS
  'Server-only tax postcode captured from Stripe Connect account address evidence when available.';
COMMENT ON COLUMN public.seller_profiles."taxCountrySource" IS
  'Authoritative source for tax-country evidence. P1 supports stripe_connect_account_v1 only.';
COMMENT ON COLUMN public.seller_profiles."taxCountryCapturedAt" IS
  'Timestamp when current Stripe Connect tax-location evidence was captured.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.seller_profiles'::regclass
       AND tgname = 'trg_00_protect_seller_tax_location_evidence_v1'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'seller tax-location protection trigger is missing';
  END IF;
END;
$$;
