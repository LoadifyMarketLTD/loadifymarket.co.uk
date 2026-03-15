-- ──────────────────────────────────────────────────────────────
-- Migration: create public.users and related auth tables
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) on
-- the live project if the visible public tables are:
--   categories, listings, order_items, orders, profiles
-- …and the public.users table is missing.
--
-- This script is fully idempotent: it uses IF NOT EXISTS / ON CONFLICT
-- guards so it is safe to run multiple times.
-- ──────────────────────────────────────────────────────────────

-- Enable UUID extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: auto-update updatedAt column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- public.users
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        UNIQUE NOT NULL,
  role              TEXT        NOT NULL DEFAULT 'buyer'
                      CHECK (role IN ('guest','buyer','seller','admin','owner')),
  "marketplaceRole" TEXT        CHECK ("marketplaceRole" IN ('carrier','broker','seller')),
  "firstName"       TEXT,
  "lastName"        TEXT,
  phone             TEXT,
  "avatarUrl"       TEXT,
  "isEmailVerified" BOOLEAN     NOT NULL DEFAULT FALSE,
  "isActive"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users ("isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updatedAt'
  ) THEN
    CREATE TRIGGER "trg_users_updatedAt"
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- public.buyer_profiles
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_profiles (
  "userId"          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "shippingAddress" JSONB,
  "billingAddress"  JSONB,
  preferences       JSONB,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_buyer_profiles_updatedAt'
  ) THEN
    CREATE TRIGGER "trg_buyer_profiles_updatedAt"
      BEFORE UPDATE ON buyer_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- public.seller_profiles
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_profiles (
  "userId"                    UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "fullName"                  TEXT,
  "storeName"                 TEXT,
  phone                       TEXT,
  country                     TEXT,
  "businessName"              TEXT,
  "vatNumber"                 TEXT,
  "companyRegistrationNumber" TEXT,
  "businessAddress"           JSONB,
  "verificationStatus"        TEXT         NOT NULL DEFAULT 'pending'
                                CHECK ("verificationStatus" IN ('pending','verified','rejected','suspended')),
  "verifiedAt"                TIMESTAMPTZ,
  "suspensionReason"          TEXT,
  "stripeAccountId"           TEXT,
  "payoutDetails"             JSONB,
  "isApproved"                BOOLEAN      NOT NULL DEFAULT FALSE,
  commission                  DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  "listingLimit"              INTEGER      DEFAULT 5,
  rating                      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  "totalSales"                INTEGER      NOT NULL DEFAULT 0,
  "salesCount"                INTEGER      NOT NULL DEFAULT 0,
  "disputeRate"               DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  "deliverySuccessRate"       DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
  "responseTimeHours"         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  "onTimeShipmentRate"        DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  "marketplaceRole"           TEXT         CHECK ("marketplaceRole" IN ('carrier','broker','seller')),
  "isVerified"                BOOLEAN      NOT NULL DEFAULT FALSE,
  "profileCompleteness"       INTEGER      NOT NULL DEFAULT 0,
  "createdAt"                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_approved     ON seller_profiles ("isApproved");
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification ON seller_profiles ("verificationStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_seller_profiles_updatedAt'
  ) THEN
    CREATE TRIGGER "trg_seller_profiles_updatedAt"
      BEFORE UPDATE ON seller_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- public.seller_stores
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_stores (
  "userId"           UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "storeName"        TEXT,
  "storeSlug"        TEXT        UNIQUE,
  "storeLogo"        TEXT,
  "storeDescription" TEXT,
  "storeBanner"      TEXT,
  "socialLinks"      JSONB,
  "returnPolicy"     TEXT,
  "shippingPolicy"   TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_stores_slug   ON seller_stores ("storeSlug");
CREATE INDEX IF NOT EXISTS idx_seller_stores_active ON seller_stores ("isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_seller_stores_updatedAt'
  ) THEN
    CREATE TRIGGER "trg_seller_stores_updatedAt"
      BEFORE UPDATE ON seller_stores
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Trigger: auto-create profile rows when a user row is inserted
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('buyer','guest') THEN
    INSERT INTO buyer_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO seller_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO seller_stores ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_user_profile'
  ) THEN
    CREATE TRIGGER trg_new_user_profile
      AFTER INSERT ON users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_stores   ENABLE ROW LEVEL SECURITY;

-- Helper functions (no-ops if they already exist)
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin','owner')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop & recreate policies idempotently
DO $$
BEGIN
  -- users
  DROP POLICY IF EXISTS "users_select" ON users;
  DROP POLICY IF EXISTS "users_update" ON users;
  DROP POLICY IF EXISTS "users_insert" ON users;
  DROP POLICY IF EXISTS "users_delete" ON users;

  CREATE POLICY "users_select" ON users FOR SELECT
    USING (auth.uid() = id OR is_admin_or_owner());
  CREATE POLICY "users_update" ON users FOR UPDATE
    USING (auth.uid() = id OR is_admin_or_owner());
  -- Allow unauthenticated inserts so signUp can write the profile row
  -- before email confirmation (session may be null at that point).
  CREATE POLICY "users_insert" ON users FOR INSERT
    WITH CHECK (TRUE);
  CREATE POLICY "users_delete" ON users FOR DELETE
    USING (is_admin_or_owner());

  -- buyer_profiles
  DROP POLICY IF EXISTS "buyer_profiles_all" ON buyer_profiles;
  CREATE POLICY "buyer_profiles_all" ON buyer_profiles FOR ALL
    USING (auth.uid() = "userId" OR is_admin_or_owner())
    WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

  -- seller_profiles
  DROP POLICY IF EXISTS "seller_profiles_select" ON seller_profiles;
  DROP POLICY IF EXISTS "seller_profiles_update" ON seller_profiles;
  DROP POLICY IF EXISTS "seller_profiles_insert" ON seller_profiles;
  DROP POLICY IF EXISTS "seller_profiles_delete" ON seller_profiles;
  CREATE POLICY "seller_profiles_select" ON seller_profiles FOR SELECT USING (TRUE);
  CREATE POLICY "seller_profiles_update" ON seller_profiles FOR UPDATE
    USING (auth.uid() = "userId" OR is_admin_or_owner());
  CREATE POLICY "seller_profiles_insert" ON seller_profiles FOR INSERT
    WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());
  CREATE POLICY "seller_profiles_delete" ON seller_profiles FOR DELETE
    USING (is_admin_or_owner());

  -- seller_stores
  DROP POLICY IF EXISTS "seller_stores_select" ON seller_stores;
  DROP POLICY IF EXISTS "seller_stores_manage" ON seller_stores;
  CREATE POLICY "seller_stores_select" ON seller_stores FOR SELECT
    USING ("isActive" = TRUE OR auth.uid() = "userId" OR is_admin_or_owner());
  CREATE POLICY "seller_stores_manage" ON seller_stores FOR ALL
    USING (auth.uid() = "userId" OR is_admin_or_owner())
    WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());
