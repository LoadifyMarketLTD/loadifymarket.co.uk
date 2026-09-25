-- ECN-1 cross-border domain foundation.
-- Additive only: introduces route/location/capability/audit primitives without
-- changing existing UK checkout or activating Romania.
--
-- IMPORTANT:
-- - GB-GB is seeded as the existing live domestic baseline.
-- - RO-RO, GB-RO and RO-GB are prelaunch and cannot checkout.
-- - Market-native pricing continues to use private.product_market_price_versions.
-- - All new operational tables remain private and are accessible only through
--   reviewed SECURITY DEFINER interfaces added deliberately in later phases.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.market_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key text NOT NULL UNIQUE,
  origin_country text NOT NULL,
  destination_country text NOT NULL,
  destination_market text NOT NULL,
  status text NOT NULL DEFAULT 'prelaunch',
  display_enabled boolean NOT NULL DEFAULT false,
  offer_enabled boolean NOT NULL DEFAULT false,
  shipping_enabled boolean NOT NULL DEFAULT false,
  checkout_enabled boolean NOT NULL DEFAULT false,
  returns_enabled boolean NOT NULL DEFAULT false,
  tax_profile_code text,
  customs_profile_code text,
  compliance_profile_code text,
  change_reason text NOT NULL,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_routes_route_key_format_check
    CHECK (route_key ~ '^[A-Z]{2}-[A-Z]{2}$'),
  CONSTRAINT market_routes_origin_country_check
    CHECK (origin_country ~ '^[A-Z]{2}$'),
  CONSTRAINT market_routes_destination_country_check
    CHECK (destination_country ~ '^[A-Z]{2}$'),
  CONSTRAINT market_routes_destination_market_check
    CHECK (destination_market ~ '^[A-Z]{2}$'),
  CONSTRAINT market_routes_route_key_consistency_check
    CHECK (route_key = origin_country || '-' || destination_country),
  CONSTRAINT market_routes_status_check
    CHECK (status IN ('prelaunch','live','paused','suspended')),
  CONSTRAINT market_routes_checkout_requires_live_check
    CHECK (NOT checkout_enabled OR status='live'),
  CONSTRAINT market_routes_checkout_requires_offer_check
    CHECK (NOT checkout_enabled OR offer_enabled),
  CONSTRAINT market_routes_checkout_requires_shipping_check
    CHECK (NOT checkout_enabled OR shipping_enabled),
  CONSTRAINT market_routes_offer_requires_display_check
    CHECK (NOT offer_enabled OR display_enabled),
  CONSTRAINT market_routes_reason_check
    CHECK (NULLIF(BTRIM(change_reason),'') IS NOT NULL)
);

INSERT INTO private.market_routes(
  route_key,
  origin_country,
  destination_country,
  destination_market,
  status,
  display_enabled,
  offer_enabled,
  shipping_enabled,
  checkout_enabled,
  returns_enabled,
  change_reason
) VALUES
  ('GB-GB','GB','GB','GB','live',true,true,true,true,true,'Existing UK domestic production baseline'),
  ('RO-RO','RO','RO','RO','prelaunch',true,true,false,false,false,'Romania domestic route remains prelaunch pending shipping/payment/legal E2E evidence'),
  ('GB-RO','GB','RO','RO','prelaunch',false,false,false,false,false,'UK to Romania cross-border route remains prelaunch'),
  ('RO-GB','RO','GB','GB','prelaunch',false,false,false,false,false,'Romania to UK cross-border route remains prelaunch')
ON CONFLICT (route_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS market_routes_destination_status_idx
  ON private.market_routes(destination_country,destination_market,status);
CREATE INDEX IF NOT EXISTS market_routes_origin_status_idx
  ON private.market_routes(origin_country,status);

REVOKE ALL ON TABLE private.market_routes
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.dispatch_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES private.supplier_foundation_suppliers(id) ON DELETE CASCADE,
  label text NOT NULL,
  country_code text NOT NULL,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  postcode text,
  location_type text NOT NULL DEFAULT 'dispatch',
  is_active boolean NOT NULL DEFAULT true,
  supports_returns boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'draft',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dispatch_locations_one_owner_check CHECK (
    (seller_id IS NOT NULL AND supplier_id IS NULL)
    OR (seller_id IS NULL AND supplier_id IS NOT NULL)
  ),
  CONSTRAINT dispatch_locations_label_check
    CHECK (NULLIF(BTRIM(label),'') IS NOT NULL),
  CONSTRAINT dispatch_locations_country_code_check
    CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT dispatch_locations_type_check
    CHECK (location_type IN ('dispatch','warehouse','return_hub','mixed')),
  CONSTRAINT dispatch_locations_address_check
    CHECK (jsonb_typeof(address)='object'),
  CONSTRAINT dispatch_locations_evidence_check
    CHECK (jsonb_typeof(evidence)='object')
);

