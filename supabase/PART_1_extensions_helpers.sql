-- ================================================================
-- PART 1 — Extensions + Helper Functions
-- Loadify Market — Complete Supabase Schema
-- ================================================================
-- Run this FIRST, before any other SQL file.
-- All functions use LANGUAGE plpgsql so that references to the
-- "users" table are resolved at CALL TIME, not at creation time.
-- This means you can safely create these functions before the
-- users table exists.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── updated_at trigger — camelCase tables ───────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── updated_at trigger — snake_case tables (shipments) ──────────
CREATE OR REPLACE FUNCTION update_updated_at_column_snake()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Admin/Owner helper ──────────────────────────────────────────
-- LANGUAGE plpgsql: table resolved at call time, not creation time
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin')
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Backward-compat alias: is_owner() was removed; delegates to is_admin().
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'seller'
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
