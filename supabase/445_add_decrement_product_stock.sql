-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 445: Re-create decrement_product_stock(UUID, INTEGER) function
--
-- The function was defined in 170_audit_fixes_2026_03_18.sql but was found
-- missing in the live database (verification 2026-04-24).
--
-- This migration re-creates the function using CREATE OR REPLACE so it is
-- fully idempotent.
--
-- The function is called by the stripe-webhook Netlify function after a
-- successful payment to atomically decrement product stock and update the
-- stock status, preventing overselling via a row-level lock (FOR UPDATE).
--
-- Logic:
--   1. Lock the target product row.
--   2. Clamp decrement to zero (stockQuantity never goes negative).
--   3. Set stockStatus: out_of_stock (≤0), low_stock (≤10), or in_stock.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id UUID,
  p_qty        INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  -- Row-level lock prevents concurrent over-decrements
  SELECT "stockQuantity"
  INTO   v_current
  FROM   public.products
  WHERE  id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  -- Clamp to zero; never go negative
  UPDATE public.products
  SET
    "stockQuantity" = GREATEST(v_current - p_qty, 0),
    "stockStatus"   = CASE
                        WHEN GREATEST(v_current - p_qty, 0) <= 0  THEN 'out_of_stock'
                        WHEN GREATEST(v_current - p_qty, 0) <= 10 THEN 'low_stock'
                        ELSE 'in_stock'
                      END,
    "updatedAt"     = NOW()
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(UUID, INTEGER) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '445_add_decrement_product_stock: decrement_product_stock(UUID, INTEGER) created/replaced.';
END $$;
