-- Migration 140: Marketplace Intermediary Model — Role Support & Owner Assignment
-- Loadify Market is operated by XDrive Logistics Ltd (marketplace intermediary only)
-- This migration ensures:
--   1. The users.role constraint supports all required roles: buyer, seller, admin, owner
--   2. The owner account (loadifymarket.co.uk@gmail.com) is assigned the 'owner' role
-- 
-- The platform does NOT sell, buy, or act as merchant of record.
-- All transactions are between buyers and sellers.
-- Loadify Market (XDrive Logistics Ltd) facilitates only.

-- Step 1: Ensure the role constraint supports all required roles.
-- (The constraint already exists in 00_consolidated_schema.sql but this is idempotent.)
DO $$
BEGIN
  -- Drop old constraint if it exists with a different name or restricted values
  ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_role_check;

  -- Recreate with full set of roles
  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('guest', 'buyer', 'seller', 'admin', 'owner'));

  RAISE NOTICE 'Role constraint updated: guest, buyer, seller, admin, owner all supported.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Role constraint update skipped: %', SQLERRM;
END;
$$;

-- Step 2: Assign 'owner' role to the primary owner account.
-- Uses auth.users to look up the email, then updates public.users.
-- This is idempotent — safe to run multiple times.
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'loadifymarket.co.uk@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.users
    SET role = 'owner'
    WHERE id = v_user_id
      AND role != 'owner';

    IF FOUND THEN
      RAISE NOTICE 'Owner role assigned to loadifymarket.co.uk@gmail.com (id: %)', v_user_id;
    ELSE
      RAISE NOTICE 'Owner account already has owner role or does not exist in public.users';
    END IF;
  ELSE
    RAISE NOTICE 'Owner auth account (loadifymarket.co.uk@gmail.com) not found — skipping role assignment';
  END IF;
END;
$$;

-- Step 3: Ensure is_admin_or_owner() and is_seller() helpers exist (idempotent).
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role IN ('seller', 'admin', 'owner')
  );
$$;
