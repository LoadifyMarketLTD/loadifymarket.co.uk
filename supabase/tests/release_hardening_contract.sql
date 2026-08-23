BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

SELECT ok(
  to_regclass('public.delivery_requests') IS NULL,
  'legacy delivery_requests surface is absent after complete replay'
);

SELECT ok(
  to_regclass('public.transport_quotes') IS NULL,
  'legacy transport_quotes surface is absent after complete replay'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'seller_profiles_public'
       AND c.relkind IN ('r', 'p')
  ),
  'seller_profiles_public is a real projection table, not an owner-rights view'
);

SELECT ok(
  COALESCE((
    SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'seller_profiles_public'
  ), false),
  'seller_profiles_public has RLS enabled'
);

SELECT ok(
  has_table_privilege('anon', 'public.seller_profiles_public', 'SELECT')
  AND has_table_privilege('authenticated', 'public.seller_profiles_public', 'SELECT'),
  'ordinary marketplace roles retain read access to the public seller projection'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.seller_profiles_public', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.seller_profiles_public', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.seller_profiles_public', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.seller_profiles_public', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.seller_profiles_public', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.seller_profiles_public', 'DELETE'),
  'ordinary marketplace roles cannot mutate the public seller projection'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.sync_seller_suspension_from_user_activity()',
    'EXECUTE'
  ),
  'trigger-only seller suspension helper is not directly executable by authenticated clients'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
      FROM information_schema.role_table_grants g
     WHERE g.table_schema = 'public'
       AND g.table_name LIKE '%\_rate\_limits' ESCAPE '\'
       AND g.grantee IN ('anon', 'authenticated')
       AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  'server-only rate-limit tables expose no client CRUD grants'
);

SELECT ok(
  to_regclass('public.category_filter_definitions') IS NULL
  OR NOT EXISTS (
    SELECT 1
      FROM information_schema.role_table_grants g
     WHERE g.table_schema = 'public'
       AND g.table_name = 'category_filter_definitions'
       AND g.grantee IN ('anon', 'authenticated')
       AND g.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  'category_filter_definitions is absent or remains server-only after privilege closure'
);

SELECT * FROM finish();

ROLLBACK;
