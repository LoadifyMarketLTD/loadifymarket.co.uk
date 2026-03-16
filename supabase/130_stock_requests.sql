-- ================================================================
-- 130_stock_requests.sql
-- Loadify Market — Buyer Stock Requests (RFQ-style demand feature)
-- ================================================================
-- Allows buyers to submit requests for stock they cannot find,
-- and sellers to view these requests in their dashboard.
-- ================================================================

-- ── Table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_type TEXT        NOT NULL,
  quantity     TEXT        NOT NULL,
  location     TEXT        NOT NULL,
  budget       TEXT        NOT NULL DEFAULT '',
  notes        TEXT        NOT NULL DEFAULT '',
  buyer_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_requests_created_at
  ON stock_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_requests_buyer_id
  ON stock_requests (buyer_id);

-- ── Row-Level Security ───────────────────────────────────────────
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can insert a request
CREATE POLICY "stock_requests_insert_anon"
  ON stock_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated sellers and admins can read all requests
CREATE POLICY "stock_requests_select_sellers"
  ON stock_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('seller', 'admin', 'owner')
    )
  );

-- Buyers can read their own requests
CREATE POLICY "stock_requests_select_own"
  ON stock_requests
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- ── Grants ───────────────────────────────────────────────────────
GRANT SELECT, INSERT ON stock_requests TO anon;
GRANT SELECT, INSERT ON stock_requests TO authenticated;
