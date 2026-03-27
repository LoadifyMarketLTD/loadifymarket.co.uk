-- Migration 230: Normalize legacy 'pending' sellerStatus values
-- ---------------------------------------------------------------
-- Before migration 210 introduced the canonical sellerStatus lifecycle
-- (draft → submitted → active / suspended), some sellers were inserted
-- with sellerStatus = 'pending'. This value is no longer valid per the
-- CHECK constraint ('draft','submitted','active','suspended') added by
-- the consolidated schema.
--
-- This migration converts any remaining 'pending' rows to 'submitted',
-- which is the nearest semantic equivalent (seller has started setup
-- but has not yet fully completed it / been auto-activated).

UPDATE seller_profiles
SET    "sellerStatus" = 'submitted'
WHERE  "sellerStatus" = 'pending';
