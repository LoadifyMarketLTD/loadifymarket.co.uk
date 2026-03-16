-- ================================================================
-- 131_stock_requests_add_buyer_email.sql
-- Loadify Market — Live-DB patch: stock_requests + buyer_email
-- ================================================================
-- Handles two scenarios in one idempotent script:
--   A) The stock_requests table has never been created on this DB
--      → creates the full table with buyer_email already included.
--   B) The table exists but buyer_email is missing
--      → adds the column with ALTER TABLE.
-- Safe to re-run at any time; all statements use IF NOT EXISTS /
-- IF EXISTS guards.
-- ================================================================

-- ── A) Create table if it does not exist yet ─────────────────────
CREATE TABLE IF NOT EXISTS stock_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_type TEXT        NOT NULL,
  quantity     TEXT        NOT NULL,
  location     TEXT        NOT NULL,
  budget       TEXT        NOT NULL DEFAULT '',
  notes        TEXT        NOT NULL DEFAULT '',
  buyer_email  TEXT        NOT NULL DEFAULT '',
  buyer_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── B) Add buyer_email if the table existed without the column ───
-- (No-op when the table was just created above by step A.)
ALTER TABLE stock_requests
  ADD COLUMN IF NOT EXISTS buyer_email TEXT NOT NULL DEFAULT '';

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stock_requests_created_at
  ON stock_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_requests_buyer_id
  ON stock_requests (buyer_id);

-- ── Row-Level Security ───────────────────────────────────────────
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Insert policy: anonymous and authenticated users can submit requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'stock_requests'
      AND policyname = 'stock_requests_insert_anon'
  ) THEN
    CREATE POLICY "stock_requests_insert_anon"
      ON stock_requests
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  -- Select policy: sellers / admins can read all requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'stock_requests'
      AND policyname = 'stock_requests_select_sellers'
  ) THEN
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
  END IF;

  -- Select policy: buyers can read their own requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'stock_requests'
      AND policyname = 'stock_requests_select_own'
  ) THEN
    CREATE POLICY "stock_requests_select_own"
      ON stock_requests
      FOR SELECT
      TO authenticated
      USING (buyer_id = auth.uid());
  END IF;
END;
$$;

-- ── Grants ───────────────────────────────────────────────────────
GRANT SELECT, INSERT ON stock_requests TO anon;
GRANT SELECT, INSERT ON stock_requests TO authenticated;
