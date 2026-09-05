-- Loadify Market production hardening.
--
-- Scope:
--   1) make future public-schema API exposure opt-in for ordinary client roles;
--   2) remove two semantically identical permissive RLS policies confirmed live.
--
-- Existing object grants are intentionally unchanged here. Runtime contracts must
-- continue to be reviewed per relation; this migration only changes defaults for
-- objects created after it is applied.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Exact live duplicates verified on 2026-09-04. Keep one canonical policy in
-- each pair; removing the duplicate does not widen or narrow row access.
DROP POLICY IF EXISTS "Acces vanzator dispute"
  ON public.disputes_and_returns;

DROP POLICY IF EXISTS "Acces vanzator feed-uri sync"
  ON public.vendor_sync_feeds;

DO $$
DECLARE
  v_postgres_oid oid := (SELECT oid FROM pg_roles WHERE rolname = 'postgres');
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    JOIN pg_roles grantee ON grantee.oid = a.grantee
    WHERE d.defaclrole = v_postgres_oid
      AND n.nspname = 'public'
      AND grantee.rolname IN ('anon', 'authenticated')
      AND d.defaclobjtype IN ('r', 'S', 'f')
  ) THEN
    RAISE EXCEPTION 'public default privileges still auto-grant API access to anon/authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'disputes_and_returns'
      AND policyname = 'Acces vanzator dispute'
  ) THEN
    RAISE EXCEPTION 'duplicate disputes_and_returns policy was not removed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendor_sync_feeds'
      AND policyname = 'Acces vanzator feed-uri sync'
  ) THEN
    RAISE EXCEPTION 'duplicate vendor_sync_feeds policy was not removed';
  END IF;
END;
$$;
