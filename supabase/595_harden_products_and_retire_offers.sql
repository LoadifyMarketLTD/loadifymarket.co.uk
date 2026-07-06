-- 595_harden_products_and_retire_offers.sql
-- Pre-live hardening:
-- 1. Product writes must go through Netlify service-role functions.
-- 2. The old offer/accept/decline/counter engine is retired for fixed-price sales.

DO $$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE NOTICE 'public.products does not exist in this database. Check that you are running this on the correct Supabase project/schema.';
  ELSE
    -- Products: keep public/seller reads as-is, but stop seller direct INSERT/UPDATE.
    -- create-product.ts and update-product.ts use the service role and remain the
    -- authoritative write path. Admins can still moderate products directly.
    DROP POLICY IF EXISTS "products_insert" ON public.products;
    DROP POLICY IF EXISTS "products_update" ON public.products;
    DROP POLICY IF EXISTS "products_delete" ON public.products;

    CREATE POLICY "products_insert" ON public.products
      FOR INSERT
      WITH CHECK (public.is_admin());

    CREATE POLICY "products_update" ON public.products
      FOR UPDATE
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    CREATE POLICY "products_delete" ON public.products
      FOR DELETE
      USING ((SELECT auth.uid()) = "sellerId" OR public.is_admin());

    COMMENT ON POLICY "products_insert" ON public.products IS
      'Seller inserts are intentionally blocked; use /.netlify/functions/create-product.';
    COMMENT ON POLICY "products_update" ON public.products IS
      'Seller updates are intentionally blocked; use /.netlify/functions/update-product.';
  END IF;

  IF to_regclass('public.offers') IS NULL THEN
    RAISE NOTICE 'public.offers does not exist; offer retirement skipped.';
  ELSE
    -- Offers: remove the public/authenticated surface now that the marketplace
    -- uses fixed seller prices. Tables may remain temporarily for historical
    -- cleanup, but no authenticated client can read/insert offers through RLS.
    DROP POLICY IF EXISTS "offers_select_participant" ON public.offers;
    DROP POLICY IF EXISTS "offers_insert_buyer" ON public.offers;

    REVOKE ALL ON TABLE public.offers FROM anon, authenticated;
  END IF;

  DROP FUNCTION IF EXISTS public.accept_offer(UUID, UUID);
  DROP FUNCTION IF EXISTS public.decline_offer(UUID, UUID);
  DROP FUNCTION IF EXISTS public.counter_offer(UUID, UUID, INTEGER);

  RAISE NOTICE '595_harden_products_and_retire_offers completed.';
END $$;
