CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "addressLine1" text,
  ADD COLUMN IF NOT EXISTS "addressLine2" text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postcode text;

CREATE OR REPLACE FUNCTION private.scrub_seller_profile_on_delete_marker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW."fullName" = 'Deleted Seller'
     AND NEW.phone IS NULL
     AND NEW."vatNumber" IS NULL
     AND NEW."addressLine1" IS NULL
     AND NEW."addressLine2" IS NULL
     AND NEW.city IS NULL
     AND NEW.postcode IS NULL THEN
    NEW."businessAddress" := NULL;
    NEW."contactPhone" := NULL;
    NEW."companyRegistrationNumber" := NULL;
    NEW."payoutDetails" := NULL;
    NEW."stripeAccountId" := NULL;
    NEW."stripeConnectAccountId" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.scrub_seller_profile_on_delete_marker() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_scrub_seller_profile_on_delete_marker ON public.seller_profiles;
CREATE TRIGGER trg_scrub_seller_profile_on_delete_marker
BEFORE UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.scrub_seller_profile_on_delete_marker();

CREATE TABLE IF NOT EXISTS public.user_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "deletedUserId" uuid NOT NULL,
  "deletedByAdminId" uuid,
  "originalEmail" text,
  "deletedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_deletion_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_deletion_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_deletion_log TO service_role;

CREATE OR REPLACE FUNCTION private.hash_deletion_log_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW."originalEmail" IS NOT NULL AND length(trim(NEW."originalEmail")) > 0 THEN
    NEW."originalEmail" := 'sha256:' || encode(extensions.digest(lower(trim(NEW."originalEmail")), 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.hash_deletion_log_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_hash_deletion_log_email ON public.user_deletion_log;
CREATE TRIGGER trg_hash_deletion_log_email
BEFORE INSERT OR UPDATE OF "originalEmail" ON public.user_deletion_log
FOR EACH ROW
EXECUTE FUNCTION private.hash_deletion_log_email();;
