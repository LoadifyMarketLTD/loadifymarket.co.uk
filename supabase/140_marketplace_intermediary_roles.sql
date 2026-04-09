-- Migration 140: Marketplace Intermediary Model — Role Support & Admin Assignment
-- Loadify Market is operated by XDrive Logistics Ltd (marketplace intermediary only)
-- This migration ensures:
--   1. The users.role constraint supports all required roles: buyer, seller, admin
--   2. The platform admin account (loadifymarket.co.uk@gmail.com) is assigned the admin role
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

  -- Recreate with the final 3-role set
  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('buyer', 'seller', 'admin'));

  RAISE NOTICE 'Role constraint updated: buyer, seller, admin supported.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Role constraint update skipped: %', SQLERRM;
END;
$$;

-- Step 2: Ensure the platform admin account has the admin role.
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
    SET role = 'admin'
    WHERE id = v_user_id
      AND role != 'admin';

    IF FOUND THEN
      RAISE NOTICE 'Admin role assigned to loadifymarket.co.uk@gmail.com (id: %)', v_user_id;
    ELSE
      RAISE NOTICE 'Admin account already has admin role or does not exist in public.users';
    END IF;
  ELSE
    RAISE NOTICE 'Admin auth account (loadifymarket.co.uk@gmail.com) not found — skipping role assignment';
  END IF;
END;
$$;

-- Step 3: Ensure is_admin() and is_seller() helpers exist (idempotent).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin')
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
      AND role IN ('seller', 'admin')
  );
$$;
