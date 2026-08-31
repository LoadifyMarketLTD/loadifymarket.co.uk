BEGIN;

DO $cutover$
DECLARE
  v_row_count integer;
  v_overlap boolean;
BEGIN
  -- Serialize the cutover against any concurrent operator touching the singleton.
  PERFORM 1
  FROM private.auth_signup_cutover_control
  WHERE singleton = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'strict Auth cutover aborted: singleton overlap control is missing';
  END IF;

  UPDATE private.auth_signup_cutover_control
  SET allow_legacy_server_registration = false,
      updated_at = now()
  WHERE singleton = true;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'strict Auth cutover aborted: expected exactly one overlap control row, updated %', v_row_count;
  END IF;

  SELECT allow_legacy_server_registration
  INTO v_overlap
  FROM private.auth_signup_cutover_control
  WHERE singleton = true;

  IF v_overlap IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'strict Auth cutover aborted: legacy registration overlap remained enabled';
  END IF;
END
$cutover$;

COMMIT;
