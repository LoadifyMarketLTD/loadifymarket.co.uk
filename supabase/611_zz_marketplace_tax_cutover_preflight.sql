-- 611_zz_marketplace_tax_cutover_preflight.sql
--
-- P1 deployment preflight. This file is intentionally ordered after the existing
-- 611 reconciliation and before 612 marketplace tax materialisation changes.
-- Never replace payment-session/order tax semantics underneath an in-flight
-- payment created with the pre-P1 snapshot contract.

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
$$;
