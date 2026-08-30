CREATE TABLE IF NOT EXISTS public.send_message_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.conversation_offer_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.offer_accept_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.offer_decline_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.checkout_offer_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.push_token_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.create_product_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);
CREATE TABLE IF NOT EXISTS public.update_product_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "windowEnd" TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 1,
  UNIQUE (identifier, "windowEnd")
);

ALTER TABLE public.send_message_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_offer_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_accept_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_decline_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_offer_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_token_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.create_product_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_product_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS send_message_rl_lookup ON public.send_message_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS conversation_offer_rl_lookup ON public.conversation_offer_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS offer_accept_rl_lookup ON public.offer_accept_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS offer_decline_rl_lookup ON public.offer_decline_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS checkout_offer_rl_lookup ON public.checkout_offer_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS push_token_rl_lookup ON public.push_token_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS create_product_rl_lookup ON public.create_product_rate_limits (identifier, "windowEnd");
CREATE INDEX IF NOT EXISTS update_product_rl_lookup ON public.update_product_rate_limits (identifier, "windowEnd");

REVOKE ALL ON TABLE public.send_message_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.conversation_offer_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.offer_accept_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.offer_decline_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.checkout_offer_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.push_token_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.create_product_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.update_product_rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.send_message_rate_limits TO service_role;
GRANT ALL ON TABLE public.conversation_offer_rate_limits TO service_role;
GRANT ALL ON TABLE public.offer_accept_rate_limits TO service_role;
GRANT ALL ON TABLE public.offer_decline_rate_limits TO service_role;
GRANT ALL ON TABLE public.checkout_offer_rate_limits TO service_role;
GRANT ALL ON TABLE public.push_token_rate_limits TO service_role;
GRANT ALL ON TABLE public.create_product_rate_limits TO service_role;
GRANT ALL ON TABLE public.update_product_rate_limits TO service_role;;
