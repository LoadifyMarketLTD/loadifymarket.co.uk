-- Loadify Market hosted schema audit — Docker-free, read-only
--
-- Purpose:
--   Replace `supabase db dump --linked --schema public` for hosted forensic/audit
--   work where Docker Desktop is unavailable. Supabase CLI db dump shells out to
--   PostgreSQL tooling in a Docker image; this query reads PostgreSQL catalogues
--   directly and therefore needs no Docker engine.
--
-- Safety:
--   SELECT-only. No DDL, DML, RPC mutation, trigger execution or migration write.
--   Intended to be executed through an authenticated read-only PostgreSQL/Supabase
--   connection (for ChatGPT audits, the connected Supabase read-only executor).
--
-- The result is a single JSON document so it can be captured as one audit artifact.

WITH
schemas AS (
  SELECT n.oid, n.nspname
  FROM pg_namespace n
  WHERE n.nspname IN ('public', 'private')
),
tables AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'private')
    AND c.relkind IN ('r', 'p')
),
columns AS (
  SELECT
    c.table_schema AS schema_name,
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns c
  WHERE c.table_schema IN ('public', 'private')
),
policies AS (
  SELECT
    p.schemaname AS schema_name,
    p.tablename AS table_name,
    p.policyname,
    p.permissive,
    p.roles,
    p.cmd,
    p.qual,
    p.with_check
  FROM pg_policies p
  WHERE p.schemaname IN ('public', 'private')
),
triggers AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    t.tgname AS trigger_name,
    pg_get_triggerdef(t.oid, true) AS definition
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal
    AND n.nspname IN ('public', 'private')
),
indexes AS (
  SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    indexname,
    indexdef
  FROM pg_indexes
  WHERE schemaname IN ('public', 'private')
),
functions AS (
  SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private')
),
migrations AS (
  SELECT version
  FROM supabase_migrations.schema_migrations
  ORDER BY version
)
SELECT jsonb_build_object(
  'captured_at', now(),
  'database', current_database(),
  'database_user', current_user,
  'summary', jsonb_build_object(
    'public_tables', (SELECT count(*) FROM tables WHERE schema_name = 'public'),
    'private_tables', (SELECT count(*) FROM tables WHERE schema_name = 'private'),
    'public_policies', (SELECT count(*) FROM policies WHERE schema_name = 'public'),
    'public_triggers', (SELECT count(*) FROM triggers WHERE schema_name = 'public'),
    'public_functions', (SELECT count(*) FROM functions WHERE schema_name = 'public'),
    'private_functions', (SELECT count(*) FROM functions WHERE schema_name = 'private')
  ),
  'tables', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY schema_name, table_name) FROM tables t), '[]'::jsonb),
  'columns', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY schema_name, table_name, ordinal_position) FROM columns c), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY schema_name, table_name, policyname) FROM policies p), '[]'::jsonb),
  'triggers', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY schema_name, table_name, trigger_name) FROM triggers t), '[]'::jsonb),
  'indexes', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY schema_name, table_name, indexname) FROM indexes i), '[]'::jsonb),
  'functions', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY schema_name, function_name, identity_arguments) FROM functions f), '[]'::jsonb),
  'migration_versions', COALESCE((SELECT jsonb_agg(version ORDER BY version) FROM migrations), '[]'::jsonb)
) AS hosted_schema_audit;
