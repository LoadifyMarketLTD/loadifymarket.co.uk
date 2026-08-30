CREATE TABLE IF NOT EXISTS private.auth_signup_cutover_control (
  singleton boolean PRIMARY KEY DEFAULT true,
  allow_legacy_server_registration boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_signup_cutover_control_singleton CHECK (singleton = true)
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
  IF has_table_privilege('anon','private.auth_signup_cutover_control','SELECT')
     OR has_table_privilege('authenticated','private.auth_signup_cutover_control','SELECT')
     OR has_table_privilege('service_role','private.auth_signup_cutover_control','SELECT')
  THEN
    RAISE EXCEPTION '676a auth signup cutover security failure: overlap control is externally readable';
  END IF;
END
$$;;
