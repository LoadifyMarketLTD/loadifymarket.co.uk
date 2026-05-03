-- ================================================================
-- 530_seller_type_compliance.sql
-- Loadify Market — Seller type & compliance columns
-- ================================================================
-- Adds:
--   seller_profiles.sellerType            — 'individual' | 'sole_trader' | 'company'
--   seller_profiles.requiresAdminApproval — true when admin must approve before activation
--   seller_profiles.isVatRegistered       — true when seller declares VAT registration
--
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- ================================================================

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "sellerType"
    TEXT CHECK ("sellerType" IN ('individual', 'sole_trader', 'company'));

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "requiresAdminApproval"
    BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "isVatRegistered"
    BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN seller_profiles."sellerType" IS
  'Seller account type captured at registration: individual, sole_trader, or company.';

COMMENT ON COLUMN seller_profiles."requiresAdminApproval" IS
  'When true the seller cannot auto-activate via Stripe alone — '
  'admin must explicitly approve via admin-sellers (op=approve).';

COMMENT ON COLUMN seller_profiles."isVatRegistered" IS
  'Seller self-declares VAT registration. When true, vatNumber is required for profile completion.';
