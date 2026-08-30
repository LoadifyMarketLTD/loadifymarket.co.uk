CREATE OR REPLACE FUNCTION public.approve_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'approve_payout: admin access required';
  END IF;

  UPDATE public.payout_requests
    SET status = 'approved',
        "reviewedBy" = auth.uid(),
        "reviewedAt" = NOW()
  WHERE id = p_request_id AND status = 'requested';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_payout: request % not found or not in requested state', p_request_id;
  END IF;

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'approve_payout', 'payout_requests', p_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_amount DECIMAL(12,2);
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

  UPDATE public.payout_requests
    SET status = 'paid', "paidAt" = NOW()
  WHERE id = p_request_id;

  UPDATE public.seller_balance
    SET "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt" = NOW()
  WHERE "sellerId" = v_seller_id;

  INSERT INTO public.payouts ("sellerId", amount, status, "paidAt")
    VALUES (v_seller_id, v_amount, 'paid', NOW());

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'complete_payout', 'payout_requests', p_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payout(p_request_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_amount DECIMAL(12,2);
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
    SET status = 'rejected', notes = COALESCE(p_notes, notes),
        "reviewedBy" = auth.uid(), "reviewedAt" = NOW()
  WHERE id = p_request_id;

  UPDATE public.seller_balance
    SET "availableAmount" = "availableAmount" + v_amount,
        "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt" = NOW()
  WHERE "sellerId" = v_seller_id;

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId", "newData")
    VALUES (auth.uid(), 'reject_payout', 'payout_requests', p_request_id,
            jsonb_build_object('notes', p_notes));
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payout(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_payout(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_payout(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payout(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payout(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.credit_seller_balance(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_seller_balance(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.request_payout(NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(NUMERIC) TO authenticated;;
