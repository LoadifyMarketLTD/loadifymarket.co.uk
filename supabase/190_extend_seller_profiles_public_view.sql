-- ================================================================
-- 190_extend_seller_profiles_public_view.sql
-- Loadify Market — Extend seller_profiles_public with safe public fields
-- ================================================================
-- Migration 170 created seller_profiles_public but omitted three fields
-- that public pages legitimately display:
--   • businessAddress (JSONB: city/country shown on seller profile page)
--   • contactPhone    (TEXT:  shown on seller profile page)
--   • totalSales      (INT:   displayed as sales count on seller profile)
--
-- These are non-sensitive public-facing seller details.
-- Sensitive fields remain excluded: commission, listingLimit,
--   stripeAccountId, stripeConnectStatus, verificationDocuments, etc.
--
-- Run AFTER migration 170.
-- ================================================================

DROP VIEW IF EXISTS seller_profiles_public;

CREATE VIEW seller_profiles_public AS
SELECT
  id,
  "userId",
  "businessName",
  "businessType",
  "marketplaceRole",
  "isApproved",
  "verificationStatus",
  "rating",
  "reviewCount",
  "salesCount",
  "totalSales",
  "responseRate",
  "deliverySuccessRate",
  "paymentBehaviour",
  "businessAddress",
  "contactPhone",
  "createdAt"
FROM seller_profiles;

-- Re-grant SELECT to anon and authenticated (DROP VIEW removes grants).
GRANT SELECT ON seller_profiles_public TO anon, authenticated;

COMMENT ON VIEW seller_profiles_public IS
  'Safe public projection of seller_profiles. Excludes commission, '
  'listingLimit, stripeAccountId, stripeConnectStatus, verificationDocuments.';
