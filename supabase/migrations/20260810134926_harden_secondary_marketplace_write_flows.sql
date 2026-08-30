CREATE OR REPLACE FUNCTION private.protect_coupon_seller_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    NEW."createdBy" := auth.uid();
    NEW."sellerId" := auth.uid();
    NEW."usedCount" := 0;
    NEW."createdAt" := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_coupon_seller_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_coupon_seller_fields ON public.coupons;
CREATE TRIGGER trg_protect_coupon_seller_fields BEFORE INSERT ON public.coupons
FOR EACH ROW EXECUTE FUNCTION private.protect_coupon_seller_fields();

DROP POLICY IF EXISTS coupons_insert ON public.coupons;
CREATE POLICY coupons_insert ON public.coupons
FOR INSERT TO authenticated
WITH CHECK (
  ("sellerId" = (select auth.uid()) AND "createdBy" = (select auth.uid()) AND (select public.is_seller()))
  OR (select public.is_admin())
);
DROP POLICY IF EXISTS coupons_select_owner_admin ON public.coupons;
CREATE POLICY coupons_select_owner_admin ON public.coupons
FOR SELECT TO authenticated
USING ("sellerId" = (select auth.uid()) OR (select public.is_admin()));
GRANT SELECT, INSERT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

CREATE OR REPLACE FUNCTION private.protect_promoted_listing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = NEW."productId" AND p."sellerId" = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Promotion requires ownership of the product';
    END IF;
    NEW."sellerId" := auth.uid();
    NEW."totalSpend" := 0;
    NEW.status := 'pending';
    NEW.impressions := 0;
    NEW.clicks := 0;
    NEW.conversions := 0;
    NEW."approvedBy" := NULL;
    NEW."approvedAt" := NULL;
    NEW."rejectionReason" := NULL;
    NEW."createdAt" := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_promoted_listing_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_promoted_listing_fields ON public.promoted_listings;
CREATE TRIGGER trg_protect_promoted_listing_fields BEFORE INSERT ON public.promoted_listings
FOR EACH ROW EXECUTE FUNCTION private.protect_promoted_listing_fields();

DROP POLICY IF EXISTS promoted_listings_insert ON public.promoted_listings;
CREATE POLICY promoted_listings_insert ON public.promoted_listings
FOR INSERT TO authenticated
WITH CHECK ("sellerId" = (select auth.uid()) OR (select public.is_admin()));
DROP POLICY IF EXISTS promoted_listings_select ON public.promoted_listings;
CREATE POLICY promoted_listings_select ON public.promoted_listings
FOR SELECT TO authenticated
USING ("sellerId" = (select auth.uid()) OR (select public.is_admin()));
DROP POLICY IF EXISTS promoted_listings_admin_update ON public.promoted_listings;
CREATE POLICY promoted_listings_admin_update ON public.promoted_listings
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));
GRANT SELECT, INSERT, UPDATE ON public.promoted_listings TO authenticated;
GRANT ALL ON public.promoted_listings TO service_role;

CREATE OR REPLACE FUNCTION private.protect_product_question_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_name text;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    SELECT trim(concat_ws(' ', u."firstName", u."lastName")) INTO v_name
    FROM public.users u WHERE u.id = auth.uid();
    NEW."userId" := auth.uid();
    NEW."userName" := COALESCE(NULLIF(v_name,''), 'Loadify User');
    NEW.answer := NULL;
    NEW."answerUserId" := NULL;
    NEW."answerUserName" := NULL;
    NEW.upvotes := 0;
    NEW."isAnswered" := false;
    NEW."answeredAt" := NULL;
    NEW."createdAt" := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_product_question_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_product_question_fields ON public.product_questions;
CREATE TRIGGER trg_protect_product_question_fields BEFORE INSERT ON public.product_questions
FOR EACH ROW EXECUTE FUNCTION private.protect_product_question_fields();
DROP POLICY IF EXISTS product_questions_insert ON public.product_questions;
CREATE POLICY product_questions_insert ON public.product_questions
FOR INSERT TO authenticated
WITH CHECK ("userId" = (select auth.uid()));
GRANT SELECT ON public.product_questions TO anon, authenticated;
GRANT INSERT ON public.product_questions TO authenticated;
GRANT ALL ON public.product_questions TO service_role;

CREATE OR REPLACE FUNCTION private.protect_seller_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    NEW."sellerId" := auth.uid();
    NEW.status := 'pending';
    NEW."reviewedBy" := NULL;
    NEW."reviewedAt" := NULL;
    NEW."rejectionReason" := NULL;
    NEW."uploadedAt" := now();
    NEW."createdAt" := now();
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_seller_verification_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_seller_verification_fields ON public.seller_verifications;
CREATE TRIGGER trg_protect_seller_verification_fields BEFORE INSERT ON public.seller_verifications
FOR EACH ROW EXECUTE FUNCTION private.protect_seller_verification_fields();
DROP POLICY IF EXISTS seller_verifications_insert ON public.seller_verifications;
CREATE POLICY seller_verifications_insert ON public.seller_verifications
FOR INSERT TO authenticated
WITH CHECK ("sellerId" = (select auth.uid()) OR (select public.is_admin()));
DROP POLICY IF EXISTS seller_verifications_select ON public.seller_verifications;
CREATE POLICY seller_verifications_select ON public.seller_verifications
FOR SELECT TO authenticated
USING ("sellerId" = (select auth.uid()) OR (select public.is_admin()));
DROP POLICY IF EXISTS seller_verifications_update ON public.seller_verifications;
CREATE POLICY seller_verifications_update ON public.seller_verifications
FOR UPDATE TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));
GRANT SELECT, INSERT, UPDATE ON public.seller_verifications TO authenticated;
GRANT ALL ON public.seller_verifications TO service_role;;
