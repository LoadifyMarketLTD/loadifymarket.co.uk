ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "taxDeclarationConfirmed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "taxDeclarationVersion" integer,
  ADD COLUMN IF NOT EXISTS "taxDeclarationSource" text,
  ADD COLUMN IF NOT EXISTS "taxDeclarationCapturedAt" timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'seller_profiles_tax_declaration_coherence_check'
       AND conrelid = 'public.seller_profiles'::regclass
  ) THEN
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_tax_declaration_coherence_check
      CHECK (
        (
          "taxDeclarationConfirmed" = false
          AND "taxDeclarationVersion" IS NULL
          AND "taxDeclarationSource" IS NULL
          AND "taxDeclarationCapturedAt" IS NULL
        )
        OR (
          "taxDeclarationConfirmed" = true
          AND "taxDeclarationVersion" = 1
          AND "taxDeclarationSource" = 'seller_self_declaration_v1'
          AND "taxDeclarationCapturedAt" IS NOT NULL
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.capture_seller_tax_declaration_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_actor_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_declaration_changed boolean;
BEGIN
  IF v_actor_role = 'authenticated' AND NOT public.is_admin() THEN
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

DROP TRIGGER IF EXISTS trg_capture_seller_tax_declaration_v1
  ON public.seller_profiles;
CREATE TRIGGER trg_capture_seller_tax_declaration_v1
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.capture_seller_tax_declaration_v1();

COMMENT ON COLUMN public.seller_profiles."taxDeclarationConfirmed" IS
  'Explicit seller confirmation that the VAT registration status and tax-location data currently stored in the profile are accurate.';
COMMENT ON COLUMN public.seller_profiles."taxDeclarationVersion" IS
  'Server-derived version of the seller self-declaration evidence contract; NULL until explicitly confirmed.';
COMMENT ON COLUMN public.seller_profiles."taxDeclarationSource" IS
  'Server-derived seller tax declaration source; NULL until explicitly confirmed.';
COMMENT ON COLUMN public.seller_profiles."taxDeclarationCapturedAt" IS
  'Server-derived timestamp for the current explicit seller tax declaration.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.seller_profiles'::regclass
       AND tgname = 'trg_capture_seller_tax_declaration_v1'
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'seller tax declaration capture trigger is missing';
  END IF;
END;
$$;;
