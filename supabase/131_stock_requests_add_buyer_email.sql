-- ================================================================
-- 131_stock_requests_add_buyer_email.sql
-- Loadify Market — Patch: add buyer_email to stock_requests
-- ================================================================
-- Run this on any live Supabase database that was migrated before
-- buyer_email was added to migration 130_stock_requests.sql.
-- Migration 130 now includes buyer_email in the CREATE TABLE, so
-- fresh deployments do not need this script.
-- The IF NOT EXISTS guard makes this safe to re-run on any DB.
-- ================================================================

ALTER TABLE stock_requests
  ADD COLUMN IF NOT EXISTS buyer_email TEXT NOT NULL DEFAULT '';
