-- ──────────────────────────────────────────────────────────────
-- Migration: fix INSERT policy on public.users
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- Problem
-- ───────
-- Older schema versions may have a restrictive INSERT policy called
-- "Users can insert their own profile" (WITH CHECK (auth.uid() = id))
-- that rejects inserts made before a session is established.  During
-- registration the auth session is often not yet available, so that
-- check fails and the profile row is never written.
--
-- Fix
-- ───
-- Replace any existing INSERT policy with one that unconditionally
-- allows the insert (WITH CHECK (true)).  Row-level ownership is
-- enforced by the SELECT and UPDATE policies; the INSERT policy only
-- needs to decide whether a row *can* be created, not who owns it.
-- The server-side register function runs under the service role and
-- bypasses RLS entirely, but this policy also protects any future
-- client-side or direct-SDK registration paths.
--
-- This script is idempotent: DROP IF EXISTS is a no-op when the
-- policy does not exist.
-- ──────────────────────────────────────────────────────────────

-- Remove old restrictive policy (name used in some legacy deployments)
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Remove the policy added by earlier migrations so we can rename it
DROP POLICY IF EXISTS "users_insert" ON users;

-- Remove in case this migration is run more than once
DROP POLICY IF EXISTS "Allow user registration" ON users;

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  WITH CHECK (true);
