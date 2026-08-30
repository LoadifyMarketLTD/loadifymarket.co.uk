-- 594_pre_live_security_hardening.sql
-- Final pre-live hardening for payout RPCs, reservation cleanup, public seller
-- profile privacy, and storage ownership boundaries.

CREATE OR REPLACE FUNCTION public.approve_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'approve_payout: admin access required';
  END IF;
  UPDATE public.payout_requests
     SET status = 'approved', "reviewedBy" = auth.uid(), "reviewedAt" = NOW()
   WHERE id = p_request_id AND status = 'requested';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_payout: request % not found or not in requested state', p_request_id;
  END IF;
  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
  VALUES (auth.uid(), 'approve_payout', 'payout_requests', p_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payout(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seller_id uuid;
  v_amount numeric(12,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'complete_payout: admin access required';
  END IF;
  SELECT "sellerId", amount INTO v_seller_id, v_amount
    FROM public.payout_requests
   WHERE id = p_request_id AND status = 'approved'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'complete_payout: request % not found or not in approved state', p_request_id;
  END IF;
  UPDATE public.payout_requests SET status = 'paid', "paidAt" = NOW() WHERE id = p_request_id;
  UPDATE public.seller_balance
     SET "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0), "updatedAt" = NOW()
   WHERE "sellerId" = v_seller_id;
  INSERT INTO public.payouts ("sellerId", amount, status, "paidAt")
  VALUES (v_seller_id, v_amount, 'paid', NOW());
  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
  VALUES (auth.uid(), 'complete_payout', 'payout_requests', p_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payout(p_request_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seller_id uuid;
  v_amount numeric(12,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'reject_payout: admin access required';
  END IF;
  SELECT "sellerId", amount INTO v_seller_id, v_amount
    FROM public.payout_requests
   WHERE id = p_request_id AND status IN ('requested', 'approved')
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reject_payout: request % not found or already processed', p_request_id;
  END IF;
  UPDATE public.payout_requests
     SET status = 'rejected', notes = COALESCE(p_notes, notes), "reviewedBy" = auth.uid(), "reviewedAt" = NOW()
   WHERE id = p_request_id;
  UPDATE public.seller_balance
     SET "availableAmount" = "availableAmount" + v_amount,
         "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
         "updatedAt" = NOW()
   WHERE "sellerId" = v_seller_id;
  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId", "newData")
  VALUES (auth.uid(), 'reject_payout', 'payout_requests', p_request_id, jsonb_build_object('notes', p_notes));
END;
$$;

CREATE OR REPLACE FUNCTION public.request_payout(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seller_id uuid := auth.uid();
  v_available numeric(12,2);
  v_request_id uuid;
  v_connect_status text;
BEGIN
  IF v_seller_id IS NULL THEN RAISE EXCEPTION 'request_payout: caller is not authenticated'; END IF;
  IF NOT public.is_seller() THEN RAISE EXCEPTION 'request_payout: seller account required'; END IF;
  SELECT "stripeConnectStatus" INTO v_connect_status FROM public.seller_profiles WHERE "userId" = v_seller_id;
  IF v_connect_status = 'active' THEN
    RAISE EXCEPTION 'request_payout: manual payouts are disabled while Stripe Connect automatic payouts are active';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'request_payout: amount must be greater than zero'; END IF;
  SELECT "availableAmount" INTO v_available FROM public.seller_balance WHERE "sellerId" = v_seller_id FOR UPDATE;
  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance — available: %, requested: %', COALESCE(v_available, 0), p_amount;
  END IF;
  INSERT INTO public.payout_requests ("sellerId", amount, status)
  VALUES (v_seller_id, p_amount, 'requested') RETURNING id INTO v_request_id;
  UPDATE public.seller_balance
     SET "availableAmount" = "availableAmount" - p_amount,
         "pendingAmount" = "pendingAmount" + p_amount,
         "updatedAt" = NOW()
   WHERE "sellerId" = v_seller_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_seller_balance(p_seller_id uuid, p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order_seller uuid;
  v_subtotal numeric(12,2);
  v_commission numeric(12,2);
  v_net numeric(12,2);
  v_connect_status text;
BEGIN
  SELECT "sellerId", subtotal, commission INTO v_order_seller, v_subtotal, v_commission
    FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'credit_seller_balance: order % not found', p_order_id; END IF;
  IF v_order_seller IS DISTINCT FROM p_seller_id THEN
    RAISE EXCEPTION 'credit_seller_balance: seller does not own order %', p_order_id;
  END IF;
  SELECT "stripeConnectStatus" INTO v_connect_status FROM public.seller_profiles WHERE "userId" = p_seller_id;
  IF v_connect_status = 'active' THEN RETURN; END IF;
  v_net := COALESCE(v_subtotal, 0) - COALESCE(v_commission, 0);
  IF v_net < 0 THEN v_net := 0; END IF;
  INSERT INTO public.seller_balance ("sellerId", "availableAmount", "totalEarned", "updatedAt")
  VALUES (p_seller_id, v_net, v_net, NOW())
  ON CONFLICT ("sellerId") DO UPDATE
     SET "availableAmount" = public.seller_balance."availableAmount" + EXCLUDED."availableAmount",
         "totalEarned" = public.seller_balance."totalEarned" + EXCLUDED."totalEarned",
         "updatedAt" = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_table_name text DEFAULT NULL, p_record_id uuid DEFAULT NULL, p_old_data jsonb DEFAULT NULL, p_new_data jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId", "oldData", "newData")
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payout(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_payout(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_payout(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_payout(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.credit_seller_balance(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payout(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_payout(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_payout(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.credit_seller_balance(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE released_count integer;
BEGIN
  UPDATE public.products
     SET "listingStatus" = 'active', "reservedUntil" = NULL
   WHERE "listingStatus" = 'reserved' AND "reservedUntil" IS NOT NULL AND "reservedUntil" < NOW();
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;
REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

CREATE OR REPLACE VIEW public.seller_profiles_public AS
SELECT
  "userId", "businessName", "marketplaceRole", "isApproved", "verificationStatus",
  rating, "salesCount", "totalSales", "deliverySuccessRate", "paymentBehaviour",
  CASE
    WHEN "businessAddress" IS NULL THEN NULL
    ELSE jsonb_strip_nulls(jsonb_build_object('city', "businessAddress" ->> 'city', 'country', "businessAddress" ->> 'country'))
  END AS "businessAddress",
  NULL::text AS "contactPhone",
  "createdAt"
FROM public.seller_profiles_public_data;
REVOKE ALL ON public.seller_profiles_public FROM PUBLIC;
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS product_images_seller_insert ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
CREATE POLICY product_images_seller_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    public.is_admin()
    OR (
      public.is_seller()
      AND (storage.foldername(name))[1] = 'sellers'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    )
  )
);

DROP POLICY IF EXISTS pod_select ON storage.objects;
CREATE POLICY pod_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proof-of-delivery'
  AND EXISTS (
    SELECT 1 FROM public.shipments s
     WHERE s.id::text = (storage.foldername(name))[1]
       AND ((SELECT auth.uid()) = s.seller_id OR (SELECT auth.uid()) = s.buyer_id OR public.is_admin())
  )
);;
