-- Romania / EU marketplace trader-status truth.
-- Adds an explicit self-declared legal status that is deliberately independent
-- from sellerType (individual / sole_trader / company).
-- No existing seller is backfilled or inferred.

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "traderStatus" text
    CHECK ("traderStatus" IN ('trader', 'non_trader'));

COMMENT ON COLUMN public.seller_profiles."traderStatus" IS
  'Seller self-declaration for consumer-law marketplace disclosure. Must not be inferred from sellerType.';

ALTER TABLE public.seller_profiles_public
  ADD COLUMN IF NOT EXISTS "traderStatus" text
    CHECK ("traderStatus" IN ('trader', 'non_trader'));

COMMENT ON COLUMN public.seller_profiles_public."traderStatus" IS
  'Public seller trader/non-trader disclosure copied from the explicit seller declaration.';

CREATE OR REPLACE FUNCTION private.sync_seller_profiles_public_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seller_profiles_public
     WHERE "userId" = OLD."userId";
    RETURN OLD;
  END IF;

  INSERT INTO public.seller_profiles_public (
    "userId",
    "businessName",
    "marketplaceRole",
    "isApproved",
    "verificationStatus",
    rating,
    "salesCount",
    "totalSales",
    "deliverySuccessRate",
    "paymentBehaviour",
    "businessAddress",
    "contactPhone",
    "createdAt",
    "traderStatus"
  ) VALUES (
    NEW."userId",
    NEW."businessName",
    NEW."marketplaceRole",
    NEW."isApproved",
    NEW."verificationStatus",
    NEW.rating,
    NEW."salesCount",
    NEW."totalSales",
    NEW."deliverySuccessRate",
    NEW."paymentBehaviour",
    CASE
      WHEN NEW."businessAddress" IS NULL THEN NULL
      ELSE jsonb_strip_nulls(
        jsonb_build_object(
          'city', NEW."businessAddress" ->> 'city',
          'country', NEW."businessAddress" ->> 'country'
        )
      )
    END,
    NULL::text,
    NEW."createdAt",
    NEW."traderStatus"
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
    "contactPhone" = NULL,
    "createdAt" = EXCLUDED."createdAt",
    "traderStatus" = EXCLUDED."traderStatus";

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_seller_profiles_public_data()
FROM PUBLIC, anon, authenticated, service_role;

-- Existing rows remain NULL until the seller explicitly declares status.
UPDATE public.seller_profiles_public p
SET "traderStatus" = s."traderStatus"
FROM public.seller_profiles s
WHERE p."userId" = s."userId"
  AND p."traderStatus" IS DISTINCT FROM s."traderStatus";
