-- ────────────────────────────────────────────────────────────────────────────
-- Migration 220: Tighten over-permissive RLS policies
--
-- Addresses three medium/high severity security issues identified in the
-- 2026-03 platform audit:
--
--  1. users_insert (HIGH) — WITH CHECK (TRUE) allowed any caller (including
--     anonymous) to insert a users row with any role, enabling privilege
--     escalation. Changed to WITH CHECK (auth.uid() = id) so a user can only
--     create their own row. The server-side register() function runs under the
--     service role and bypasses RLS, so real registration is unaffected.
--
--  2. product_analytics (MEDIUM) — The original ALL policy with USING (TRUE)
--     / WITH CHECK (TRUE) permitted any authenticated user to UPDATE or DELETE
--     analytics rows, enabling analytics data poisoning. Replaced with separate
--     policies: SELECT and INSERT remain open for view-counting by anonymous
--     visitors, but UPDATE and DELETE are restricted to the service role (via
--     admin-level check) since analytics are only modified by server-side RPCs.
--
--  3. product_shipping (MEDIUM) — INSERT and UPDATE were allowed for any
--     authenticated user (WITH CHECK (TRUE)). Changed to require the
--     authenticated user to own the product being shipped.
--
-- This script is idempotent (DROP IF EXISTS + CREATE).
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. users_insert ──────────────────────────────────────────────────────────
-- Allow only the row owner to insert their own profile.
-- The server-side register() function uses the service role and bypasses RLS.

DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

CREATE POLICY "users_insert"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 2. product_analytics ─────────────────────────────────────────────────────
-- Split the permissive ALL policy into targeted per-operation policies.
-- SELECT / INSERT remain open (view counting by anon is intentional).
-- UPDATE / DELETE require admin/owner to prevent analytics data poisoning.
-- Drop both historical umbrella policies and every canonical replacement
-- policy so this corrective migration is safe when replayed after a baseline
-- that already contains the hardened policy names.

DROP POLICY IF EXISTS "product_analytics_all"    ON product_analytics;
DROP POLICY IF EXISTS "product_analytics_write"  ON product_analytics;
DROP POLICY IF EXISTS "product_analytics_select" ON product_analytics;
DROP POLICY IF EXISTS "product_analytics_insert" ON product_analytics;
DROP POLICY IF EXISTS "product_analytics_update" ON product_analytics;
DROP POLICY IF EXISTS "product_analytics_delete" ON product_analytics;

CREATE POLICY "product_analytics_select"
  ON product_analytics
  FOR SELECT
  USING (TRUE);

CREATE POLICY "product_analytics_insert"
  ON product_analytics
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "product_analytics_update"
  ON product_analytics
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "product_analytics_delete"
  ON product_analytics
  FOR DELETE
  USING (is_admin());

-- ── 3. product_shipping ──────────────────────────────────────────────────────
-- Insert / update / delete require the authenticated user to own the product.

DROP POLICY IF EXISTS product_shipping_auth_insert ON product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_update ON product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_delete ON product_shipping;

CREATE POLICY product_shipping_auth_insert
  ON product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_shipping.product_id
        AND products."sellerId" = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY product_shipping_auth_update
  ON product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_shipping.product_id
        AND products."sellerId" = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_shipping.product_id
        AND products."sellerId" = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY product_shipping_auth_delete
  ON product_shipping
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_shipping.product_id
        AND products."sellerId" = auth.uid()
    )
    OR is_admin()
  );
