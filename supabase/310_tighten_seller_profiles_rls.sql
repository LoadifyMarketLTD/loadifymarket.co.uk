-- ================================================================
-- 310_tighten_seller_profiles_rls.sql
-- Loadify Market — Restrict seller_profiles direct SELECT access
-- ================================================================
--
-- SECURITY ISSUE (PRR/ORR — H3):
--   seller_profiles_select was USING (TRUE), meaning ANY anonymous
--   Supabase client could read every seller's commission rate,
--   VAT number, Stripe account ID, business registration, dispute
--   rate, and other sensitive operational fields.
--
-- FIX:
--   Restrict direct table SELECT to: row owner OR admin.
--   Public pages already use the seller_profiles_public VIEW (created
--   in migration 170/190) which exposes only safe display fields.
--   No frontend code reads from the base table as an anonymous user.
--
-- SAFE TO APPLY:
--   All authenticated sellers still read their own row.
--   All admin pages still read any row.
--   All public/catalog pages use seller_profiles_public (view).
-- ================================================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "seller_profiles_select" ON seller_profiles;

-- Replace with owner + admin only
CREATE POLICY "seller_profiles_select" ON seller_profiles FOR SELECT
  USING (auth.uid() = "userId" OR is_admin());
