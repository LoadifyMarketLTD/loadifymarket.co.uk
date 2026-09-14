-- Buyer cancellation requests before seller packing.
-- A request does not mutate payment/order truth; an authorised refund workflow
-- must complete the cancellation and reconcile Stripe, stock and settlement.
CREATE TABLE IF NOT EXISTS public.order_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "buyerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "sellerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('accidental_purchase','duplicate_order','wrong_delivery_details','other')),
  details text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','refunded','cancelled')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_cancellation_details_length CHECK (details IS NULL OR char_length(details) <= 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_cancellation_one_open_per_order
  ON public.order_cancellation_requests ("orderId")
  WHERE status = 'requested';
CREATE INDEX IF NOT EXISTS order_cancellation_buyer_created
  ON public.order_cancellation_requests ("buyerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS order_cancellation_seller_created
  ON public.order_cancellation_requests ("sellerId", "createdAt" DESC);

ALTER TABLE public.order_cancellation_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_cancellation_select_participants ON public.order_cancellation_requests;
CREATE POLICY order_cancellation_select_participants ON public.order_cancellation_requests
FOR SELECT TO authenticated
USING (
  "buyerId" = (SELECT auth.uid())
  OR "sellerId" = (SELECT auth.uid())
  OR (SELECT public.is_admin())
);

REVOKE INSERT, UPDATE, DELETE ON public.order_cancellation_requests FROM anon, authenticated;
GRANT SELECT ON public.order_cancellation_requests TO authenticated;
GRANT ALL ON public.order_cancellation_requests TO service_role;

COMMENT ON TABLE public.order_cancellation_requests IS
  'Buyer requests to cancel a paid order before packing. No row itself authorises a Stripe refund or order-status mutation.';
