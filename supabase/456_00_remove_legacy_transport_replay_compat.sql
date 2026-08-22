-- 456_00_remove_legacy_transport_replay_compat.sql
--
-- Close the narrow fresh-rebuild compatibility window opened by
-- 09_zz_legacy_transport_replay_compat.sql.
--
-- Migrations 10, 20, 100 and 455 contain historical statements for the old
-- delivery-request / transport-quote subsystem. Migration 455 is the final
-- numeric bootstrap file that still references those relations. They are not
-- part of the current Loadify product and must not survive the replay.

DROP TABLE IF EXISTS public.transport_quotes CASCADE;
DROP TABLE IF EXISTS public.delivery_requests CASCADE;

DO $$
BEGIN
  IF to_regclass('public.transport_quotes') IS NOT NULL
     OR to_regclass('public.delivery_requests') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy transport replay compatibility surfaces were not removed';
  END IF;
END;
$$;
