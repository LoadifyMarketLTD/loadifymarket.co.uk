-- Multi-country seller/supplier capability foundation.
-- This migration records where a seller/supplier may operate. It does not activate RO checkout.

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "marketCodes" text[] NOT NULL DEFAULT ARRAY['GB']::text[],
  ADD COLUMN IF NOT EXISTS "deliveryMarketCodes" text[] NOT NULL DEFAULT ARRAY['GB']::text[],
  ADD COLUMN IF NOT EXISTS "returnsCountryCode" text NOT NULL DEFAULT 'GB';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seller_profiles_market_codes_check'
      AND conrelid = 'public.seller_profiles'::regclass
  ) THEN
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_market_codes_check
      CHECK ("marketCodes" <@ ARRAY['GB','RO']::text[] AND cardinality("marketCodes") > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seller_profiles_delivery_market_codes_check'
      AND conrelid = 'public.seller_profiles'::regclass
  ) THEN
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_delivery_market_codes_check
      CHECK ("deliveryMarketCodes" <@ ARRAY['GB','RO']::text[] AND cardinality("deliveryMarketCodes") > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seller_profiles_returns_country_code_check'
      AND conrelid = 'public.seller_profiles'::regclass
  ) THEN
    ALTER TABLE public.seller_profiles
      ADD CONSTRAINT seller_profiles_returns_country_code_check
      CHECK ("returnsCountryCode" IN ('GB','RO'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS seller_profiles_market_codes_gin_idx
  ON public.seller_profiles USING gin ("marketCodes");
CREATE INDEX IF NOT EXISTS seller_profiles_delivery_market_codes_gin_idx
  ON public.seller_profiles USING gin ("deliveryMarketCodes");

ALTER TABLE private.supplier_foundation_suppliers
  ADD COLUMN IF NOT EXISTS market_codes text[] NOT NULL DEFAULT ARRAY['GB']::text[],
  ADD COLUMN IF NOT EXISTS delivery_market_codes text[] NOT NULL DEFAULT ARRAY['GB']::text[],
  ADD COLUMN IF NOT EXISTS returns_country_code text NOT NULL DEFAULT 'GB';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_foundation_market_codes_check'
      AND conrelid = 'private.supplier_foundation_suppliers'::regclass
  ) THEN
    ALTER TABLE private.supplier_foundation_suppliers
      ADD CONSTRAINT supplier_foundation_market_codes_check
      CHECK (market_codes <@ ARRAY['GB','RO']::text[] AND cardinality(market_codes) > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_foundation_delivery_market_codes_check'
      AND conrelid = 'private.supplier_foundation_suppliers'::regclass
  ) THEN
    ALTER TABLE private.supplier_foundation_suppliers
      ADD CONSTRAINT supplier_foundation_delivery_market_codes_check
      CHECK (delivery_market_codes <@ ARRAY['GB','RO']::text[] AND cardinality(delivery_market_codes) > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_foundation_returns_country_code_check'
      AND conrelid = 'private.supplier_foundation_suppliers'::regclass
  ) THEN
    ALTER TABLE private.supplier_foundation_suppliers
      ADD CONSTRAINT supplier_foundation_returns_country_code_check
      CHECK (returns_country_code IN ('GB','RO'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS supplier_foundation_market_codes_gin_idx
  ON private.supplier_foundation_suppliers USING gin (market_codes);
CREATE INDEX IF NOT EXISTS supplier_foundation_delivery_market_codes_gin_idx
  ON private.supplier_foundation_suppliers USING gin (delivery_market_codes);

COMMENT ON COLUMN public.seller_profiles."marketCodes" IS
  'Markets in which this seller is eligible to publish listings. Defaults existing sellers to GB only.';
COMMENT ON COLUMN public.seller_profiles."deliveryMarketCodes" IS
  'Markets to which this seller has declared supported fulfilment. Does not override checkout/compliance gates.';
COMMENT ON COLUMN public.seller_profiles."returnsCountryCode" IS
  'Country code for the seller returns region used by market-aware returns workflows.';
COMMENT ON COLUMN private.supplier_foundation_suppliers.market_codes IS
  'Markets approved for supplier catalogue exposure. Defaults existing suppliers to GB only.';
COMMENT ON COLUMN private.supplier_foundation_suppliers.delivery_market_codes IS
  'Markets supported by supplier fulfilment capability.';
COMMENT ON COLUMN private.supplier_foundation_suppliers.returns_country_code IS
  'Country code for supplier returns routing.';
