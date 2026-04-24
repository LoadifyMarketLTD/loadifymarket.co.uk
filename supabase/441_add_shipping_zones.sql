-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 441: Add shipping_zones table
--
-- Migration 40 (40_shipping_methods.sql) created shipping_methods,
-- shipping_rates, and product_shipping but omitted shipping_zones.
-- Zones represent geographic delivery regions and are used to link
-- shipping methods to the regions they service.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  countries   TEXT[]      NOT NULL DEFAULT '{}',
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_zones_active
  ON public.shipping_zones (active);

CREATE TRIGGER trg_shipping_zones_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed: default UK zones ────────────────────────────────────────────────────
INSERT INTO public.shipping_zones (name, description, countries, active)
VALUES
  ('United Kingdom',  'Mainland UK delivery zone',                   ARRAY['GB'], TRUE),
  ('Europe',          'EU and wider European delivery zone',          ARRAY['FR','DE','ES','IT','NL','BE','AT','PT','SE','DK','FI','NO','CH','IE','PL','CZ','HU','RO','GR'], TRUE),
  ('Rest of World',   'International delivery outside Europe',        ARRAY[]::TEXT[], TRUE)
ON CONFLICT (name) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_zones_public_read ON public.shipping_zones;
CREATE POLICY shipping_zones_public_read
  ON public.shipping_zones FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS shipping_zones_admin_write ON public.shipping_zones;
CREATE POLICY shipping_zones_admin_write
  ON public.shipping_zones FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
