-- Loadify Market: bind buyer-created returns/disputes to the authenticated
-- buyer's real order and canonical seller. This preserves the existing UI
-- lifecycle while preventing direct PostgREST writes from fabricating another
-- buyer's orderId/sellerId pair or advancing a return status as the buyer.

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "returns_insert" ON public.returns;
CREATE POLICY "returns_insert" ON public.returns
FOR INSERT
WITH CHECK (
  auth.uid() = returns."buyerId"
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = returns."orderId"
      AND o."buyerId" = auth.uid()
      AND o."sellerId" = returns."sellerId"
      AND o.status IN ('delivered', 'completed')
  )
);

DROP POLICY IF EXISTS "returns_update" ON public.returns;
CREATE POLICY "returns_update" ON public.returns
FOR UPDATE
USING (
  auth.uid() = returns."sellerId"
  OR public.is_admin()
)
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = returns."sellerId"
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = returns."orderId"
        AND o."buyerId" = returns."buyerId"
        AND o."sellerId" = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "disputes_insert" ON public.disputes;
CREATE POLICY "disputes_insert" ON public.disputes
FOR INSERT
WITH CHECK (
  auth.uid() = disputes."buyerId"
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = disputes."orderId"
      AND o."buyerId" = auth.uid()
      AND o."sellerId" = disputes."sellerId"
      AND o.status IN ('paid', 'packed', 'shipped', 'delivered')
  )
);

DROP POLICY IF EXISTS "disputes_update" ON public.disputes;
CREATE POLICY "disputes_update" ON public.disputes
FOR UPDATE
USING (
  auth.uid() = disputes."buyerId"
  OR auth.uid() = disputes."sellerId"
  OR public.is_admin()
)
WITH CHECK (
  public.is_admin()
  OR (
    (auth.uid() = disputes."buyerId" OR auth.uid() = disputes."sellerId")
    AND disputes.status NOT IN ('resolved', 'closed')
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = disputes."orderId"
        AND o."buyerId" = disputes."buyerId"
        AND o."sellerId" = disputes."sellerId"
    )
  )
);
