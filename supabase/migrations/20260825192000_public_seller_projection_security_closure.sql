-- 673_public_seller_projection_security_closure.sql
-- Release-hardening closure for the public seller-profile projection.
--
-- Goals:
--   1. remove the Security Advisor ERROR caused by the owner-rights
--      public.seller_profiles_public view;
--   2. preserve the exact public API relation name and curated data shape;
--   3. keep raw public.seller_profiles private to its owner/admin RLS contract;
--   4. keep anon/authenticated clients read-only;
--   5. remove the now-unnecessary private cache and its no-policy advisor noise;
--   6. revoke direct RPC execution of the trigger-only seller suspension helper.
--
-- This migration does NOT broaden Supplier Commerce access and does NOT alter
-- Seller Workspace/Admin visuals or seller lifecycle semantics.

DO $$
BEGIN
  IF to_regclass('public.seller_profiles_public') IS NULL THEN
    RAISE EXCEPTION 'seller_profiles_public relation is required before security closure';
  END IF;

  IF to_regclass('private.seller_profiles_public_data') IS NULL THEN
    RAISE EXCEPTION 'private seller public-profile cache is required before security closure';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'seller_profiles_public'
      AND c.relkind = 'v'
  ) THEN
    RAISE EXCEPTION 'seller_profiles_public must still be the legacy view before conversion';
  END IF;
END;
$$;

-- Replace the owner-rights view with a real read-only public projection table.
-- The table contains only fields already intentionally published by migrations
-- 594/598/602; no phone number or full business address is introduced.
DROP VIEW public.seller_profiles_public;

CREATE TABLE public.seller_profiles_public (
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
  "createdAt" timestamptz,
  CONSTRAINT seller_profiles_public_phone_must_remain_null
    CHECK ("contactPhone" IS NULL)
);

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
  "createdAt"
)
SELECT
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
  NULL::text,
  "createdAt"
FROM private.seller_profiles_public_data;

ALTER TABLE public.seller_profiles_public ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.seller_profiles_public
FROM PUBLIC, anon, authenticated, service_role;

CREATE POLICY seller_profiles_public_read
ON public.seller_profiles_public
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON TABLE public.seller_profiles_public
TO anon, authenticated, service_role;

COMMENT ON TABLE public.seller_profiles_public IS
  'Read-only public seller projection. Synced server-side from seller_profiles; contains only intentionally public fields.';
COMMENT ON COLUMN public.seller_profiles_public."businessAddress" IS
  'Public coarse location only (city/country), never the full seller business address.';
COMMENT ON COLUMN public.seller_profiles_public."contactPhone" IS
  'Compatibility column intentionally constrained to NULL; seller phone numbers are not public.';

-- Keep the existing trigger identity but point it at the new read-only public
-- projection. The function remains private and cannot be called by API roles.
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
    "createdAt"
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
    "contactPhone" = NULL,
    "createdAt" = EXCLUDED."createdAt";

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_seller_profiles_public_data()
FROM PUBLIC, anon, authenticated, service_role;

-- The private cache no longer serves any runtime purpose once the public
-- projection table is read-only, RLS-protected and maintained by the trigger.
DROP TABLE private.seller_profiles_public_data;

-- This is a trigger-only helper. Direct PostgREST RPC execution is unnecessary
-- and was reported by the Security Advisor for both anonymous and signed-in
-- users. Trigger execution is unaffected by revoking API-role EXECUTE grants.
REVOKE ALL ON FUNCTION public.sync_seller_suspension_from_user_activity()
FROM PUBLIC, anon, authenticated, service_role;

-- Fail closed if the projection became writable or lost its public read path.
DO $$
DECLARE
  v_rls boolean;
BEGIN
  SELECT c.relrowsecurity
    INTO v_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'seller_profiles_public'
     AND c.relkind = 'r';

  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'seller_profiles_public must be a real table with RLS enabled';
  END IF;

  IF NOT has_table_privilege('anon', 'public.seller_profiles_public', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.seller_profiles_public', 'SELECT') THEN
    RAISE EXCEPTION 'seller_profiles_public public SELECT contract is missing';
  END IF;

  IF has_table_privilege('anon', 'public.seller_profiles_public', 'INSERT')
     OR has_table_privilege('anon', 'public.seller_profiles_public', 'UPDATE')
     OR has_table_privilege('anon', 'public.seller_profiles_public', 'DELETE')
     OR has_table_privilege('authenticated', 'public.seller_profiles_public', 'INSERT')
     OR has_table_privilege('authenticated', 'public.seller_profiles_public', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.seller_profiles_public', 'DELETE') THEN
    RAISE EXCEPTION 'seller_profiles_public must remain read-only for API roles';
  END IF;

  IF has_function_privilege('anon', 'public.sync_seller_suspension_from_user_activity()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.sync_seller_suspension_from_user_activity()', 'EXECUTE') THEN
    RAISE EXCEPTION 'trigger-only seller suspension helper is still API-executable';
  END IF;

  IF to_regclass('private.seller_profiles_public_data') IS NOT NULL THEN
    RAISE EXCEPTION 'obsolete private seller public-profile cache still exists';
  END IF;
END;
$$;
