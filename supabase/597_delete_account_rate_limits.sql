-- 597_delete_account_rate_limits.sql
-- Dedicated service-role-only rate limit storage for destructive account deletion.

CREATE TABLE IF NOT EXISTS public.delete_account_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  "windowEnd" timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

ALTER TABLE public.delete_account_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS delete_account_rl_lookup
  ON public.delete_account_rate_limits (identifier, "windowEnd");

REVOKE ALL ON public.delete_account_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delete_account_rate_limits TO service_role;
