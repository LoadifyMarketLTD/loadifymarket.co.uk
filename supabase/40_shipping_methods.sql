-- =========================================================
-- LOADIFY MARKET - COMPLETE SHIPPING SETUP
-- Migration: 40_shipping_methods.sql
-- Run this in the Supabase SQL Editor after the base schema.
-- Creates:
--   1. shipping_methods
--   2. shipping_rates
--   3. product_shipping
-- Seeds Royal Mail / Evri / Collection options
-- =========================================================

-- NOTE: uuid-ossp is used here for consistency with the rest of the schema
--       which already calls uuid_generate_v4() throughout.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────
-- 1) SHIPPING METHODS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_methods (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  courier    TEXT,
  tracking   BOOLEAN     NOT NULL DEFAULT TRUE,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 2) SHIPPING RATES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_id  UUID          NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency   TEXT          NOT NULL DEFAULT 'GBP',
  min_weight NUMERIC(10,2),
  max_weight NUMERIC(10,2),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 3) PRODUCT SHIPPING  (product ↔ method junction)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_shipping (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID        NOT NULL REFERENCES public.products(id)          ON DELETE CASCADE,
  method_id     UUID        NOT NULL REFERENCES public.shipping_methods(id)  ON DELETE CASCADE,
  dispatch_time TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, method_id)
);

-- ─────────────────────────────────────────────────────────
-- SEED: SHIPPING METHODS
-- ─────────────────────────────────────────────────────────
INSERT INTO public.shipping_methods (name, courier, tracking, active)
VALUES
  ('Royal Mail Tracked 48', 'Royal Mail',        TRUE,  TRUE),
  ('Royal Mail Tracked 24', 'Royal Mail',        TRUE,  TRUE),
  ('Evri Standard Delivery','Evri',              TRUE,  TRUE),
  ('Collection in Person',  'Local Collection',  FALSE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- SEED: SHIPPING RATES (idempotent — skip if rate already exists)
-- ─────────────────────────────────────────────────────────
INSERT INTO public.shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 3.99, 'GBP', 0, 2
FROM public.shipping_methods
WHERE name = 'Royal Mail Tracked 48'
  AND NOT EXISTS (
    SELECT 1 FROM public.shipping_rates sr
    WHERE sr.method_id = public.shipping_methods.id
  );

INSERT INTO public.shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 4.99, 'GBP', 0, 2
FROM public.shipping_methods
WHERE name = 'Royal Mail Tracked 24'
  AND NOT EXISTS (
    SELECT 1 FROM public.shipping_rates sr
    WHERE sr.method_id = public.shipping_methods.id
  );

INSERT INTO public.shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 2.99, 'GBP', 0, 2
FROM public.shipping_methods
WHERE name = 'Evri Standard Delivery'
  AND NOT EXISTS (
    SELECT 1 FROM public.shipping_rates sr
    WHERE sr.method_id = public.shipping_methods.id
  );

INSERT INTO public.shipping_rates (method_id, price, currency, min_weight, max_weight)
SELECT id, 0.00, 'GBP', NULL, NULL
FROM public.shipping_methods
WHERE name = 'Collection in Person'
  AND NOT EXISTS (
    SELECT 1 FROM public.shipping_rates sr
    WHERE sr.method_id = public.shipping_methods.id
  );

-- ─────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shipping_rates_method_id
  ON public.shipping_rates (method_id);

CREATE INDEX IF NOT EXISTS idx_product_shipping_product_id
  ON public.product_shipping (product_id);

CREATE INDEX IF NOT EXISTS idx_product_shipping_method_id
  ON public.product_shipping (method_id);

-- ─────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.shipping_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_shipping  ENABLE ROW LEVEL SECURITY;

-- Anyone can read shipping methods and rates
DROP POLICY IF EXISTS shipping_methods_public_read  ON public.shipping_methods;
CREATE POLICY shipping_methods_public_read
  ON public.shipping_methods FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS shipping_rates_public_read    ON public.shipping_rates;
CREATE POLICY shipping_rates_public_read
  ON public.shipping_rates FOR SELECT
  USING (TRUE);

-- Authenticated users can read product shipping associations
DROP POLICY IF EXISTS product_shipping_auth_read    ON public.product_shipping;
CREATE POLICY product_shipping_auth_read
  ON public.product_shipping FOR SELECT
  TO authenticated
  USING (TRUE);

-- Authenticated users can manage (insert / update / delete) product shipping.
-- NOTE: simple permissive policy to get the feature working; tighten later
--       by checking that auth.uid() = the product's sellerId if required.
DROP POLICY IF EXISTS product_shipping_auth_insert  ON public.product_shipping;
CREATE POLICY product_shipping_auth_insert
  ON public.product_shipping FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS product_shipping_auth_update  ON public.product_shipping;
CREATE POLICY product_shipping_auth_update
  ON public.product_shipping FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS product_shipping_auth_delete  ON public.product_shipping;
CREATE POLICY product_shipping_auth_delete
  ON public.product_shipping FOR DELETE
  TO authenticated
  USING (TRUE);
