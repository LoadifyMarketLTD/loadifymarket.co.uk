-- ================================================================
-- PART 1 — Extensions + Helper Functions
-- Loadify Market — Complete Supabase Schema
-- ================================================================
-- FIXED VERSION — use this instead of the original PART 1
--
-- KEY FIX: is_admin_or_owner(), is_owner(), is_seller() now use
-- LANGUAGE plpgsql instead of LANGUAGE sql.
-- This prevents "relation users does not exist" errors when the
-- function is DEFINED before the users table is CREATED.
-- With plpgsql, table references are validated at CALL TIME.
-- With sql, table references are validated at CREATION TIME.
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
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin','owner')
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'owner'
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('seller','admin','owner')
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
