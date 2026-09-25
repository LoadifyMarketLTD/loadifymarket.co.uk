-- Romania online withdrawal function evidence boundary.
-- OUG 18/2026 introduces an online withdrawal function requirement effective 27 Sep 2026.
-- This table records the consumer's unambiguous online withdrawal declaration and durable-medium confirmation metadata.
-- It does not itself execute refunds or mutate order/payment status.

CREATE TABLE IF NOT EXISTS public.order_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "buyerId" uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "sellerId" uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "marketCode" text NOT NULL DEFAULT 'RO' CHECK ("marketCode" = 'RO'),
  "consumerName" text NOT NULL,
  "confirmationEmail" text NOT NULL,
  statement text NOT NULL DEFAULT 'I withdraw from this distance contract.',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','completed','rejected')),
  "submittedAt" timestamptz NOT NULL DEFAULT now(),
  "confirmationSentAt" timestamptz,
  "confirmationProviderId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_withdrawal_consumer_name_check CHECK (char_length(BTRIM("consumerName")) BETWEEN 2 AND 200),
  CONSTRAINT order_withdrawal_email_check CHECK (char_length(BTRIM("confirmationEmail")) BETWEEN 3 AND 254),
  CONSTRAINT order_withdrawal_statement_check CHECK (char_length(BTRIM(statement)) BETWEEN 5 AND 2000)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_withdrawal_one_per_order
  ON public.order_withdrawal_requests ("orderId");
CREATE INDEX IF NOT EXISTS order_withdrawal_buyer_submitted_idx
  ON public.order_withdrawal_requests ("buyerId", "submittedAt" DESC);

ALTER TABLE public.order_withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_withdrawal_select_buyer_admin ON public.order_withdrawal_requests;
CREATE POLICY order_withdrawal_select_buyer_admin
ON public.order_withdrawal_requests
FOR SELECT TO authenticated
USING (
  "buyerId" = (SELECT auth.uid())
  OR (SELECT public.is_admin())
);

REVOKE INSERT, UPDATE, DELETE ON public.order_withdrawal_requests FROM anon, authenticated;
GRANT SELECT ON public.order_withdrawal_requests TO authenticated;
GRANT ALL ON public.order_withdrawal_requests TO service_role;

COMMENT ON TABLE public.order_withdrawal_requests IS
  'Romania online statutory withdrawal declarations. Server-only writes; durable-medium confirmation metadata is stored. No row directly authorises a refund or payment mutation.';
