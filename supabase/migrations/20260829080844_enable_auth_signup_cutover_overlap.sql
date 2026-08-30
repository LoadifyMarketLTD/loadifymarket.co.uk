UPDATE private.auth_signup_cutover_control
SET allow_legacy_server_registration = true,
    updated_at = now()
WHERE singleton = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM private.auth_signup_cutover_control
    WHERE singleton = true
      AND allow_legacy_server_registration = true
  ) THEN
    RAISE EXCEPTION 'Auth signup cutover overlap did not enable';
  END IF;
END
$$;;
