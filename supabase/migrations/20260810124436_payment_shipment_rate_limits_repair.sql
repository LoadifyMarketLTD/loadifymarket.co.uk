CREATE TABLE IF NOT EXISTS public.create_checkout_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.create_payment_intent_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.create_refund_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.rfq_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.create_shipment_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.update_shipment_status_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.upload_proof_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

CREATE TABLE IF NOT EXISTS public.admin_sellers_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts    INT         NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

ALTER TABLE public.create_checkout_rate_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.create_payment_intent_rate_limits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.create_refund_rate_limits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_rate_limits                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.create_shipment_rate_limits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_shipment_status_rate_limits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_proof_rate_limits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sellers_rate_limits             ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS create_checkout_rl_lookup
  ON public.create_checkout_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS create_payment_intent_rl_lookup
  ON public.create_payment_intent_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS create_refund_rl_lookup
  ON public.create_refund_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS rfq_rl_lookup
  ON public.rfq_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS create_shipment_rl_lookup
  ON public.create_shipment_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS update_shipment_status_rl_lookup
  ON public.update_shipment_status_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS upload_proof_rl_lookup
  ON public.upload_proof_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS admin_sellers_rl_lookup
  ON public.admin_sellers_rate_limits (identifier, "windowEnd");

REVOKE ALL ON TABLE public.create_checkout_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.create_payment_intent_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.create_refund_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.rfq_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.create_shipment_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.update_shipment_status_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.upload_proof_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_sellers_rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.create_checkout_rate_limits TO service_role;
GRANT ALL ON TABLE public.create_payment_intent_rate_limits TO service_role;
GRANT ALL ON TABLE public.create_refund_rate_limits TO service_role;
GRANT ALL ON TABLE public.rfq_rate_limits TO service_role;
GRANT ALL ON TABLE public.create_shipment_rate_limits TO service_role;
GRANT ALL ON TABLE public.update_shipment_status_rate_limits TO service_role;
GRANT ALL ON TABLE public.upload_proof_rate_limits TO service_role;
GRANT ALL ON TABLE public.admin_sellers_rate_limits TO service_role;;
