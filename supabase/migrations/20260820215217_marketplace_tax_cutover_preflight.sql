DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.payment_sessions ps
     WHERE ps.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'P1 tax cutover blocked: pending payment_sessions exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.orders o
     WHERE o.status = 'awaiting_payment'
  ) THEN
    RAISE EXCEPTION 'P1 tax cutover blocked: awaiting_payment orders exist';
  END IF;
END;
$$;;
