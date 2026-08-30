CREATE TABLE IF NOT EXISTS public.seller_order_status_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.csp_report_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

ALTER TABLE public.seller_order_status_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csp_report_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS seller_order_status_rl_lookup
  ON public.seller_order_status_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS csp_report_rl_lookup
  ON public.csp_report_rate_limits (identifier, "windowEnd");

REVOKE ALL ON TABLE public.seller_order_status_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.csp_report_rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.seller_order_status_rate_limits TO service_role;
GRANT ALL ON TABLE public.csp_report_rate_limits TO service_role;;
