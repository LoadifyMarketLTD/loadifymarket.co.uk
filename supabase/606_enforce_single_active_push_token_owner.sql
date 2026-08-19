-- 606_enforce_single_active_push_token_owner.sql
--
-- Canonical device-ownership invariant:
-- one physical push token may have at most one active user owner at a time.
--
-- The server registration path already deactivates historical owners before
-- activating the current user. This database invariant closes the remaining
-- concurrency race where two registrations for the same physical token could
-- otherwise interleave and leave two active owners.
--
-- Existing duplicate active ownership is reconciled deterministically before
-- the unique index is created. The most recently updated row wins; createdAt
-- and id provide stable tie-breakers. Historical rows are retained inactive.
--
-- Do not depend on the migration runner wrapping multiple statements in one
-- transaction. The regular CREATE UNIQUE INDEX below is the fail-closed gate:
-- while the index is installed PostgreSQL blocks conflicting table writes, and
-- any duplicate active ownership that appears after reconciliation makes index
-- creation fail rather than silently accepting an invalid state. A failed
-- migration must be investigated/retried; it is never a PASS.

WITH ranked_active AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY token
      ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
    ) AS ownership_rank
  FROM public.push_tokens
  WHERE "isActive" = TRUE
)
UPDATE public.push_tokens AS pt
SET "isActive" = FALSE,
    "updatedAt" = NOW()
FROM ranked_active AS ranked
WHERE pt.id = ranked.id
  AND ranked.ownership_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_one_active_owner_per_token
  ON public.push_tokens (token)
  WHERE "isActive" = TRUE;

-- Guard against a stale/wrong object with the same index name and verify the
-- live data invariant before the migration can be considered successful.
DO $$
DECLARE
  v_is_unique boolean;
  v_is_valid boolean;
  v_key_definition text;
  v_predicate text;
BEGIN
  SELECT
    i.indisunique,
    i.indisvalid,
    pg_get_indexdef(i.indexrelid, 1, true),
    pg_get_expr(i.indpred, i.indrelid)
  INTO
    v_is_unique,
    v_is_valid,
    v_key_definition,
    v_predicate
  FROM pg_index AS i
  JOIN pg_class AS idx
    ON idx.oid = i.indexrelid
  JOIN pg_class AS tbl
    ON tbl.oid = i.indrelid
  JOIN pg_namespace AS ns
    ON ns.oid = tbl.relnamespace
  WHERE ns.nspname = 'public'
    AND tbl.relname = 'push_tokens'
    AND idx.relname = 'push_tokens_one_active_owner_per_token'
    AND i.indnkeyatts = 1;

  IF NOT FOUND
     OR NOT COALESCE(v_is_unique, false)
     OR NOT COALESCE(v_is_valid, false)
     OR v_key_definition IS DISTINCT FROM 'token'
     OR v_predicate IS NULL
     OR position('isActive' IN v_predicate) = 0
  THEN
    RAISE EXCEPTION
      'push token ownership invariant index is missing or has an unexpected definition';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.push_tokens
    WHERE "isActive" = TRUE
    GROUP BY token
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'duplicate active push token ownership remains after invariant installation';
  END IF;
END;
$$;

COMMENT ON INDEX public.push_tokens_one_active_owner_per_token IS
  'Privacy invariant: a physical push token can have at most one active Loadify user owner.';
