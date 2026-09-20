CREATE OR REPLACE FUNCTION public.server_complete_supplier_payment_v1(
  p_payment_session_id uuid,
  p_payment_intent_ref text,
  p_amount numeric,
  p_currency text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_session public.payment_sessions%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_handshake jsonb;
  v_correlation uuid;
BEGIN
  IF p_payment_session_id IS NULL OR NULLIF(BTRIM(p_payment_intent_ref),'') IS NULL THEN
    RAISE EXCEPTION 'payment session and PaymentIntent are required';
  END IF;

  SELECT * INTO v_session FROM public.payment_sessions
  WHERE id=p_payment_session_id FOR UPDATE;
  IF NOT FOUND OR v_session."orderId" IS NULL THEN
    RAISE EXCEPTION 'supplier payment session is not linked to an order';
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id=v_session."orderId" FOR UPDATE;
  IF NOT FOUND OR v_order."commercialMode"<>'loadify_supplier_fulfilled'
     OR v_order."sellerId" IS NOT NULL OR v_order."supplierOfferId" IS NULL THEN
    RAISE EXCEPTION 'supplier-fulfilled order identity mismatch';
  END IF;

  IF ROUND(p_amount::numeric,2)<>ROUND(v_order.total::numeric,2)
     OR upper(BTRIM(COALESCE(p_currency,'')))<>'GBP'
     OR ROUND(v_session.amount::numeric,2)<>ROUND(v_order.total::numeric,2)
     OR upper(BTRIM(v_session.currency))<>'GBP' THEN
    RAISE EXCEPTION 'canonical supplier payment evidence mismatch';
  END IF;

  IF v_session.status='completed' THEN
    IF v_session."stripePaymentIntent" IS DISTINCT FROM p_payment_intent_ref
       OR v_order."stripePaymentIntentId" IS DISTINCT FROM p_payment_intent_ref THEN
      RAISE EXCEPTION 'completed supplier payment conflicts with PaymentIntent';
    END IF;
  ELSIF v_session.status='pending' THEN
    UPDATE public.payment_sessions
       SET status='completed',"stripePaymentIntent"=p_payment_intent_ref,"updatedAt"=now()
     WHERE id=v_session.id AND status='pending';

    UPDATE public.orders
       SET status='paid',"stripePaymentIntentId"=p_payment_intent_ref,"updatedAt"=now()
     WHERE id=v_order.id AND status='awaiting_payment';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier order paid transition lost expected state';
    END IF;
  ELSE
    RAISE EXCEPTION 'supplier payment session status % is not processable',v_session.status;
  END IF;

  SELECT l.* INTO v_leg
  FROM private.supplier_order_orchestrations o
  JOIN private.supplier_fulfilment_legs l ON l.orchestration_id=o.id
  WHERE o.order_id=v_order.id
    AND l.fulfiller_type='supplier'
    AND l.commercial_mode='loadify_supplier_fulfilled'
    AND l.supplier_offer_id=v_order."supplierOfferId"
  ORDER BY l.created_at LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier fulfilment leg is missing'; END IF;

  SELECT o.correlation_id INTO v_correlation
  FROM private.supplier_order_orchestrations o WHERE o.order_id=v_order.id;

  v_handshake:=public.server_prepare_supplier_order_handshake_v1(
    v_order.id,v_leg.id,
    'supplier-handshake:'||v_order.id::text,
    v_correlation
  );

  RETURN jsonb_build_object(
    'ok',true,'orderId',v_order.id,'orderNumber',v_order."orderNumber",
    'paymentSessionId',v_session.id,'paymentIntentRef',p_payment_intent_ref,
    'paymentCompleted',true,'handshake',v_handshake,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_complete_supplier_payment_v1(uuid,text,numeric,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_complete_supplier_payment_v1(uuid,text,numeric,text)
TO service_role;

COMMENT ON FUNCTION public.server_complete_supplier_payment_v1(uuid,text,numeric,text) IS
'Atomically records canonical Loadify Supplier-Fulfilled payment completion, transitions the one customer order to paid, and prepares the provider-neutral supplier-order handshake. It does not submit to a supplier provider.';
