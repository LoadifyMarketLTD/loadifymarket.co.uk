-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 320: sync isEmailVerified from Supabase Auth
--
-- The custom public.users table stores an isEmailVerified boolean that is set
-- to TRUE by register.ts (email_confirm: true) at signup time.  However, users
-- created via alternative paths (admin API, manual insert, backfill) may have
-- isEmailVerified = FALSE even though their email IS confirmed in Supabase Auth
-- (auth.users.email_confirmed_at is set).
--
-- This migration syncs the custom table so isEmailVerified always reflects the
-- real auth state.  It is idempotent — safe to run multiple times.
--
-- Note: isEmailVerified is NOT used for access control anywhere in the app
-- (RequireSeller, RequireBuyer, RLS policies).  This fix ensures the admin
-- panel (AdminSellerDetailPage) shows accurate information and prevents
-- misleading "email not verified" displays when the account is fully confirmed.
-- ──────────────────────────────────────────────────────────────────────────────

-- Update all users whose email is confirmed in Supabase Auth but whose custom
-- row still shows isEmailVerified = FALSE.
UPDATE public.users u
SET "isEmailVerified" = TRUE
FROM auth.users a
WHERE u.id = a.id
  AND a.email_confirmed_at IS NOT NULL
  AND u."isEmailVerified" = FALSE;
