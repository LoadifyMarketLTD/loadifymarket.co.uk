DROP POLICY IF EXISTS rfq_requests_select ON public.rfq_requests;
CREATE POLICY rfq_requests_select ON public.rfq_requests
FOR SELECT TO authenticated
USING (
  "buyerId" = (select auth.uid())
  OR (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (select auth.uid())
        AND u.role IN ('seller','admin')
        AND u."isActive" = true
    )
  )
  OR (select public.is_admin())
);
GRANT SELECT ON public.rfq_requests TO authenticated;

DROP POLICY IF EXISTS rfq_responses_insert ON public.rfq_responses;
REVOKE INSERT, UPDATE, DELETE ON public.rfq_responses FROM anon, authenticated;
GRANT ALL ON public.rfq_responses TO service_role;

DROP POLICY IF EXISTS rfq_responses_select ON public.rfq_responses;
CREATE POLICY rfq_responses_select ON public.rfq_responses
FOR SELECT TO authenticated
USING (
  "sellerId" = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.rfq_requests r
    WHERE r.id = rfq_responses."rfqId"
      AND r."buyerId" = (select auth.uid())
  )
  OR (select public.is_admin())
);
GRANT SELECT ON public.rfq_responses TO authenticated;

CREATE OR REPLACE FUNCTION private.protect_reported_listing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    NEW."reportedBy" := auth.uid();
    NEW.status := 'pending';
    NEW."reviewedBy" := NULL;
    NEW."reviewNotes" := NULL;
    NEW."resolvedAt" := NULL;
    NEW."createdAt" := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_reported_listing_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_reported_listing_fields ON public.reported_listings;
CREATE TRIGGER trg_protect_reported_listing_fields
BEFORE INSERT ON public.reported_listings
FOR EACH ROW EXECUTE FUNCTION private.protect_reported_listing_fields();

DROP POLICY IF EXISTS reported_listings_insert ON public.reported_listings;
CREATE POLICY reported_listings_insert ON public.reported_listings
FOR INSERT TO authenticated
WITH CHECK ("reportedBy" = (select auth.uid()));

DROP POLICY IF EXISTS reported_listings_admin_select ON public.reported_listings;
CREATE POLICY reported_listings_admin_select ON public.reported_listings
FOR SELECT TO authenticated
USING ((select public.is_admin()));

DROP POLICY IF EXISTS reported_listings_admin_update ON public.reported_listings;
CREATE POLICY reported_listings_admin_update ON public.reported_listings
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

GRANT SELECT, INSERT, UPDATE ON public.reported_listings TO authenticated;
GRANT ALL ON public.reported_listings TO service_role;;
