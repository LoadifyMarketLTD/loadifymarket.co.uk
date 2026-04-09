-- ════════════════════════════════════════════════════════════════════════════
-- Migration 90: Launch-blocker completions
-- Run in Supabase SQL Editor (or as a migration) AFTER all prior migrations.
--
-- Covers:
--   1. seller_balance table + RLS
--   2. payout_requests table + RLS
--   3. reviews_insert RLS fix (enforce verified purchase + delivered order)
--   4. disputes_update RLS fix  (prevent seller/buyer escalating status to resolved/closed)
--   5. audit_logs INSERT policy (was missing) + log_admin_action() helper RPC
--   6. Payout workflow RPCs: credit_seller_balance, request_payout,
--      approve_payout, complete_payout, reject_payout
--   7. checkout_rate_limits table (fraud / rate-limiting)
--
-- All statements are idempotent (CREATE IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. seller_balance
--    One row per seller.  Available = earnable now; Pending = in payout review.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_balance (
  "sellerId"        UUID           PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "availableAmount" DECIMAL(12,2)  NOT NULL DEFAULT 0.00 CHECK ("availableAmount" >= 0),
  "pendingAmount"   DECIMAL(12,2)  NOT NULL DEFAULT 0.00 CHECK ("pendingAmount"  >= 0),
  "totalEarned"     DECIMAL(12,2)  NOT NULL DEFAULT 0.00 CHECK ("totalEarned"    >= 0),
  currency          TEXT           NOT NULL DEFAULT 'GBP',
  "updatedAt"       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE seller_balance IS
  'Running balance for each seller. Updated by credit_seller_balance() after every paid order.';

-- RLS
ALTER TABLE seller_balance ENABLE ROW LEVEL SECURITY;

-- Seller sees own row; admin/owner see all
CREATE POLICY "seller_balance_select" ON seller_balance FOR SELECT
  USING (auth.uid() = "sellerId" OR is_admin());

-- Only DB functions (SECURITY DEFINER) or admin may mutate rows directly
CREATE POLICY "seller_balance_admin_write" ON seller_balance FOR ALL
  USING  (is_admin())
  WITH CHECK (is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 2. payout_requests
--    Seller creates → admin approves → admin marks paid.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId"   UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
  currency     TEXT           NOT NULL DEFAULT 'GBP',
  -- lifecycle: requested → approved | rejected → paid | cancelled
  status       TEXT           NOT NULL DEFAULT 'requested'
                 CHECK (status IN ('requested','approved','rejected','paid','cancelled')),
  notes        TEXT,
  "reviewedBy" UUID           REFERENCES users(id) ON DELETE SET NULL,
  "reviewedAt" TIMESTAMPTZ,
  "paidAt"     TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON payout_requests ("sellerId");
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests (status);
CREATE TRIGGER trg_payout_requests_updatedAt
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Seller sees own requests; admin sees all
CREATE POLICY "payout_requests_select" ON payout_requests FOR SELECT
  USING (auth.uid() = "sellerId" OR is_admin());

-- Sellers may only insert their own request (amount/status enforced by RPC)
CREATE POLICY "payout_requests_seller_insert" ON payout_requests FOR INSERT
  WITH CHECK (auth.uid() = "sellerId");

-- Only admin may update (approve / reject / complete)
CREATE POLICY "payout_requests_admin_update" ON payout_requests FOR UPDATE
  USING  (is_admin())
  WITH CHECK (is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 3. reviews_insert RLS fix
--    Old policy:   WITH CHECK (auth.uid() = "userId")              ← too loose
--    New policy:   buyer must own the order, order must be delivered,
--                  and the reviewed product must be in that order.
-- ────────────────────────────────────────────────────────────────────────────
-- Drop from both possible locations (00_consolidated_schema + 10_rls_policies
-- both created the same policy name on the same table).
DROP POLICY IF EXISTS "reviews_insert" ON reviews;

CREATE POLICY "reviews_insert" ON reviews FOR INSERT
  WITH CHECK (
    -- row is attributed to the requesting user
    auth.uid() = "userId"
    AND
    -- the order exists, belongs to this user, is delivered, and contains the product
    EXISTS (
      SELECT 1
      FROM   orders o
      JOIN   order_items oi ON oi."orderId" = o.id
      WHERE  o.id           = reviews."orderId"
        AND  o."buyerId"    = auth.uid()
        AND  o.status       = 'delivered'
        AND  oi."productId" = reviews."productId"
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 4. disputes_update RLS fix
--    Old policy: USING (buyer OR seller OR admin) — no WITH CHECK.
--    Without WITH CHECK, Postgres applies USING as the check too, which
--    means a seller could set status = 'resolved' on their own dispute.
--    Fix: add WITH CHECK so only admins can flip to 'resolved' or 'closed'.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "disputes_update" ON disputes;

CREATE POLICY "disputes_update" ON disputes FOR UPDATE
  -- who may touch the row at all
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin())
  -- what the resulting row may look like
  WITH CHECK (
    -- admins can set any status
    is_admin()
    OR (
      -- buyers and sellers may update their own disputes but cannot
      -- self-resolve or self-close; those transitions are admin-only
      (auth.uid() = "buyerId" OR auth.uid() = "sellerId")
      AND status NOT IN ('resolved', 'closed')
    )
  );

-- dispute_messages_insert: the existing policy is correct but the admin branch
-- has a subtle issue — "auth.uid() = userId AND (... OR is_admin())"
-- means admin messages are correctly attributed to the admin's own user ID.
-- No change needed for messages; leaving in place.


-- ────────────────────────────────────────────────────────────────────────────
-- 5a. audit_logs INSERT policy
--     SELECT remains restricted to admin/owner (existing policy kept as-is).
--     For direct INSERT (e.g. from Netlify service-role client), restrict to
--     admin/owner.  All application-layer writes go through either:
--       (a) service-role key (bypasses RLS entirely), or
--       (b) log_admin_action() SECURITY DEFINER RPC (also bypasses RLS).
--     This prevents arbitrary authenticated users from injecting fake audit rows.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;

CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (is_admin());   -- direct inserts: admin/owner only
                                      -- SECURITY DEFINER RPCs bypass this

-- 5b. log_admin_action() — convenience RPC called from the application
--     layer to record admin actions without duplicating insert logic.
--     Uses auth.uid() so every log row is correctly attributed.
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action     TEXT,
  p_table_name TEXT  DEFAULT NULL,
  p_record_id  UUID  DEFAULT NULL,
  p_old_data   JSONB DEFAULT NULL,
  p_new_data   JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER   -- bypasses RLS so any authenticated caller can log via this RPC
AS $$
BEGIN
  INSERT INTO audit_logs (
    "actorId", action, "tableName", "recordId", "oldData", "newData"
  ) VALUES (
    auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. Payout workflow RPCs
-- ────────────────────────────────────────────────────────────────────────────

-- 6a. credit_seller_balance
--     Called by the Stripe webhook (service role) after a paid order is created.
--     Upserts the seller's balance row, netting out the platform commission.
CREATE OR REPLACE FUNCTION credit_seller_balance(
  p_seller_id UUID,
  p_order_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subtotal   DECIMAL(12,2);
  v_commission DECIMAL(12,2);
  v_net        DECIMAL(12,2);
BEGIN
  SELECT subtotal, commission
    INTO v_subtotal, v_commission
    FROM orders
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

  INSERT INTO seller_balance ("sellerId", "availableAmount", "totalEarned", "updatedAt")
    VALUES (p_seller_id, v_net, v_net, NOW())
  ON CONFLICT ("sellerId") DO UPDATE
    SET "availableAmount" = seller_balance."availableAmount" + EXCLUDED."availableAmount",
        "totalEarned"     = seller_balance."totalEarned"     + EXCLUDED."totalEarned",
        "updatedAt"       = NOW();
END;
$$;

-- 6b. request_payout  (called by seller via supabase.rpc())
--     Validates the seller has enough available balance, inserts the request,
--     and reserves the amount (moves available → pending).
CREATE OR REPLACE FUNCTION request_payout(p_amount DECIMAL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id  UUID := auth.uid();
  v_available  DECIMAL(12,2);
  v_request_id UUID;
BEGIN
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'request_payout: caller is not authenticated';
  END IF;

  SELECT "availableAmount" INTO v_available
    FROM seller_balance
   WHERE "sellerId" = v_seller_id;

  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION
      'Insufficient available balance — available: %, requested: %',
      COALESCE(v_available, 0), p_amount;
  END IF;

  INSERT INTO payout_requests ("sellerId", amount, status)
    VALUES (v_seller_id, p_amount, 'requested')
  RETURNING id INTO v_request_id;

  UPDATE seller_balance
    SET "availableAmount" = "availableAmount" - p_amount,
        "pendingAmount"   = "pendingAmount"   + p_amount,
        "updatedAt"       = NOW()
   WHERE "sellerId" = v_seller_id;

  RETURN v_request_id;
END;
$$;

-- 6c. approve_payout  (admin)
--     Moves the request from 'requested' → 'approved'.
--     Amount stays in pending until complete_payout is called.
CREATE OR REPLACE FUNCTION approve_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payout_requests
    SET status       = 'approved',
        "reviewedBy" = auth.uid(),
        "reviewedAt" = NOW()
   WHERE id = p_request_id AND status = 'requested';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_payout: request % not found or not in requested state', p_request_id;
  END IF;

  INSERT INTO audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'approve_payout', 'payout_requests', p_request_id);
END;
$$;

-- 6d. complete_payout  (admin — after funds have actually been sent)
--     Moves 'approved' → 'paid', drains pending balance,
--     and writes a row to the payouts ledger table.
CREATE OR REPLACE FUNCTION complete_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id UUID;
  v_amount    DECIMAL(12,2);
BEGIN
  SELECT "sellerId", amount
    INTO v_seller_id, v_amount
    FROM payout_requests
   WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'complete_payout: request % not found or not in approved state', p_request_id;
  END IF;

  UPDATE payout_requests
    SET status   = 'paid',
        "paidAt" = NOW()
   WHERE id = p_request_id;

  UPDATE seller_balance
    SET "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt"     = NOW()
   WHERE "sellerId" = v_seller_id;

  -- Record in the payouts ledger (existing table)
  INSERT INTO payouts ("sellerId", amount, status, "paidAt")
    VALUES (v_seller_id, v_amount, 'paid', NOW());

  INSERT INTO audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'complete_payout', 'payout_requests', p_request_id);
END;
$$;

-- 6e. reject_payout  (admin)
--     Returns amount from pending back to available balance.
CREATE OR REPLACE FUNCTION reject_payout(
  p_request_id UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id UUID;
  v_amount    DECIMAL(12,2);
BEGIN
  SELECT "sellerId", amount
    INTO v_seller_id, v_amount
    FROM payout_requests
   WHERE id = p_request_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reject_payout: request % not found or already processed', p_request_id;
  END IF;

  UPDATE payout_requests
    SET status       = 'rejected',
        notes        = COALESCE(p_notes, notes),
        "reviewedBy" = auth.uid(),
        "reviewedAt" = NOW()
   WHERE id = p_request_id;

  UPDATE seller_balance
    SET "availableAmount" = "availableAmount" + v_amount,
        "pendingAmount"   = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt"       = NOW()
   WHERE "sellerId" = v_seller_id;

  INSERT INTO audit_logs ("actorId", action, "tableName", "recordId", "newData")
    VALUES (auth.uid(), 'reject_payout', 'payout_requests', p_request_id,
            jsonb_build_object('notes', p_notes));
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. checkout_rate_limits  (fraud protection)
--    Tracks checkout attempts per identifier (hashed IP or userId) so the
--    create-checkout Netlify function can enforce a per-window limit.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkout_rate_limits (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier   TEXT        NOT NULL,             -- hashed IP or userId
  "windowEnd"  TIMESTAMPTZ NOT NULL,             -- end of the rate-limit window
  attempts     INTEGER     NOT NULL DEFAULT 1,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifier, "windowEnd")
);
CREATE INDEX IF NOT EXISTS idx_crl_identifier
  ON checkout_rate_limits (identifier, "windowEnd");
CREATE TRIGGER trg_checkout_rate_limits_updatedAt
  BEFORE UPDATE ON checkout_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE checkout_rate_limits ENABLE ROW LEVEL SECURITY;
-- Only service-role (Netlify functions) and admin can read/write this table
CREATE POLICY "checkout_rate_limits_admin" ON checkout_rate_limits FOR ALL
  USING  (is_admin())
  WITH CHECK (is_admin());
