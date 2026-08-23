-- 674_server_only_privilege_closure.sql
-- Release-hardening privilege cleanup.
--
-- A set of historical server-side rate-limit tables still inherited broad
-- anon/authenticated table grants. RLS with no policies currently denies those
-- accesses, but the grants are unnecessary privilege debt and make future RLS
-- changes riskier. Rate-limit state is a server concern and must remain private
-- to trusted server/service-role code.
--
-- category_filter_definitions also had inherited client CRUD grants while its
-- current RLS posture exposes no client policy and no runtime client consumer
-- exists. Keep it server-managed until a separately designed public filter
-- contract exists.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fq_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE '%\_rate\_limits' ESCAPE '\'
    ORDER BY c.relname
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', r.fq_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %s TO service_role', r.fq_name);
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.category_filter_definitions') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.category_filter_definitions
      FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_filter_definitions
      TO service_role;
  END IF;
END;
$$;

-- Fail closed if any ordinary API role still has CRUD rights on server-only
-- rate-limit relations after the cleanup.
DO $$
DECLARE
  v_offenders text[];
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname)
    INTO v_offenders
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relname LIKE '%\_rate\_limits' ESCAPE '\'
     AND (
       has_table_privilege('anon', c.oid, 'SELECT')
       OR has_table_privilege('anon', c.oid, 'INSERT')
       OR has_table_privilege('anon', c.oid, 'UPDATE')
       OR has_table_privilege('anon', c.oid, 'DELETE')
       OR has_table_privilege('authenticated', c.oid, 'SELECT')
       OR has_table_privilege('authenticated', c.oid, 'INSERT')
       OR has_table_privilege('authenticated', c.oid, 'UPDATE')
       OR has_table_privilege('authenticated', c.oid, 'DELETE')
     );

  IF v_offenders IS NOT NULL THEN
    RAISE EXCEPTION 'server-only rate-limit tables still expose client CRUD privileges: %', v_offenders;
  END IF;

  IF to_regclass('public.category_filter_definitions') IS NOT NULL
     AND (
       has_table_privilege('anon', 'public.category_filter_definitions', 'SELECT')
       OR has_table_privilege('anon', 'public.category_filter_definitions', 'INSERT')
       OR has_table_privilege('anon', 'public.category_filter_definitions', 'UPDATE')
       OR has_table_privilege('anon', 'public.category_filter_definitions', 'DELETE')
       OR has_table_privilege('authenticated', 'public.category_filter_definitions', 'SELECT')
       OR has_table_privilege('authenticated', 'public.category_filter_definitions', 'INSERT')
       OR has_table_privilege('authenticated', 'public.category_filter_definitions', 'UPDATE')
       OR has_table_privilege('authenticated', 'public.category_filter_definitions', 'DELETE')
     ) THEN
    RAISE EXCEPTION 'category_filter_definitions still exposes ordinary client CRUD privileges';
  END IF;
END;
$$;
