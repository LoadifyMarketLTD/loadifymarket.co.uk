-- ================================================================
-- 452_rfq_orders_linkage.sql
-- Loadify Market — RFQ Step 7: Orders ← RFQ linkage
--
-- Service jobs created from an accepted RFQ quote do not originate
-- from a product listing, so productId must be nullable.
-- Two linkage columns are added to preserve traceability.
-- ================================================================

-- 1. Make productId nullable (service orders from RFQ have no product)
ALTER TABLE orders
  ALTER COLUMN "productId" DROP NOT NULL;

-- 2. Add rfqId reference (nullable — only set for RFQ-originated jobs)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "rfqId" UUID REFERENCES rfq_requests(id) ON DELETE SET NULL;

-- 3. Add rfqResponseId reference (nullable — which seller quote was accepted)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "rfqResponseId" UUID REFERENCES rfq_responses(id) ON DELETE SET NULL;

-- 4. Index for quick RFQ → order lookup
CREATE INDEX IF NOT EXISTS idx_orders_rfq ON orders ("rfqId");
