CREATE OR REPLACE FUNCTION public.request_payout(p_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_seller_id UUID := auth.uid();
  v_available DECIMAL(12,2);
  v_request_id UUID;
  v_connect_status TEXT;
BEGIN
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'request_payout: caller is not authenticated';
  END IF;

  IF NOT public.is_seller() THEN
    RAISE EXCEPTION 'request_payout: seller account required';
  END IF;

  SELECT "stripeConnectStatus"
    INTO v_connect_status
    FROM public.seller_profiles
   WHERE "userId" = v_seller_id;

  IF v_connect_status = 'active' THEN
    RAISE EXCEPTION 'request_payout: manual payouts are disabled while Stripe Connect automatic payouts are active';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'request_payout: amount must be greater than zero';
  END IF;

  SELECT "availableAmount" INTO v_available
    FROM public.seller_balance
   WHERE "sellerId" = v_seller_id
   FOR UPDATE;

  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance — available: %, requested: %',
      COALESCE(v_available, 0), p_amount;
  END IF;

  INSERT INTO public.payout_requests ("sellerId", amount, status)
  VALUES (v_seller_id, p_amount, 'requested')
  RETURNING id INTO v_request_id;

  UPDATE public.seller_balance
     SET "availableAmount" = "availableAmount" - p_amount,
         "pendingAmount" = "pendingAmount" + p_amount,
         "updatedAt" = NOW()
   WHERE "sellerId" = v_seller_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_payout(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric) TO authenticated, service_role;;
