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

COMMENT ON INDEX public.push_tokens_one_active_owner_per_token IS
  'Privacy invariant: a physical push token can have at most one active Loadify user owner.';
