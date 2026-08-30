CREATE TABLE IF NOT EXISTS public.seller_profiles_public_data (
  "userId" uuid PRIMARY KEY,
  "businessName" text,
  "marketplaceRole" text,
  "isApproved" boolean,
  "verificationStatus" text,
  rating numeric,
  "salesCount" integer,
  "totalSales" integer,
  "deliverySuccessRate" numeric,
  "paymentBehaviour" text,
  "businessAddress" jsonb,
  "contactPhone" text,
  "createdAt" timestamptz
);

ALTER TABLE public.seller_profiles_public_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS seller_profiles_public_data_read ON public.seller_profiles_public_data;
CREATE POLICY seller_profiles_public_data_read
ON public.seller_profiles_public_data
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE ALL ON TABLE public.seller_profiles_public_data FROM PUBLIC;
GRANT SELECT ON TABLE public.seller_profiles_public_data TO anon, authenticated;
GRANT ALL ON TABLE public.seller_profiles_public_data TO service_role;

INSERT INTO public.seller_profiles_public_data (
  "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
  rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
  "businessAddress", "contactPhone", "createdAt"
)
SELECT
  "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
  rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
  jsonb_strip_nulls(jsonb_build_object(
    'city', "businessAddress" ->> 'city',
    'country', "businessAddress" ->> 'country'
  )),
  "contactPhone", "createdAt"
FROM public.seller_profiles
ON CONFLICT ("userId") DO UPDATE SET
  "businessName" = EXCLUDED."businessName",
  "marketplaceRole" = EXCLUDED."marketplaceRole",
  "isApproved" = EXCLUDED."isApproved",
  "verificationStatus" = EXCLUDED."verificationStatus",
  rating = EXCLUDED.rating,
  "salesCount" = EXCLUDED."salesCount",
  "totalSales" = EXCLUDED."totalSales",
  "deliverySuccessRate" = EXCLUDED."deliverySuccessRate",
  "paymentBehaviour" = EXCLUDED."paymentBehaviour",
  "businessAddress" = EXCLUDED."businessAddress",
  "contactPhone" = EXCLUDED."contactPhone",
  "createdAt" = EXCLUDED."createdAt";

CREATE OR REPLACE FUNCTION private.sync_seller_profiles_public_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seller_profiles_public_data WHERE "userId" = OLD."userId";
    RETURN OLD;
  END IF;

  INSERT INTO public.seller_profiles_public_data (
    "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
    rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
    "businessAddress", "contactPhone", "createdAt"
  ) VALUES (
    NEW."userId", NEW."businessName", NEW."marketplaceRole", NEW."isApproved", NEW."verificationStatus",
    NEW.rating, NEW."salesCount", NEW."totalSales", NEW."deliverySuccessRate", NEW."paymentBehaviour",
    jsonb_strip_nulls(jsonb_build_object(
      'city', NEW."businessAddress" ->> 'city',
      'country', NEW."businessAddress" ->> 'country'
    )),
    NEW."contactPhone", NEW."createdAt"
  )
  ON CONFLICT ("userId") DO UPDATE SET
    "businessName" = EXCLUDED."businessName",
    "marketplaceRole" = EXCLUDED."marketplaceRole",
    "isApproved" = EXCLUDED."isApproved",
    "verificationStatus" = EXCLUDED."verificationStatus",
    rating = EXCLUDED.rating,
    "salesCount" = EXCLUDED."salesCount",
    "totalSales" = EXCLUDED."totalSales",
    "deliverySuccessRate" = EXCLUDED."deliverySuccessRate",
    "paymentBehaviour" = EXCLUDED."paymentBehaviour",
    "businessAddress" = EXCLUDED."businessAddress",
    "contactPhone" = EXCLUDED."contactPhone",
    "createdAt" = EXCLUDED."createdAt";

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_seller_profiles_public_data() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_seller_profiles_public_data ON public.seller_profiles;
CREATE TRIGGER trg_sync_seller_profiles_public_data
AFTER INSERT OR UPDATE OR DELETE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION private.sync_seller_profiles_public_data();

DROP VIEW IF EXISTS public.seller_profiles_public;
CREATE VIEW public.seller_profiles_public
WITH (security_invoker = true)
AS
SELECT
  "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
  rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
  "businessAddress", "contactPhone", "createdAt"
FROM public.seller_profiles_public_data;

REVOKE ALL ON public.seller_profiles_public FROM PUBLIC;
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated, service_role;;
