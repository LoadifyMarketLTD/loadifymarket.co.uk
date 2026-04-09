-- ================================================================
-- 300_remove_owner_role.sql
-- Loadify Market — Remove 'owner' role from live database
-- ================================================================
--
-- CONTEXT:
--   The platform previously had an 'owner' role distinct from 'admin'.
--   Decision: consolidate to exactly 3 roles — buyer, seller, admin.
--   admin is now the single highest-privilege role.
--
-- CHANGES:
--   1. Migrate any remaining 'owner' rows to 'admin'
--   2. Tighten role CHECK constraint to ('buyer','seller','admin')
--   3. Rename is_admin_or_owner() → is_admin() (drop old alias)
--   4. Keep is_owner() as a SECURITY DEFINER alias → is_admin()
--      for backward-compat with old SQL that may still reference it.
-- ================================================================

-- Step 1: Migrate any remaining 'owner' users to 'admin'
UPDATE public.users
SET role = 'admin'
WHERE role = 'owner';

-- Step 2: Migrate any 'owner' values in dispute_messages.userRole
UPDATE public.dispute_messages
SET "userRole" = 'admin'
WHERE "userRole" = 'owner';

-- Step 3: Tighten the role CHECK constraint on users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('buyer', 'seller', 'admin'));

-- Step 4: Tighten the userRole CHECK constraint on dispute_messages
ALTER TABLE public.dispute_messages DROP CONSTRAINT IF EXISTS dispute_messages_userRole_check;
ALTER TABLE public.dispute_messages
  ADD CONSTRAINT dispute_messages_userRole_check
  CHECK ("userRole" IN ('buyer', 'seller', 'admin'));

-- Step 5: Replace is_admin_or_owner() with is_admin()
-- Drop the old function name entirely; all references have been updated.
DROP FUNCTION IF EXISTS public.is_admin_or_owner() CASCADE;

-- Step 6: Redefine is_admin() to check only 'admin' (idempotent)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND "isActive" = TRUE
  );
END;
$$;

-- Step 7: Keep is_owner() as a backward-compat alias → is_admin()
-- Any old policies referencing is_owner() will continue to work.
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN is_admin();
END;
$$;

-- Step 8: Redefine is_seller() — sellers only (admin excluded for strict RLS)
CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'seller'
      AND "isActive" = TRUE
  );
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '300_remove_owner_role: completed. Role model is now: buyer | seller | admin';
END $$;
