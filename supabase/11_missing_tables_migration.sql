-- ============================================================
-- 11_missing_tables_migration.sql
-- Loadify Market — MISSING TABLES & FUNCTIONS MIGRATION
-- ============================================================
-- This migration adds tables and functions that are referenced
-- in the application code but were missing from the schema.
--
-- Run this in Supabase SQL Editor AFTER the main schema (00-10).
-- Last updated: 2026-03-10
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE 1: PAYMENTS
-- Records actual payment transactions from Stripe webhooks.
-- Referenced by: netlify/functions/stripe-webhook.ts
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stripe_payment_id   TEXT        UNIQUE NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','succeeded','failed','refunded','partially_refunded')),
  amount              DECIMAL(12,2),
  currency            TEXT        NOT NULL DEFAULT 'GBP',
  payment_method      TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order           ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe          ON payments (stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status          ON payments (status);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- TABLE 2: DISPUTE_MESSAGES
-- Messages within dispute/buyer protection threads.
-- Referenced by: src/pages/DisputesPage.tsx
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dispute_messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id  UUID        NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_role   TEXT        CHECK (user_role IN ('buyer','seller','admin')),
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages (dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_user    ON dispute_messages (user_id);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: track_add_to_cart
-- Increments add-to-cart analytics for a product.
-- Referenced by: src/pages/ProductPage.tsx
-- Modelled after track_product_view().
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION track_add_to_cart(
  p_product_id UUID
)
RETURNS void AS $$
BEGIN
  -- Increment add_to_cart_count on the product
  UPDATE products
  SET add_to_cart_count = COALESCE(add_to_cart_count, 0) + 1
  WHERE id = p_product_id;

  -- Increment in product_analytics
  INSERT INTO product_analytics (product_id, date, add_to_cart_count)
  VALUES (p_product_id, CURRENT_DATE, 1)
  ON CONFLICT (product_id, date) DO UPDATE SET
    add_to_cart_count = product_analytics.add_to_cart_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- RLS POLICIES FOR NEW TABLES
-- ──────────────────────────────────────────────────────────────

-- ── Payments ──
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admin/owner can see all payments
CREATE POLICY payments_admin_all ON payments
  FOR ALL USING (is_admin_or_owner());

-- Buyers can see payments for their own orders
CREATE POLICY payments_buyer_select ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
        AND orders.buyer_id = auth.uid()
    )
  );

-- Sellers can see payments for orders they are the seller on
CREATE POLICY payments_seller_select ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
        AND orders.seller_id = auth.uid()
    )
  );

-- ── Dispute Messages ──
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Admin/owner can see all dispute messages
CREATE POLICY dispute_messages_admin_all ON dispute_messages
  FOR ALL USING (is_admin_or_owner());

-- Parties (buyer/seller) of the dispute can read messages
CREATE POLICY dispute_messages_parties_select ON dispute_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
        AND (disputes.buyer_id = auth.uid() OR disputes.seller_id = auth.uid())
    )
  );

-- Authenticated users can insert messages on their own disputes
CREATE POLICY dispute_messages_insert ON dispute_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
        AND (disputes.buyer_id = auth.uid() OR disputes.seller_id = auth.uid())
    )
  );

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKET: proof-of-delivery
-- Referenced by: SUPABASE_BUCKET_NAME env var
-- Run this separately if buckets cannot be created via SQL.
-- ──────────────────────────────────────────────────────────────
-- Note: Supabase storage bucket creation via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-of-delivery', 'proof-of-delivery', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: only authenticated users can upload/read proof-of-delivery
CREATE POLICY pod_authenticated_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proof-of-delivery');

CREATE POLICY pod_authenticated_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'proof-of-delivery');
