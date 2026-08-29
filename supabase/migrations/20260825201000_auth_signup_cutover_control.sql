-- 676a_auth_signup_cutover_control.sql
-- Loadify Market — fail-safe overlap control for the Auth signup cutover.
--
-- The final/default state is strict: legacy server-side registration is OFF.
-- During the short production cutover only, operators may set the singleton row
-- to true so the legacy Netlify register endpoint and the new signup-intent flow
-- can coexist without a broken-signup window.
--
-- Security invariant:
--   * this flag is private operator state, never a client feature flag
--   * anon/authenticated/service_role receive no table access
--   * browser signups still cannot set Auth app_metadata
--   * Google remains provider-bound and fresh Facebook remains fail-closed

CREATE TABLE IF NOT EXISTS private.auth_signup_cutover_control (
  singleton boolean PRIMARY KEY DEFAULT true,
  allow_legacy_server_registration boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT auth_signup_cutover_control_singleton
    CHECK (singleton = true)
);

INSERT INTO private.auth_signup_cutover_control (
  singleton,
  allow_legacy_server_registration
)
VALUES (true, false)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE private.auth_signup_cutover_control ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private.auth_signup_cutover_control
  FROM PUBLIC, anon, authenticated, service_role;

DO $$
BEGIN
  IF has_table_privilege(
       'anon',
       'private.auth_signup_cutover_control',
       'SELECT'
     )
     OR has_table_privilege(
       'authenticated',
       'private.auth_signup_cutover_control',
       'SELECT'
     )
     OR has_table_privilege(
       'service_role',
       'private.auth_signup_cutover_control',
       'SELECT'
     )
  THEN
    RAISE EXCEPTION
      '676a auth signup cutover security failure: overlap control is externally readable';
  END IF;
END
$$;
