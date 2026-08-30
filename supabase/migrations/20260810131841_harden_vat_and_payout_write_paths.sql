CREATE OR REPLACE FUNCTION private.protect_buyer_vat_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."isVatVerified" := false;
    ELSE
      NEW."isVatVerified" := OLD."isVatVerified";
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_buyer_vat_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_buyer_vat_verification ON public.buyer_profiles;
CREATE TRIGGER trg_protect_buyer_vat_verification
BEFORE INSERT OR UPDATE OF "isVatVerified" ON public.buyer_profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_buyer_vat_verification();

DROP POLICY IF EXISTS buyer_profiles_all ON public.buyer_profiles;
CREATE POLICY buyer_profiles_all ON public.buyer_profiles
FOR ALL TO public
USING (((select auth.uid()) = "userId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "userId") OR (select public.is_admin()));

DROP POLICY IF EXISTS payout_requests_seller_insert ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_select ON public.payout_requests;
CREATE POLICY payout_requests_select ON public.payout_requests
FOR SELECT TO authenticated
USING (((select auth.uid()) = "sellerId") OR (select public.is_admin()));

DROP POLICY IF EXISTS payout_requests_admin_update ON public.payout_requests;
CREATE POLICY payout_requests_admin_update ON public.payout_requests
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

REVOKE INSERT ON public.payout_requests FROM anon, authenticated;
GRANT SELECT ON public.payout_requests TO authenticated;
GRANT UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;

DROP POLICY IF EXISTS payouts_admin_manage ON public.payouts;
DROP POLICY IF EXISTS payouts_seller_select ON public.payouts;
CREATE POLICY payouts_seller_or_admin_select ON public.payouts
FOR SELECT TO authenticated
USING (((select auth.uid()) = "sellerId") OR (select public.is_admin()));
CREATE POLICY payouts_admin_insert ON public.payouts
FOR INSERT TO authenticated
WITH CHECK ((select public.is_admin()));
CREATE POLICY payouts_admin_update ON public.payouts
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));
CREATE POLICY payouts_admin_delete ON public.payouts
FOR DELETE TO authenticated
USING ((select public.is_admin()));

DROP POLICY IF EXISTS seller_balance_admin_write ON public.seller_balance;
DROP POLICY IF EXISTS seller_balance_select ON public.seller_balance;
CREATE POLICY seller_balance_seller_or_admin_select ON public.seller_balance
FOR SELECT TO authenticated
USING (((select auth.uid()) = "sellerId") OR (select public.is_admin()));
CREATE POLICY seller_balance_admin_insert ON public.seller_balance
FOR INSERT TO authenticated
WITH CHECK ((select public.is_admin()));
CREATE POLICY seller_balance_admin_update ON public.seller_balance
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));
CREATE POLICY seller_balance_admin_delete ON public.seller_balance
FOR DELETE TO authenticated
USING ((select public.is_admin()));

DROP POLICY IF EXISTS platform_settings_manage ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;
CREATE POLICY platform_settings_select ON public.platform_settings
FOR SELECT TO public
USING (true);
CREATE POLICY platform_settings_admin_insert ON public.platform_settings
FOR INSERT TO authenticated
WITH CHECK ((select public.is_admin()));
CREATE POLICY platform_settings_admin_update ON public.platform_settings
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));
CREATE POLICY platform_settings_admin_delete ON public.platform_settings
FOR DELETE TO authenticated
USING ((select public.is_admin()));;
