-- Loadify Market — hosted security / privilege contract verifier
--
-- READ-ONLY. This script performs catalog inspection only. It must return
-- ZERO ROWS for PASS. Any returned row is a security-contract violation that
-- must be investigated before release.
--
-- This deliberately distinguishes:
--   * RLS enabled with no policy + no client grants => intentional deny-by-default;
--   * RLS disabled on a public base table => violation;
--   * private tables with anon/authenticated privileges => violation;
--   * server-only Supplier Commerce RPCs executable by clients => violation;
--   * Auth signup-intent server/hook RPC privilege drift => violation.

WITH violations AS (
  -- Every public base table must have RLS enabled.
  SELECT
    'PUBLIC_TABLE_WITHOUT_RLS'::text AS violation,
    format('%I.%I', n.nspname, c.relname) AS object_name,
    'public base table has RLS disabled'::text AS detail
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity

  UNION ALL

  -- A no-policy public table is acceptable only when both browser roles have
  -- no table privileges at all. This captures deny-by-default server tables.
  SELECT
    'NO_POLICY_TABLE_HAS_CLIENT_PRIVILEGE',
    format('%I.%I', n.nspname, c.relname),
    'RLS is enabled with zero policies but anon/authenticated still has a table privilege'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
    AND (
      has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    )

  UNION ALL

  -- private is a server-owned schema. Browser roles must never acquire direct
  -- privileges regardless of whether a particular table also uses RLS.
  SELECT
    'PRIVATE_TABLE_CLIENT_PRIVILEGE',
    format('%I.%I', n.nspname, c.relname),
    'anon/authenticated has direct privilege on private table'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'private'
    AND c.relkind = 'r'
    AND (
      has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    )

  UNION ALL

  -- Canonical Supplier Commerce / server mutation RPCs are server-only. Their
  -- function names form an explicit boundary in the hosted contract.
  SELECT
    'SERVER_RPC_CLIENT_EXECUTE',
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    'server_/supplier_ RPC is executable by anon or authenticated'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (p.proname LIKE 'server\_%' ESCAPE '\' OR p.proname LIKE 'supplier\_%' ESCAPE '\')
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )

  UNION ALL

  -- Signup-intent creation is a service-owned boundary. Browser roles submit
  -- through Netlify/server functions, never directly through PostgREST RPC.
  SELECT
    'SIGNUP_INTENT_RPC_CLIENT_EXECUTE',
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    'signup-intent RPC is executable by anon or authenticated'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('create_signup_intent', 'create_social_signup_intent')
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )

  UNION ALL

  -- The Before User Created hook helper must not be callable by browser roles
  -- or by PostgreSQL PUBLIC. ACL grantee OID 0 represents PUBLIC.
  SELECT
    'AUTH_HOOK_CLIENT_EXECUTE',
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    'Before User Created hook helper is executable by anon/authenticated/PUBLIC'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'before_user_created_validate_signup_intent'
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      OR EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
        WHERE acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
    )

  UNION ALL

  -- If the hosted hook helper exists, Supabase Auth itself must retain EXECUTE.
  SELECT
    'AUTH_HOOK_MISSING_AUTH_ADMIN_EXECUTE',
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    'supabase_auth_admin cannot execute Before User Created hook helper'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'before_user_created_validate_signup_intent'
    AND NOT has_function_privilege('supabase_auth_admin', p.oid, 'EXECUTE')
)
SELECT violation, object_name, detail
FROM violations
ORDER BY violation, object_name;
