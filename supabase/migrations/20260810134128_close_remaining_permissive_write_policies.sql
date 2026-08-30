DROP POLICY IF EXISTS coupon_usage_insert ON public.coupon_usage;
REVOKE INSERT, UPDATE, DELETE ON public.coupon_usage FROM anon, authenticated;
GRANT ALL ON public.coupon_usage TO service_role;

DROP POLICY IF EXISTS product_analytics_insert ON public.product_analytics;
REVOKE INSERT, UPDATE, DELETE ON public.product_analytics FROM anon, authenticated;
GRANT ALL ON public.product_analytics TO service_role;

DROP POLICY IF EXISTS rfq_requests_insert ON public.rfq_requests;
REVOKE INSERT, UPDATE, DELETE ON public.rfq_requests FROM anon, authenticated;
GRANT ALL ON public.rfq_requests TO service_role;

CREATE OR REPLACE FUNCTION private.normalize_recently_viewed_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW."userId" := auth.uid();
  ELSE
    NEW."userId" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.normalize_recently_viewed_identity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_normalize_recently_viewed_identity ON public.recently_viewed;
CREATE TRIGGER trg_normalize_recently_viewed_identity
BEFORE INSERT OR UPDATE ON public.recently_viewed
FOR EACH ROW EXECUTE FUNCTION private.normalize_recently_viewed_identity();

DROP POLICY IF EXISTS recently_viewed_insert ON public.recently_viewed;
CREATE POLICY recently_viewed_insert ON public.recently_viewed
FOR INSERT TO public
WITH CHECK (
  ((select auth.role()) = 'authenticated' AND "userId" = (select auth.uid()))
  OR ((select auth.role()) = 'anon' AND "userId" IS NULL AND "sessionId" IS NOT NULL)
);

DROP POLICY IF EXISTS recently_viewed_delete ON public.recently_viewed;
CREATE POLICY recently_viewed_delete ON public.recently_viewed
FOR DELETE TO authenticated
USING ("userId" = (select auth.uid()));;