CREATE INDEX IF NOT EXISTS dispatch_locations_seller_idx
  ON private.dispatch_locations(seller_id,country_code,is_active)
  WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dispatch_locations_supplier_idx
  ON private.dispatch_locations(supplier_id,country_code,is_active)
  WHERE supplier_id IS NOT NULL;

REVOKE ALL ON TABLE private.dispatch_locations
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.actor_route_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES private.market_routes(id) ON DELETE RESTRICT,
  seller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES private.supplier_foundation_suppliers(id) ON DELETE CASCADE,
  dispatch_location_id uuid REFERENCES private.dispatch_locations(id) ON DELETE SET NULL,
  can_offer boolean NOT NULL DEFAULT false,
  can_fulfil boolean NOT NULL DEFAULT false,
  can_accept_returns boolean NOT NULL DEFAULT false,
  supported_shipment_profiles text[] NOT NULL DEFAULT ARRAY[]::text[],
  capability_status text NOT NULL DEFAULT 'draft',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actor_route_capabilities_one_owner_check CHECK (
    (seller_id IS NOT NULL AND supplier_id IS NULL)
    OR (seller_id IS NULL AND supplier_id IS NOT NULL)
  ),
  CONSTRAINT actor_route_capabilities_status_check CHECK (
    capability_status IN ('draft','verified','suspended','retired')
  ),
  CONSTRAINT actor_route_capabilities_profiles_check CHECK (
    supported_shipment_profiles <@ ARRAY['parcel','multi_parcel','pallet','freight','supplier_arranged']::text[]
  ),
  CONSTRAINT actor_route_capabilities_evidence_check CHECK (
    jsonb_typeof(evidence)='object'
  ),
  CONSTRAINT actor_route_capabilities_dates_check CHECK (
    valid_to IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT actor_route_capabilities_verified_evidence_check CHECK (
    capability_status <> 'verified'
    OR (
      reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND evidence <> '{}'::jsonb
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS actor_route_capability_seller_location_unique
  ON private.actor_route_capabilities(route_id,seller_id,dispatch_location_id)
  WHERE seller_id IS NOT NULL AND capability_status IN ('draft','verified');
CREATE UNIQUE INDEX IF NOT EXISTS actor_route_capability_supplier_location_unique
  ON private.actor_route_capabilities(route_id,supplier_id,dispatch_location_id)
  WHERE supplier_id IS NOT NULL AND capability_status IN ('draft','verified');
CREATE INDEX IF NOT EXISTS actor_route_capability_route_status_idx
  ON private.actor_route_capabilities(route_id,capability_status);

REVOKE ALL ON TABLE private.actor_route_capabilities
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_actor_route_capability_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_destination text;
  v_location private.dispatch_locations%ROWTYPE;
  v_seller public.seller_profiles%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
BEGIN
  SELECT destination_market INTO v_destination
  FROM private.market_routes
  WHERE id=NEW.route_id;

  IF v_destination IS NULL THEN
    RAISE EXCEPTION 'route is missing';
  END IF;

  IF NEW.dispatch_location_id IS NOT NULL THEN
    SELECT * INTO v_location
    FROM private.dispatch_locations
    WHERE id=NEW.dispatch_location_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'dispatch location is missing';
    END IF;

    IF NEW.seller_id IS NOT NULL AND v_location.seller_id IS DISTINCT FROM NEW.seller_id THEN
      RAISE EXCEPTION 'dispatch location does not belong to seller';
    END IF;

    IF NEW.supplier_id IS NOT NULL AND v_location.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
      RAISE EXCEPTION 'dispatch location does not belong to supplier';
    END IF;
  END IF;

  IF NEW.capability_status='verified' AND NEW.seller_id IS NOT NULL THEN
    SELECT * INTO v_seller
    FROM public.seller_profiles
    WHERE "userId"=NEW.seller_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'seller profile is missing';
    END IF;

    IF NEW.can_offer AND NOT (v_destination = ANY(COALESCE(v_seller."marketCodes",ARRAY['GB']::text[]))) THEN
      RAISE EXCEPTION 'verified route offer exceeds seller market capability';
    END IF;

    IF NEW.can_fulfil AND NOT (v_destination = ANY(COALESCE(v_seller."deliveryMarketCodes",ARRAY['GB']::text[]))) THEN
      RAISE EXCEPTION 'verified route fulfilment exceeds seller delivery capability';
    END IF;
  END IF;

  IF NEW.capability_status='verified' AND NEW.supplier_id IS NOT NULL THEN
    SELECT * INTO v_supplier
    FROM private.supplier_foundation_suppliers
    WHERE id=NEW.supplier_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier foundation record is missing';
    END IF;

    IF NEW.can_offer AND NOT (v_destination = ANY(COALESCE(v_supplier.market_codes,ARRAY['GB']::text[]))) THEN
      RAISE EXCEPTION 'verified route offer exceeds supplier market capability';
    END IF;

    IF NEW.can_fulfil AND NOT (v_destination = ANY(COALESCE(v_supplier.delivery_market_codes,ARRAY['GB']::text[]))) THEN
      RAISE EXCEPTION 'verified route fulfilment exceeds supplier delivery capability';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_actor_route_capability_v1
  ON private.actor_route_capabilities;
CREATE TRIGGER trg_guard_actor_route_capability_v1
BEFORE INSERT OR UPDATE ON private.actor_route_capabilities
FOR EACH ROW EXECUTE FUNCTION private.guard_actor_route_capability_v1();

REVOKE ALL ON FUNCTION private.guard_actor_route_capability_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.route_decision_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES private.market_routes(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  seller_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES private.supplier_foundation_suppliers(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  dispatch_location_id uuid REFERENCES private.dispatch_locations(id) ON DELETE SET NULL,
  decision_context text NOT NULL,
  result text NOT NULL,
  blocker_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  decision jsonb NOT NULL,
  evidence_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT route_decision_snapshots_actor_check CHECK (
    NOT (seller_id IS NOT NULL AND supplier_id IS NOT NULL)
  ),
  CONSTRAINT route_decision_snapshots_context_check CHECK (
    decision_context IN ('display','offer','checkout','return')
  ),
  CONSTRAINT route_decision_snapshots_result_check CHECK (
    result IN ('eligible','blocked','review_required')
  ),
  CONSTRAINT route_decision_snapshots_decision_check CHECK (
    jsonb_typeof(decision)='object'
  ),
  CONSTRAINT route_decision_snapshots_evidence_versions_check CHECK (
    jsonb_typeof(evidence_versions)='object'
  )
);

CREATE INDEX IF NOT EXISTS route_decision_snapshots_route_created_idx
  ON private.route_decision_snapshots(route_id,created_at DESC);
CREATE INDEX IF NOT EXISTS route_decision_snapshots_product_created_idx
  ON private.route_decision_snapshots(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS route_decision_snapshots_buyer_created_idx
  ON private.route_decision_snapshots(buyer_id,created_at DESC)
  WHERE buyer_id IS NOT NULL;

REVOKE ALL ON TABLE private.route_decision_snapshots
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_market_route_baseline_v1(
  p_origin_country text,
  p_destination_market text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_origin text:=upper(BTRIM(COALESCE(p_origin_country,'')));
  v_destination text:=upper(BTRIM(COALESCE(p_destination_market,'')));
  v_route private.market_routes%ROWTYPE;
BEGIN
  IF v_origin !~ '^[A-Z]{2}$' OR v_destination !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','invalid_route_code',
      'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_route
  FROM private.market_routes
  WHERE route_key=v_origin || '-' || v_destination;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','route_not_configured',
      'routeKey',v_origin || '-' || v_destination,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',v_route.status='live' AND v_route.checkout_enabled,
    'routeKey',v_route.route_key,
    'originCountry',v_route.origin_country,
    'destinationMarket',v_route.destination_market,
    'status',v_route.status,
    'displayEnabled',v_route.display_enabled,
    'offerEnabled',v_route.offer_enabled,
    'shippingEnabled',v_route.shipping_enabled,
    'checkoutEnabled',v_route.checkout_enabled,
    'returnsEnabled',v_route.returns_enabled,
    'reason',v_route.change_reason,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_market_route_baseline_v1(text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_market_route_baseline_v1(text,text)
  TO service_role;

COMMENT ON TABLE private.market_routes IS
  'ECN platform route configuration. GB-GB is the existing live baseline; all Romania routes are seeded prelaunch.';
COMMENT ON TABLE private.dispatch_locations IS
  'ECN seller/supplier physical dispatch, warehouse and return-hub locations. Loadify ownership is not implied.';
COMMENT ON TABLE private.actor_route_capabilities IS
  'ECN route-level seller/supplier capability. Verified capability may narrow but cannot exceed existing market/delivery declarations.';
COMMENT ON TABLE private.route_decision_snapshots IS
  'Immutable-style audit snapshots for server cross-border eligibility decisions at display/offer/checkout/return boundaries.';
COMMENT ON FUNCTION public.server_market_route_baseline_v1(text,text) IS
  'Service-role-only ECN route baseline. This does not itself authorise checkout; later route decisions must compose inventory, shipping, tax/customs, compliance and payment readiness.';