END $$;

-- ──────────────────────────────────────────────────────────────
-- Backfill: if existing auth.users have no matching public.users
-- row (e.g. previously failed registrations), create stubs so
-- those accounts become usable immediately.
-- ──────────────────────────────────────────────────────────────
INSERT INTO users (id, email, role, "isEmailVerified")
SELECT
  a.id,
  a.email,
  COALESCE((a.raw_user_meta_data->>'role')::text, 'buyer'),
  (a.email_confirmed_at IS NOT NULL)
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.id)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- Object-level permissions
--
-- Without these GRANTs, PostgreSQL rejects every API request with
-- "permission denied for table …" before RLS policies are evaluated.
-- The "authenticated" and "anon" roles are used by PostgREST for
-- logged-in and anonymous API requests respectively.
-- ──────────────────────────────────────────────────────────────

-- Authenticated users: full table access (RLS restricts rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anonymous users: read access everywhere (RLS hides private rows)
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO anon;
GRANT USAGE  ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Signup: INSERT into users before email confirmation.
-- When email confirmation is required, the session is null right after
-- supabase.auth.signUp(), so the profile INSERT runs as the anon role.
-- The RLS policy "users_insert" (WITH CHECK (TRUE)) already permits
-- this row — the GRANT below provides the required object-level access.
GRANT INSERT ON public.users             TO anon;

-- Other public-facing write operations that do not require a session
GRANT INSERT ON public.recently_viewed   TO anon;
GRANT INSERT ON public.rfq_requests      TO anon;
GRANT INSERT ON public.delivery_requests TO anon;
GRANT INSERT ON public.coupon_usage      TO anon;
GRANT INSERT ON public.product_analytics TO anon;
