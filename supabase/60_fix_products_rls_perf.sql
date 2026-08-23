-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 60: Fix Auth RLS Initialization Plan warnings on public.products.
--
-- FUNCTIONAL ANALYSIS
-- -------------------
-- The existing products_select policy is logically correct:
--
--   USING (("isActive" = TRUE AND "isApproved" = TRUE)
--          OR auth.uid() = "sellerId"
--          OR is_admin_or_owner())
--
-- The first clause requires NO auth call, so unauthenticated users can read
-- any product where isActive=true AND isApproved=true.  The RLS policy was
-- NOT responsible for the product-visibility bug; that was an implicit INNER
-- JOIN in the PostgREST queries (fixed in the !left migration).
--
-- PERFORMANCE OPTIMIZATION
-- ------------------------
-- PostgreSQL evaluates a bare auth.uid() expression once per row during the
-- sequential scan.  Wrapping it as (select auth.uid()) causes the planner to
-- treat it as a stable InitPlan — evaluated once per statement, not per row.
-- Supabase's own linter flags this as "Auth RLS Initialization Plan" warnings
-- on products_select, products_insert, products_update, and products_delete.
--
-- This migration drops the four products policies and recreates them with the
-- (select auth.uid()) pattern.  Logic and access rules are unchanged.
-- ──────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

-- Public: any row where isActive=true AND isApproved=true is visible to
--         everyone (including unauthenticated users).
-- Sellers: can see their own products regardless of approval status.
-- Admins / Owner: can see all products.
CREATE POLICY "products_select" ON products FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (select auth.uid()) = "sellerId"
    OR is_admin_or_owner()
  );

-- Only the authenticated seller who owns the product may insert it.
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK ((select auth.uid()) = "sellerId" AND is_seller());

-- Sellers may update their own products; admins/owner may update any product.
CREATE POLICY "products_update" ON products FOR UPDATE
  USING ((select auth.uid()) = "sellerId" OR is_admin_or_owner());

-- Sellers may delete their own products; admins/owner may delete any product.
CREATE POLICY "products_delete" ON products FOR DELETE
  USING ((select auth.uid()) = "sellerId" OR is_admin_or_owner());
