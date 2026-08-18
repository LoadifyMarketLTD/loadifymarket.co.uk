-- Loadify Market: protect review moderation/engagement fields while preserving
-- the two legitimate direct client mutations used by the current UI:
--   1) any authenticated user may append their own helpful vote once;
--   2) the seller of the reviewed product may write sellerResponse.
-- All other non-admin UPDATE attempts are rejected by the trigger.

CREATE OR REPLACE FUNCTION public.guard_review_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_product_seller BOOLEAN := FALSE;
  v_old_core JSONB;
  v_new_core JSONB;
BEGIN
  -- Service-role/server writes do not carry an end-user auth.uid(). Admin
  -- moderation remains authoritative and may update platform-managed fields.
  IF v_uid IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = OLD."productId"
      AND p."sellerId" = v_uid
  ) INTO v_is_product_seller;

  -- Ignore updatedAt because the existing timestamp trigger owns that column.
  v_old_core := to_jsonb(OLD) - 'updatedAt';
  v_new_core := to_jsonb(NEW) - 'updatedAt';

  -- Helpful voting: only published reviews may receive votes. The caller may
  -- append their own UUID exactly once and increment helpfulCount by one. No
  -- review content/moderation field may change in the same statement.
  IF
    OLD.status = 'published'
    AND v_new_core - ARRAY['helpfulCount', 'helpfulVoters']::TEXT[]
      = v_old_core - ARRAY['helpfulCount', 'helpfulVoters']::TEXT[]
    AND NOT (v_uid = ANY(COALESCE(OLD."helpfulVoters", '{}'::UUID[])))
    AND NEW."helpfulCount" = OLD."helpfulCount" + 1
    AND NEW."helpfulVoters" = array_append(COALESCE(OLD."helpfulVoters", '{}'::UUID[]), v_uid)
  THEN
    RETURN NEW;
  END IF;

  -- Seller response: a seller may only change sellerResponse and the associated
  -- response timestamp on reviews for that seller's own product.
  IF
    v_is_product_seller
    AND v_new_core - ARRAY['sellerResponse', 'sellerRespondedAt']::TEXT[]
      = v_old_core - ARRAY['sellerResponse', 'sellerRespondedAt']::TEXT[]
  THEN
    NEW."sellerRespondedAt" := NOW();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Review fields are platform-managed or not editable by this user.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_guard_mutation ON public.reviews;
CREATE TRIGGER trg_reviews_guard_mutation
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_review_mutation();

-- Let authenticated callers reach the guard. The trigger is the field-level
-- authority; unauthenticated users still cannot UPDATE because auth.uid() is NULL.
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;
CREATE POLICY "reviews_update" ON public.reviews
FOR UPDATE
USING (auth.uid() IS NOT NULL OR public.is_admin())
WITH CHECK (auth.uid() IS NOT NULL OR public.is_admin());

-- A verified review must start with canonical platform-managed values. The
-- verified-purchase ownership/product/order checks remain the primary gate.
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
CREATE POLICY "reviews_insert" ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviews."userId"
  AND reviews."isVerifiedPurchase" = TRUE
  AND reviews.status = 'published'
  AND reviews."isAbusive" = FALSE
  AND reviews."adminNote" IS NULL
  AND reviews."helpfulCount" = 0
  AND COALESCE(cardinality(reviews."helpfulVoters"), 0) = 0
  AND reviews."sellerResponse" IS NULL
  AND reviews."sellerRespondedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi."orderId" = o.id
    WHERE o.id = reviews."orderId"
      AND o."buyerId" = auth.uid()
      AND o.status IN ('delivered', 'completed')
      AND oi."productId" = reviews."productId"
  )
);
