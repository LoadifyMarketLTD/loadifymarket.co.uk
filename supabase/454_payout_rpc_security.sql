-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 454: Harden payout RPCs — SET search_path = '', public. prefixes,
--               GRANT EXECUTE
--
-- The four payout workflow functions were originally defined in
-- 90_launch_features.sql without SET search_path = '' and without explicit
-- GRANT EXECUTE statements.  This migration re-creates them with the same
-- security hardening applied to decrement_product_stock in migration 445.
--
-- Functions re-created (all SECURITY DEFINER, all idempotent):
--   credit_seller_balance(UUID, UUID)  — Stripe webhook credits seller after payment
--   approve_payout(UUID)               — Admin: requested → approved
--   complete_payout(UUID)              — Admin: approved → paid, drains pending balance
--   reject_payout(UUID, TEXT)          — Admin: returns pending amount to available
--
-- Changes vs. 90_launch_features.sql:
--   1. SET search_path = '' on every function (prevents search_path injection)
--   2. All table/schema references fully qualified with the public. prefix
--   3. GRANT EXECUTE ON FUNCTION … TO authenticated added for each function
-- ──────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- credit_seller_balance
--   Called by the Stripe webhook (service-role key) after a paid order is
--   created.  Upserts the seller's balance row, netting out the platform
--   commission.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_seller_balance(
  p_seller_id UUID,
  p_order_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subtotal   DECIMAL(12,2);
  v_commission DECIMAL(12,2);
  v_net        DECIMAL(12,2);
BEGIN
  SELECT subtotal, commission
    INTO v_subtotal, v_commission
    FROM public.orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit_seller_balance: order % not found', p_order_id;
  END IF;

  v_net := COALESCE(v_subtotal, 0) - COALESCE(v_commission, 0);

  -- Guard: commission should never exceed subtotal, but clamp to 0 to be safe
  -- and avoid violating the availableAmount >= 0 constraint.
  IF v_net < 0 THEN
    v_net := 0;
  END IF;

  INSERT INTO public.seller_balance ("sellerId", "availableAmount", "totalEarned", "updatedAt")
    VALUES (p_seller_id, v_net, v_net, NOW())
  ON CONFLICT ("sellerId") DO UPDATE
    SET "availableAmount" = public.seller_balance."availableAmount" + EXCLUDED."availableAmount",
        "totalEarned"     = public.seller_balance."totalEarned"     + EXCLUDED."totalEarned",
        "updatedAt"       = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_seller_balance(UUID, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- approve_payout
--   Admin action: moves a payout request from 'requested' → 'approved'.
--   Amount remains in pending balance until complete_payout is called.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.payout_requests
    SET status       = 'approved',
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

GRANT EXECUTE ON FUNCTION public.approve_payout(UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- complete_payout
--   Admin action: moves 'approved' → 'paid' after funds have been sent.
--   Drains the pending balance and writes a row to the payouts ledger.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_amount    DECIMAL(12,2);
BEGIN
  SELECT "sellerId", amount
    INTO v_seller_id, v_amount
    FROM public.payout_requests
   WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'complete_payout: request % not found or not in approved state', p_request_id;
  END IF;

  UPDATE public.payout_requests
    SET status   = 'paid',
        "paidAt" = NOW()
   WHERE id = p_request_id;

  UPDATE public.seller_balance
    SET "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt"     = NOW()
   WHERE "sellerId" = v_seller_id;

  -- Record in the payouts ledger (existing table)
  INSERT INTO public.payouts ("sellerId", amount, status, "paidAt")
    VALUES (v_seller_id, v_amount, 'paid', NOW());

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'complete_payout', 'payout_requests', p_request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_payout(UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- reject_payout
--   Admin action: rejects a requested or approved payout, returning the
--   reserved amount from pending back to the seller's available balance.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_payout(
  p_request_id UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_amount    DECIMAL(12,2);
BEGIN
  SELECT "sellerId", amount
    INTO v_seller_id, v_amount
    FROM public.payout_requests
   WHERE id = p_request_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reject_payout: request % not found or already processed', p_request_id;
  END IF;

  UPDATE public.payout_requests
    SET status       = 'rejected',
        notes        = COALESCE(p_notes, notes),
        "reviewedBy" = auth.uid(),
        "reviewedAt" = NOW()
   WHERE id = p_request_id;

  UPDATE public.seller_balance
    SET "availableAmount" = "availableAmount" + v_amount,
        "pendingAmount"   = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt"       = NOW()
   WHERE "sellerId" = v_seller_id;

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId", "newData")
    VALUES (auth.uid(), 'reject_payout', 'payout_requests', p_request_id,
            jsonb_build_object('notes', p_notes));
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_payout(UUID, TEXT) TO authenticated;


DO $$ BEGIN
  RAISE NOTICE '454_payout_rpc_security: credit_seller_balance, approve_payout, complete_payout, reject_payout recreated with SET search_path = '''' and GRANT EXECUTE.';
END $$;
