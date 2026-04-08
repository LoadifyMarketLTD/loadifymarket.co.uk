-- Migration 270: Add isPaused boolean column to seller_profiles
-- Stores the seller's pause state in the database so it persists
-- across devices and browser sessions (replaces localStorage approach).

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS "isPaused" BOOLEAN NOT NULL DEFAULT FALSE;
