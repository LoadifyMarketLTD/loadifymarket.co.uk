-- Marketplace Seller catalogue-size limit retirement.
--
-- Marketplace Sellers are not capped by total catalogue size. The historical
-- seller_profiles.listingLimit column is retained only for compatibility with
-- older code/views and is forced to NULL (unlimited).
--
-- This does NOT remove operational abuse protection. Request-rate limiting,
-- seller suspension/pausing, publication eligibility, tax, shipping and payment
-- gates remain independent controls.

ALTER TABLE public.seller_profiles
  ALTER COLUMN "listingLimit" DROP DEFAULT;

UPDATE public.seller_profiles
SET "listingLimit" = NULL
WHERE "listingLimit" IS NOT NULL;

COMMENT ON COLUMN public.seller_profiles."listingLimit" IS
  'Legacy compatibility field. Marketplace Sellers have no catalogue-size cap; value is forced to NULL.';

CREATE OR REPLACE FUNCTION private.force_unlimited_seller_listings_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW."listingLimit" := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_force_unlimited_seller_listings_v1
ON public.seller_profiles;

CREATE TRIGGER zz_force_unlimited_seller_listings_v1
BEFORE INSERT OR UPDATE OF "listingLimit"
ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION private.force_unlimited_seller_listings_v1();
