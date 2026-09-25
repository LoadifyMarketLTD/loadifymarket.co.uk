-- Public seller projection becomes market-aware without exposing new private
-- seller data. Only declared selling market codes are projected publicly.

ALTER TABLE public.seller_profiles_public
  ADD COLUMN IF NOT EXISTS "marketCodes" text[] NOT NULL DEFAULT ARRAY['GB']::text[];

ALTER TABLE public.seller_profiles_public
  DROP CONSTRAINT IF EXISTS seller_profiles_public_market_codes_check,
  ADD CONSTRAINT seller_profiles_public_market_codes_check CHECK (
    "marketCodes" <@ ARRAY['GB','RO']::text[]
    AND cardinality("marketCodes")>0
  );

CREATE INDEX IF NOT EXISTS seller_profiles_public_market_codes_gin_idx
  ON public.seller_profiles_public USING gin ("marketCodes");

UPDATE public.seller_profiles_public p
SET "marketCodes"=COALESCE(
  (
    SELECT s."marketCodes"
    FROM public.seller_profiles s
    WHERE s."userId"=p."userId"
  ),
  ARRAY['GB']::text[]
);

CREATE OR REPLACE FUNCTION private.sync_seller_profiles_public_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.seller_profiles_public
    WHERE "userId"=OLD."userId";
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
    "marketCodes"
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
          'city',NEW."businessAddress"->>'city',
          'country',NEW."businessAddress"->>'country'
        )
      )
    END,
    NULL::text,
    NEW."createdAt",
    COALESCE(NEW."marketCodes",ARRAY['GB']::text[])
  )
  ON CONFLICT ("userId") DO UPDATE SET
    "businessName"=EXCLUDED."businessName",
    "marketplaceRole"=EXCLUDED."marketplaceRole",
    "isApproved"=EXCLUDED."isApproved",
    "verificationStatus"=EXCLUDED."verificationStatus",
    rating=EXCLUDED.rating,
    "salesCount"=EXCLUDED."salesCount",
    "totalSales"=EXCLUDED."totalSales",
    "deliverySuccessRate"=EXCLUDED."deliverySuccessRate",
    "paymentBehaviour"=EXCLUDED."paymentBehaviour",
    "businessAddress"=EXCLUDED."businessAddress",
    "contactPhone"=NULL,
    "createdAt"=EXCLUDED."createdAt",
    "marketCodes"=EXCLUDED."marketCodes";

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_seller_profiles_public_data()
  FROM PUBLIC,anon,authenticated,service_role;

COMMENT ON COLUMN public.seller_profiles_public."marketCodes" IS
  'Public selling-market capability used for market-aware storefront discovery. Contains only GB/RO market codes.';
