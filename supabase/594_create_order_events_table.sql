-- =============================================================================
-- 594_create_order_events_table.sql
-- Creates order_events audit table if it does not exist in production.
--
-- Root cause: accept_offer() RPC (migration 591) performs
--   INSERT INTO order_events (...)
-- This table was originally defined inside 480_offers_engine.sql which was
-- never applied to the production database, causing every offer-accept call
-- to fail with:
--   ERROR: relation "order_events" does not exist
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.order_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"   UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "actorId"   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  event       TEXT        NOT NULL,
  metadata    JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order
  ON public.order_events ("orderId");

CREATE INDEX IF NOT EXISTS idx_order_events_created
  ON public.order_events ("createdAt" DESC);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Buyer and seller can read events for their own orders.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'order_events'
      AND policyname = 'order_events_select_participant'
  ) THEN
    CREATE POLICY "order_events_select_participant"
      ON public.order_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = "orderId"
            AND (o."buyerId" = auth.uid() OR o."sellerId" = auth.uid())
        )
      );
  END IF;
END;
$$;

-- All writes go via service-role (Netlify functions / Stripe webhook) — no
-- direct client inserts are allowed.
