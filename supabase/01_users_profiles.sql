-- ================================================================
-- 01_users_profiles.sql
-- Loadify Market — Users & Profiles
-- ================================================================
-- Naming convention: camelCase quoted identifiers.
-- Depends on: extensions + helper functions (00_consolidated_schema
--             or PART 1 of the manual run order).
-- ================================================================

-- ── USERS ───────────────────────────────────────────────────────
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
CREATE TRIGGER trg_users_updatedAt BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── BUYER PROFILES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buyer_profiles (
  "userId"          UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "shippingAddress" JSONB,
  "billingAddress"  JSONB,
  preferences       JSONB,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_buyer_profiles_updatedAt BEFORE UPDATE ON buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SELLER PROFILES ──────────────────────────────────────────────
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
  "paymentBehaviour"          TEXT         CHECK ("paymentBehaviour" IN ('pays_on_time','sometimes_late','repeated_delays')),
  "isVerified"                BOOLEAN      NOT NULL DEFAULT FALSE,
  "profileCompleteness"       INTEGER      NOT NULL DEFAULT 0,
  "contactPhone"              TEXT,
  "createdAt"                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_approved     ON seller_profiles ("isApproved");
CREATE INDEX IF NOT EXISTS idx_seller_profiles_verification ON seller_profiles ("verificationStatus");
CREATE TRIGGER trg_seller_profiles_updatedAt BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── MIGRATE EXISTING SELLER_PROFILES TABLE ──────────────────────
-- Safe to run even when upgrading from an older schema that pre-dates
-- these columns.  Each statement is a no-op if the column already exists.
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "disputeRate"         DECIMAL(5,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "deliverySuccessRate" DECIMAL(5,4) NOT NULL DEFAULT 1.0000;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "responseTimeHours"   DECIMAL(5,2) NOT NULL DEFAULT 0.00;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "onTimeShipmentRate"  DECIMAL(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "marketplaceRole"     TEXT         CHECK ("marketplaceRole" IN ('carrier','broker','seller'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "paymentBehaviour"    TEXT         CHECK ("paymentBehaviour" IN ('pays_on_time','sometimes_late','repeated_delays'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "isVerified"          BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "profileCompleteness" INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "contactPhone"        TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "stripeConnectStatus" TEXT         CHECK ("stripeConnectStatus" IN ('pending', 'restricted', 'active'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "sellerStatus"        TEXT         NOT NULL DEFAULT 'draft' CHECK ("sellerStatus" IN ('draft', 'submitted', 'active', 'suspended'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "activatedAt"         TIMESTAMPTZ;

-- ── SELLER STORES ────────────────────────────────────────────────
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
CREATE TRIGGER trg_seller_stores_updatedAt BEFORE UPDATE ON seller_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SELLER VERIFICATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_verifications (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId"        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "docType"         TEXT        NOT NULL
                      CHECK ("docType" IN ('identity','business_registration','vat_certificate','proof_of_address','other')),
  "fileUrl"         TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  "reviewedBy"      UUID        REFERENCES users(id) ON DELETE SET NULL,
  "reviewedAt"      TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "uploadedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller ON seller_verifications ("sellerId");
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications (status);
CREATE TRIGGER trg_seller_verifications_updatedAt BEFORE UPDATE ON seller_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── AUTO-CREATE PROFILES ON REGISTRATION ────────────────────────
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

CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- ── AUTO-UPGRADE SELLER ON VERIFICATION ─────────────────────────
CREATE OR REPLACE FUNCTION handle_seller_verification_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."verificationStatus" = 'verified' AND OLD."verificationStatus" != 'verified' THEN
    NEW."isVerified"   = TRUE;
    NEW."listingLimit" = NULL;
    NEW."verifiedAt"   = NOW();
  END IF;
  IF NEW."verificationStatus" = 'suspended' AND OLD."verificationStatus" != 'suspended' THEN
    NEW."isVerified" = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seller_verification_upgrade
  BEFORE UPDATE OF "verificationStatus" ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_seller_verification_upgrade();
