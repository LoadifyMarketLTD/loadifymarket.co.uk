-- Keep the public seller-profile API shape while ensuring the backing cache is
-- not directly reachable through the exposed public schema.

CREATE TABLE IF NOT EXISTS private.seller_profiles_public_data (
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
  "createdAt" timestamptz
);

ALTER TABLE private.seller_profiles_public_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.seller_profiles_public_data FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO private.seller_profiles_public_data (
  "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
  rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
  "businessAddress", "createdAt"
)
SELECT
  sp."userId", sp."businessName", sp."marketplaceRole", sp."isApproved", sp."verificationStatus",
  sp.rating, sp."salesCount", sp."totalSales", sp."deliverySuccessRate", sp."paymentBehaviour",
  CASE
    WHEN sp."businessAddress" IS NULL THEN NULL
    ELSE jsonb_strip_nulls(jsonb_build_object('city', sp."businessAddress" ->> 'city', 'country', sp."businessAddress" ->> 'country'))
  END,
  sp."createdAt"
FROM public.seller_profiles sp
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
  "createdAt" = EXCLUDED."createdAt";

CREATE OR REPLACE FUNCTION private.sync_seller_profiles_public_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM private.seller_profiles_public_data WHERE "userId" = OLD."userId";
    RETURN OLD;
  END IF;

  INSERT INTO private.seller_profiles_public_data (
    "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
    rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
    "businessAddress", "createdAt"
  ) VALUES (
    NEW."userId", NEW."businessName", NEW."marketplaceRole", NEW."isApproved", NEW."verificationStatus",
    NEW.rating, NEW."salesCount", NEW."totalSales", NEW."deliverySuccessRate", NEW."paymentBehaviour",
    CASE
      WHEN NEW."businessAddress" IS NULL THEN NULL
      ELSE jsonb_strip_nulls(jsonb_build_object('city', NEW."businessAddress" ->> 'city', 'country', NEW."businessAddress" ->> 'country'))
    END,
    NEW."createdAt"
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
    "createdAt" = EXCLUDED."createdAt";

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_seller_profiles_public_data() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_sync_seller_profiles_public_data ON public.seller_profiles;
CREATE TRIGGER trg_sync_seller_profiles_public_data
AFTER INSERT OR UPDATE OR DELETE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.sync_seller_profiles_public_data();

CREATE OR REPLACE VIEW public.seller_profiles_public AS
SELECT
  "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
  rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
  "businessAddress", NULL::text AS "contactPhone", "createdAt"
FROM private.seller_profiles_public_data;

REVOKE ALL ON public.seller_profiles_public FROM PUBLIC;
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated, service_role;

DROP TABLE IF EXISTS public.seller_profiles_public_data;;
