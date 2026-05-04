-- ─────────────────────────────────────────────────────────────────────────────
-- 540_user_display_names_view.sql
--
-- Exposes a minimal safe view for resolving other participants' display names
-- in the messaging UI (MobileInboxPage, MobileChatPage).
--
-- POLICY ALIGNMENT:
--   The base `users` table has `users_select: auth.uid() = id OR is_admin()`,
--   which intentionally blocks any authenticated user from reading another
--   user's full profile row (email, role, isActive, etc.).
--
--   This view provides an explicit, intentionally narrow channel:
--     • Only `id`, `firstName`, and `lastName` are exposed — no email,
--       no role, no stripe data, no sensitive fields.
--     • Access is restricted to the `authenticated` role only (not anon),
--       so unauthenticated visitors cannot enumerate user names.
--     • The base `users_select` RLS policy is NOT modified.
--
-- USAGE:
--   SELECT id, "firstName", "lastName" FROM user_display_names WHERE id = ANY(...)
--   Available to any logged-in user; used exclusively for resolving conversation
--   participant names in the inbox/chat screens.
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS user_display_names;

CREATE VIEW user_display_names AS
  SELECT
    id,
    "firstName",
    "lastName"
  FROM public.users;

-- Grant read access to authenticated users only (not anon).
GRANT SELECT ON user_display_names TO authenticated;

-- Explicitly deny anon access in case of a blanket future GRANT.
REVOKE SELECT ON user_display_names FROM anon;

COMMENT ON VIEW user_display_names IS
  'Minimal safe view exposing only id + first/last name for authenticated '
  'users. Used by the messaging UI to resolve conversation participant names '
  'without exposing email, role, or any other sensitive profile fields. '
  'The base users_select RLS policy is NOT changed by this view.';
