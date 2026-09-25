-- Multi-country money + market foundation.
-- Backward compatible: all existing commerce data is UK/GBP unless explicitly migrated later.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS "marketCodes" text[] NOT NULL DEFAULT ARRAY['GB']::text[];

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS "marketCode" text NOT NULL DEFAULT 'GB';

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP';

ALTER TABLE public.payment_sessions
  ADD COLUMN IF NOT EXISTS "marketCode" text NOT NULL DEFAULT 'GB';

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS "marketCode" text NOT NULL DEFAULT 'GB';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_currency_check,
  ADD CONSTRAINT products_currency_check CHECK (currency IN ('GBP','RON','EUR','USD'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_currency_check,
  ADD CONSTRAINT orders_currency_check CHECK (currency IN ('GBP','RON','EUR','USD'));

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_currency_check,
  ADD CONSTRAINT order_items_currency_check CHECK (currency IN ('GBP','RON','EUR','USD'));

ALTER TABLE public.payment_sessions
  DROP CONSTRAINT IF EXISTS payment_sessions_currency_check,
  ADD CONSTRAINT payment_sessions_currency_check CHECK (currency IN ('GBP','RON','EUR','USD'));

ALTER TABLE public.payouts
  DROP CONSTRAINT IF EXISTS payouts_currency_check,
  ADD CONSTRAINT payouts_currency_check CHECK (currency IN ('GBP','RON','EUR','USD'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_market_code_check,
  ADD CONSTRAINT orders_market_code_check CHECK ("marketCode" IN ('GB','RO'));

ALTER TABLE public.payment_sessions
  DROP CONSTRAINT IF EXISTS payment_sessions_market_code_check,
  ADD CONSTRAINT payment_sessions_market_code_check CHECK ("marketCode" IN ('GB','RO'));

ALTER TABLE public.payouts
  DROP CONSTRAINT IF EXISTS payouts_market_code_check,
  ADD CONSTRAINT payouts_market_code_check CHECK ("marketCode" IN ('GB','RO'));

CREATE INDEX IF NOT EXISTS idx_products_market_codes
  ON public.products USING gin ("marketCodes");

CREATE INDEX IF NOT EXISTS idx_orders_market_code
  ON public.orders ("marketCode");

COMMENT ON COLUMN public.products.currency IS
  'Canonical listing price currency. Existing listings default to GBP; never reinterpret numeric price when switching market.';
COMMENT ON COLUMN public.products."marketCodes" IS
  'Markets in which the listing is commercially eligible. Existing listings default to GB only.';
