-- RFQ (Request For Quote) System
-- Migration: create rfq_requests table
-- Phase 2 — B2B Wholesale Marketplace

CREATE TABLE IF NOT EXISTS rfq_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name    TEXT NOT NULL,
  quantity        TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  estimated_budget    TEXT NOT NULL,
  buyer_email     TEXT NOT NULL,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering by date (most recent first)
CREATE INDEX IF NOT EXISTS idx_rfq_requests_created_at
  ON rfq_requests (created_at DESC);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_rfq_requests_status
  ON rfq_requests (status);

-- Enable Row Level Security
ALTER TABLE rfq_requests ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can insert (buyers submitting quote requests)
CREATE POLICY "Anyone can submit RFQ requests"
  ON rfq_requests FOR INSERT
  WITH CHECK (true);

-- Policy: authenticated sellers can read all RFQ requests
CREATE POLICY "Authenticated sellers can read RFQ requests"
  ON rfq_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('seller', 'admin')
    )
  );

-- Policy: authenticated sellers can update status (e.g. mark as replied)
CREATE POLICY "Authenticated sellers can update RFQ status"
  ON rfq_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('seller', 'admin')
    )
  );
