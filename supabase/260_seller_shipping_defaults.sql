-- Migration 260: Add shippingDefaults JSONB column to seller_profiles
-- Stores per-seller shipping preferences (carrier, dispatchTime, originPostcode, freeShippingThreshold)
-- so they persist across devices and browser sessions.

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "shippingDefaults" JSONB;
