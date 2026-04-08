-- ================================================================
-- 280_three_role_system.sql
-- Loadify Market — Migrate to strict 3-role system
-- ================================================================
--
-- CONTEXT:
--   The platform previously supported 5 roles:
--     guest, buyer, seller, admin, owner
--
--   This migration collapses them to exactly 3:
--     buyer, seller, admin
--
--   Mapping applied:
--     owner → admin  (platform owner uses admin role)
--     guest → buyer  (unauthenticated guests are treated as buyers)
--
-- STATUS: Already applied to live database (2026-04-08).
-- Run this file on any fresh or restored database to bring it
-- to the same state as the consolidated schema.
-- ================================================================

-- Step 1: Backfill legacy role values
UPDATE users SET role = 'admin' WHERE role = 'owner';
UPDATE users SET role = 'buyer' WHERE role = 'guest';

-- Step 2: Update dispute_messages.userRole for any legacy values
UPDATE dispute_messages SET "userRole" = 'admin' WHERE "userRole" = 'owner';
UPDATE dispute_messages SET "userRole" = 'buyer' WHERE "userRole" = 'guest';

-- Step 3: Replace the role CHECK constraint on users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('buyer', 'seller', 'admin'));

-- Step 4: Replace the userRole CHECK constraint on dispute_messages
ALTER TABLE dispute_messages DROP CONSTRAINT IF EXISTS dispute_messages_userRole_check;
ALTER TABLE dispute_messages ADD CONSTRAINT dispute_messages_userRole_check
  CHECK ("userRole" IN ('buyer', 'seller', 'admin'));

-- Step 5: Update is_admin_or_owner() to check only 'admin'
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 6: Update is_owner() alias to check only 'admin'
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 7: Update is_seller() to check only 'seller' (admin no longer included)
CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'seller'
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 8: Update handle_new_user_profile trigger to remove 'guest' branch
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'buyer' THEN
    INSERT INTO buyer_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO seller_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO seller_stores ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
