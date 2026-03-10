-- ============================================================
-- 01_users_profiles.sql
-- Loadify Market — Users, Profiles & Seller Verification
-- ============================================================
-- Covers: users, buyer_profiles, seller_profiles,
--         seller_stores, seller_verifications
-- ============================================================

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- HELPER: auto-update updated_at
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- USERS
-- Mirrors auth.users from Supabase Auth.
-- Role hierarchy: owner > admin > seller > buyer > guest
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        UNIQUE NOT NULL,
  -- role: 'owner' is reserved for the platform owner only
  role                TEXT        NOT NULL DEFAULT 'buyer'
                        CHECK (role IN ('guest', 'buyer', 'seller', 'admin', 'owner')),
  marketplace_role    TEXT        CHECK (marketplace_role IN ('carrier', 'broker', 'seller')),
  first_name          TEXT,
  last_name           TEXT,
  phone               TEXT,
  avatar_url          TEXT,
  is_email_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active   ON users (is_active);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- BUYER PROFILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_profiles (
  user_id             UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  shipping_address    JSONB,      -- {line1, line2, city, postcode, country}
  billing_address     JSONB,
  preferences         JSONB,      -- e.g. preferred categories, currency
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_buyer_profiles_updated_at
  BEFORE UPDATE ON buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SELLER PROFILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id                     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Identity
  full_name                   TEXT,
  store_name                  TEXT,
  phone                       TEXT,
  country                     TEXT,
  -- Business
  business_name               TEXT,
  vat_number                  TEXT,
  company_registration_number TEXT,
  business_address            JSONB,
  -- Verification
  verification_status         TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  verified_at                 TIMESTAMPTZ,
  suspension_reason           TEXT,
  -- Stripe / payouts
  stripe_account_id           TEXT,
  payout_details              JSONB,      -- {accountHolderName, sortCode, accountNumber, bankName}
  -- Approval & commission
  is_approved                 BOOLEAN     NOT NULL DEFAULT FALSE,
  commission                  DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  -- Listing limits: 5 for unverified, unlimited (NULL) for verified
  listing_limit               INTEGER     DEFAULT 5,
  -- Reputation metrics (maintained by triggers / functions)
  rating                      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_sales                 INTEGER     NOT NULL DEFAULT 0,
  sales_count                 INTEGER     NOT NULL DEFAULT 0,
  dispute_rate                DECIMAL(5,4) NOT NULL DEFAULT 0.0000,  -- 0.0–1.0
  delivery_success_rate       DECIMAL(5,4) NOT NULL DEFAULT 1.0000,  -- 0.0–1.0
  response_time_hours         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  on_time_shipment_rate       DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  -- Marketplace role for transport/logistics sellers
  marketplace_role            TEXT        CHECK (marketplace_role IN ('carrier', 'broker', 'seller')),
  payment_behaviour           TEXT        CHECK (payment_behaviour IN ('pays_on_time', 'sometimes_late', 'repeated_delays')),
  is_verified                 BOOLEAN     NOT NULL DEFAULT FALSE,
  profile_completeness        INTEGER     NOT NULL DEFAULT 0,         -- 0–100
  contact_phone               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_approved         ON seller_profiles (is_approved);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification     ON seller_profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_marketplace_role ON seller_profiles (marketplace_role);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_payment_behaviour ON seller_profiles (payment_behaviour);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_rating           ON seller_profiles (rating DESC);

CREATE TRIGGER trg_seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SELLER STORES
-- Public-facing store page for each seller.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_stores (
  user_id             UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store_name          TEXT,
  store_slug          TEXT        UNIQUE,
  store_logo          TEXT,
  store_description   TEXT,
  store_banner        TEXT,
  social_links        JSONB,      -- {website, instagram, facebook, twitter, linkedin}
  return_policy       TEXT,
  shipping_policy     TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_stores_slug    ON seller_stores (store_slug);
CREATE INDEX IF NOT EXISTS idx_seller_stores_active  ON seller_stores (is_active);

CREATE TRIGGER trg_seller_stores_updated_at
  BEFORE UPDATE ON seller_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SELLER VERIFICATIONS
-- Tracks identity / business documents submitted by sellers.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_verifications (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type            TEXT        NOT NULL
                        CHECK (doc_type IN (
                          'identity',
                          'business_registration',
                          'vat_certificate',
                          'proof_of_address',
                          'other'
                        )),
  file_url            TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by         UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller  ON seller_verifications (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status  ON seller_verifications (status);

CREATE TRIGGER trg_seller_verifications_updated_at
  BEFORE UPDATE ON seller_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: auto-create buyer/seller profile on user insert
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('buyer', 'guest') THEN
    INSERT INTO buyer_profiles (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO seller_profiles (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    INSERT INTO seller_stores (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: auto-upgrade listing_limit when seller is verified
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_seller_verification_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    NEW.is_verified    = TRUE;
    NEW.listing_limit  = NULL;  -- unlimited
    NEW.verified_at    = NOW();
  END IF;
  IF NEW.verification_status = 'suspended' AND OLD.verification_status != 'suspended' THEN
    NEW.is_verified = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seller_verification_upgrade
  BEFORE UPDATE OF verification_status ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_seller_verification_upgrade();
