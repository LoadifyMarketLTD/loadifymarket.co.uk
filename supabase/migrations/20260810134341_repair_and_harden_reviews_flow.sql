CREATE OR REPLACE FUNCTION public.is_valid_review_purchase(p_order_id uuid, p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o."buyerId" = auth.uid()
      AND o.status IN ('delivered','completed')
      AND (
        o."productId" = p_product_id
        OR EXISTS (
          SELECT 1
          FROM public.order_items oi
          WHERE oi."orderId" = o.id
            AND oi."productId" = p_product_id
        )
      )
  );
$function$;
REVOKE ALL ON FUNCTION public.is_valid_review_purchase(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_review_purchase(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.protect_review_client_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_is_product_seller boolean := false;
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT public.is_valid_review_purchase(NEW."orderId", NEW."productId") THEN
        RAISE EXCEPTION 'Review requires a delivered/completed purchase of this product';
      END IF;
      NEW."userId" := auth.uid();
      NEW."isVerifiedPurchase" := true;
      NEW.status := 'published';
      NEW."sellerResponse" := NULL;
      NEW."sellerRespondedAt" := NULL;
      NEW."isAbusive" := false;
      NEW."adminNote" := NULL;
      NEW."helpfulCount" := 0;
      NEW."helpfulVoters" := ARRAY[]::uuid[];
      NEW."createdAt" := now();
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = OLD."productId"
        AND p."sellerId" = auth.uid()
    ) INTO v_is_product_seller;

    NEW."productId" := OLD."productId";
    NEW."userId" := OLD."userId";
    NEW."orderId" := OLD."orderId";
    NEW.rating := OLD.rating;
    NEW."sellerRating" := OLD."sellerRating";
    NEW.title := OLD.title;
    NEW.comment := OLD.comment;
    NEW.images := OLD.images;
    NEW."videoUrl" := OLD."videoUrl";
    NEW."isVerifiedPurchase" := OLD."isVerifiedPurchase";
    NEW.status := OLD.status;
    NEW."isAbusive" := OLD."isAbusive";
    NEW."adminNote" := OLD."adminNote";
    NEW."createdAt" := OLD."createdAt";

    IF v_is_product_seller AND NEW."sellerResponse" IS DISTINCT FROM OLD."sellerResponse" THEN
      NEW."sellerRespondedAt" := now();
      NEW."helpfulCount" := OLD."helpfulCount";
      NEW."helpfulVoters" := OLD."helpfulVoters";
      RETURN NEW;
    END IF;

    NEW."sellerResponse" := OLD."sellerResponse";
    NEW."sellerRespondedAt" := OLD."sellerRespondedAt";

    IF auth.uid() = OLD."userId" THEN
      RAISE EXCEPTION 'You cannot mark your own review as helpful';
    END IF;
    IF auth.uid() = ANY(COALESCE(OLD."helpfulVoters", ARRAY[]::uuid[])) THEN
      RAISE EXCEPTION 'Review already marked helpful by this user';
    END IF;

    NEW."helpfulVoters" := array_append(COALESCE(OLD."helpfulVoters", ARRAY[]::uuid[]), auth.uid());
    NEW."helpfulCount" := cardinality(NEW."helpfulVoters");
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.protect_review_client_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_review_client_fields ON public.reviews;
CREATE TRIGGER trg_protect_review_client_fields
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION private.protect_review_client_fields();

DROP POLICY IF EXISTS reviews_insert ON public.reviews;
CREATE POLICY reviews_insert ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
  "userId" = (select auth.uid())
  AND public.is_valid_review_purchase("orderId", "productId")
);

DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews
FOR SELECT TO public
USING (
  status = 'published'
  OR "userId" = (select auth.uid())
  OR public.owns_product("productId")
  OR (select public.is_admin())
);

DROP POLICY IF EXISTS reviews_update ON public.reviews;
CREATE POLICY reviews_update ON public.reviews
FOR UPDATE TO authenticated
USING (
  status = 'published'
  OR public.owns_product("productId")
  OR (select public.is_admin())
)
WITH CHECK (
  status = 'published'
  OR public.owns_product("productId")
  OR (select public.is_admin())
);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;;
