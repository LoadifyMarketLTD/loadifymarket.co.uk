DO $do$
DECLARE
  r record;
  v_cols text;
  v_index_name text;
BEGIN
  FOR r IN
    SELECT c.oid, n.nspname, t.relname, c.conname, c.conkey, c.conrelid
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND i.indisvalid
          AND (i.indkey::smallint[])[0:cardinality(c.conkey)-1] = c.conkey
      )
    ORDER BY t.relname, c.conname
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO v_cols
    FROM unnest(r.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = r.conrelid
     AND a.attnum = k.attnum;

    v_index_name := left('idx_fk_' || r.relname || '_' || regexp_replace(r.conname, '_fkey$', ''), 63);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)',
      v_index_name,
      r.nspname,
      r.relname,
      v_cols
    );
  END LOOP;
END
$do$;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS unique_email;;
