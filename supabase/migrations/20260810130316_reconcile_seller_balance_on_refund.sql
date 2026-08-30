CREATE TABLE IF NOT EXISTS public.seller_balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sellerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "orderId" uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('refund_reversal')),
  "requestedAmount" numeric(12,2) NOT NULL DEFAULT 0,
  "appliedAmount" numeric(12,2) NOT NULL DEFAULT 0,
  "unrecoveredAmount" numeric(12,2) NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("orderId", adjustment_type)
);

ALTER TABLE public.seller_balance_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seller_balance_adjustments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.seller_balance_adjustments TO service_role;

CREATE INDEX IF NOT EXISTS idx_seller_balance_adjustments_seller
  ON public.seller_balance_adjustments ("sellerId");

CREATE OR REPLACE FUNCTION private.reconcile_seller_balance_on_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_net numeric(12,2);
  v_available numeric(12,2) := 0;
  v_pending numeric(12,2) := 0;
  v_take_available numeric(12,2) := 0;
  v_take_pending numeric(12,2) := 0;
  v_applied numeric(12,2) := 0;
  v_adjustment_id uuid;
BEGIN
  IF NEW.status <> 'refunded' OR OLD.status IS NOT DISTINCT FROM 'refunded' THEN
    RETURN NEW;
  END IF;

  v_net := GREATEST(COALESCE(NEW.subtotal, 0) - COALESCE(NEW.commission, 0), 0);

  INSERT INTO public.seller_balance_adjustments (
    "sellerId", "orderId", adjustment_type, "requestedAmount"
  ) VALUES (
    NEW."sellerId", NEW.id, 'refund_reversal', v_net
  )
  ON CONFLICT ("orderId", adjustment_type) DO NOTHING
  RETURNING id INTO v_adjustment_id;

  -- Already reconciled for this order/refund transition.
  IF v_adjustment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "availableAmount", "pendingAmount"
    INTO v_available, v_pending
    FROM public.seller_balance
   WHERE "sellerId" = NEW."sellerId"
   FOR UPDATE;

  IF FOUND THEN
    v_take_available := LEAST(v_available, v_net);
    v_take_pending := LEAST(v_pending, GREATEST(v_net - v_take_available, 0));
    v_applied := v_take_available + v_take_pending;

    UPDATE public.seller_balance
       SET "availableAmount" = "availableAmount" - v_take_available,
           "pendingAmount" = "pendingAmount" - v_take_pending,
           "totalEarned" = GREATEST("totalEarned" - v_net, 0),
           "updatedAt" = NOW()
     WHERE "sellerId" = NEW."sellerId";
  END IF;

  UPDATE public.seller_balance_adjustments
     SET "appliedAmount" = v_applied,
         "unrecoveredAmount" = GREATEST(v_net - v_applied, 0)
   WHERE id = v_adjustment_id;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.reconcile_seller_balance_on_refund() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_reconcile_seller_balance_on_refund ON public.orders;
CREATE TRIGGER trg_reconcile_seller_balance_on_refund
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.reconcile_seller_balance_on_refund();;
