CREATE OR REPLACE FUNCTION private.protect_product_platform_managed_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    NEW."sellerId" := OLD."sellerId";
    NEW.seller_id := OLD.seller_id;
    NEW."isApproved" := OLD."isApproved";
    NEW."isFeatured" := OLD."isFeatured";
    NEW."listingStatus" := OLD."listingStatus";
    NEW."reservedByOrderId" := OLD."reservedByOrderId";
    NEW."reservedUntil" := OLD."reservedUntil";
    NEW.rating := OLD.rating;
    NEW."reviewCount" := OLD."reviewCount";
    NEW.views := OLD.views;
    NEW."addToCartCount" := OLD."addToCartCount";
    NEW."shareCount" := OLD."shareCount";
    NEW."lastViewedAt" := OLD."lastViewedAt";
    NEW."createdAt" := OLD."createdAt";
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_product_platform_managed_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_product_platform_managed_fields ON public.products;
CREATE TRIGGER trg_protect_product_platform_managed_fields
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION private.protect_product_platform_managed_fields();

DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update ON public.products
FOR UPDATE TO authenticated
USING (((select auth.uid()) = "sellerId") OR (select public.is_admin()))
WITH CHECK (((select auth.uid()) = "sellerId") OR (select public.is_admin()));

DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_delete ON public.products
FOR DELETE TO authenticated
USING (((select auth.uid()) = "sellerId") OR (select public.is_admin()));

DROP POLICY IF EXISTS products_insert ON public.products;
CREATE POLICY products_insert ON public.products
FOR INSERT TO authenticated
WITH CHECK ((select public.is_admin()));;
