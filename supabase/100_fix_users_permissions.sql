-- ──────────────────────────────────────────────────────────────
-- Migration: grant table-level permissions for anon + authenticated
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) on
-- the live project if users receive "permission denied for table …"
-- errors — most visibly the "permission denied for table users"
-- error shown on the Create Account page.
--
-- Root cause
-- ──────────
-- Supabase exposes the PostgREST API under two PostgreSQL roles:
--   • anon         — unauthenticated requests (public browsing + signup)
--   • authenticated — requests that carry a valid JWT (logged-in users)
--
-- When tables are created via SQL migrations (rather than through the
-- Supabase Dashboard), these roles receive no automatic privileges.
-- PostgreSQL therefore rejects every API query with "permission denied"
-- BEFORE RLS policies are even evaluated.
--
-- Fix
-- ───
-- Grant the minimum required object-level privileges, then let RLS
-- policies (already defined in earlier migrations) enforce row-level
-- restrictions.
--
-- This script is fully idempotent: GRANT is a no-op when the privilege
-- is already held.
-- ──────────────────────────────────────────────────────────────

-- ── AUTHENTICATED role ────────────────────────────────────────────
-- DML access to all tables and sequences; RLS enforces row-level
-- restrictions so granting SELECT/INSERT/UPDATE/DELETE here is safe.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── ANON role ─────────────────────────────────────────────────────
-- Read access to all tables (RLS hides private rows).
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO anon;
GRANT USAGE  ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Signup: INSERT into users before email confirmation.
-- When Supabase Auth requires email confirmation, data.session is null
-- immediately after signUp(), so the profile INSERT runs under the anon
-- role.  The RLS policy "users_insert" (WITH CHECK (TRUE)) already
-- allows this — we just need the object-level GRANT to match.
GRANT INSERT ON public.users TO anon;

-- Public-facing write operations that do not require authentication
GRANT INSERT ON public.recently_viewed   TO anon;
GRANT INSERT ON public.rfq_requests      TO anon;
GRANT INSERT ON public.delivery_requests TO anon;
GRANT INSERT ON public.coupon_usage      TO anon;
GRANT INSERT ON public.product_analytics TO anon;
