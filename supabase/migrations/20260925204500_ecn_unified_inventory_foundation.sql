-- ECN-3A unified inventory / multi-warehouse foundation.
-- Additive only. This migration does not change live checkout, seller stock
-- authority, supplier stock evidence, or Romania launch state.
--
-- Seller inventory positions extend the legacy products.stockQuantity model
-- with verified physical locations. Supplier warehouse bindings map existing
-- supplier warehouse declarations to ECN dispatch locations without copying
-- raw supplier stock into a second source of truth.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.seller_inventory_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dispatch_location_id uuid NOT NULL REFERENCES private.dispatch_locations(id) ON DELETE RESTRICT,
  on_hand integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  source_type text NOT NULL DEFAULT 'seller_manual',
  source_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_inventory_positions_on_hand_check
    CHECK (on_hand >= 0),
  CONSTRAINT seller_inventory_positions_reserved_check
    CHECK (reserved >= 0 AND reserved <= on_hand),
  CONSTRAINT seller_inventory_positions_status_check
    CHECK (status IN ('active','suspended','retired')),
  CONSTRAINT seller_inventory_positions_source_type_check
    CHECK (source_type IN ('seller_manual','seller_api','migration')),
  CONSTRAINT seller_inventory_positions_evidence_check
    CHECK (jsonb_typeof(evidence)='object')
);

CREATE UNIQUE INDEX IF NOT EXISTS seller_inventory_positions_active_unique
  ON private.seller_inventory_positions(product_id,dispatch_location_id)
  WHERE status='active';

CREATE INDEX IF NOT EXISTS seller_inventory_positions_seller_status_idx
  ON private.seller_inventory_positions(seller_id,status,updated_at DESC);

CREATE INDEX IF NOT EXISTS seller_inventory_positions_location_status_idx
  ON private.seller_inventory_positions(dispatch_location_id,status);

REVOKE ALL ON TABLE private.seller_inventory_positions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_seller_inventory_position_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_location private.dispatch_locations%ROWTYPE;
BEGIN
  SELECT * INTO v_product
  FROM public.products
  WHERE id=NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product is missing';
  END IF;

  IF v_product."sellerId" IS DISTINCT FROM NEW.seller_id THEN
    RAISE EXCEPTION 'inventory position seller does not own product';
  END IF;

  SELECT * INTO v_location
  FROM private.dispatch_locations
  WHERE id=NEW.dispatch_location_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispatch location is missing';
  END IF;

  IF v_location.seller_id IS DISTINCT FROM NEW.seller_id
     OR v_location.supplier_id IS NOT NULL THEN
    RAISE EXCEPTION 'dispatch location does not belong to seller';
  END IF;

  IF NEW.status='active' THEN
    IF v_location.is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'active inventory position requires active dispatch location';
    END IF;

    IF v_location.verification_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'active inventory position requires verified dispatch location';
    END IF;
  END IF;

  IF NEW.reserved > NEW.on_hand THEN
    RAISE EXCEPTION 'reserved inventory cannot exceed on-hand inventory';
  END IF;

  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_seller_inventory_position_v1
  ON private.seller_inventory_positions;
CREATE TRIGGER trg_guard_seller_inventory_position_v1
BEFORE INSERT OR UPDATE ON private.seller_inventory_positions
FOR EACH ROW EXECUTE FUNCTION private.guard_seller_inventory_position_v1();

REVOKE ALL ON FUNCTION private.guard_seller_inventory_position_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.supplier_warehouse_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE CASCADE,
  external_warehouse_ref text NOT NULL,
  warehouse_country text NOT NULL,
  dispatch_location_id uuid NOT NULL REFERENCES private.dispatch_locations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_warehouse_bindings_ref_check
    CHECK (NULLIF(BTRIM(external_warehouse_ref),'') IS NOT NULL),
  CONSTRAINT supplier_warehouse_bindings_country_check
    CHECK (warehouse_country ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_warehouse_bindings_status_check
    CHECK (status IN ('draft','verified','suspended','retired')),
  CONSTRAINT supplier_warehouse_bindings_evidence_check
    CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_warehouse_bindings_verified_check
    CHECK (
      status <> 'verified'
      OR (
        reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND evidence <> '{}'::jsonb
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_warehouse_bindings_active_unique
  ON private.supplier_warehouse_bindings(supplier_id,external_warehouse_ref)
  WHERE status IN ('draft','verified');

CREATE INDEX IF NOT EXISTS supplier_warehouse_bindings_location_status_idx
  ON private.supplier_warehouse_bindings(dispatch_location_id,status);

REVOKE ALL ON TABLE private.supplier_warehouse_bindings
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_warehouse_binding_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_location private.dispatch_locations%ROWTYPE;
  v_declared boolean:=false;
BEGIN
  NEW.external_warehouse_ref:=BTRIM(NEW.external_warehouse_ref);
  NEW.warehouse_country:=upper(BTRIM(NEW.warehouse_country));

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=NEW.supplier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier foundation record is missing';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(v_supplier.warehouse_refs,'[]'::jsonb)) elem
    WHERE BTRIM(COALESCE(
      elem->>'externalWarehouseRef',
      elem->>'external_warehouse_ref',
      elem->>'warehouseRef',
      elem->>'warehouse_ref',
      ''
    ))=NEW.external_warehouse_ref
      AND (
        NULLIF(upper(BTRIM(COALESCE(elem->>'country',elem->>'countryCode',elem->>'country_code',''))),'') IS NULL
        OR upper(BTRIM(COALESCE(elem->>'country',elem->>'countryCode',elem->>'country_code','')))=NEW.warehouse_country
      )
  ) INTO v_declared;

  IF NOT v_declared THEN
    RAISE EXCEPTION 'warehouse reference is not declared by supplier foundation';
  END IF;

  SELECT * INTO v_location
  FROM private.dispatch_locations
  WHERE id=NEW.dispatch_location_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispatch location is missing';
  END IF;

  IF v_location.supplier_id IS DISTINCT FROM NEW.supplier_id
     OR v_location.seller_id IS NOT NULL THEN
    RAISE EXCEPTION 'dispatch location does not belong to supplier';
  END IF;

  IF v_location.country_code IS DISTINCT FROM NEW.warehouse_country THEN
    RAISE EXCEPTION 'supplier warehouse country does not match dispatch location';
  END IF;

  IF NEW.status='verified' THEN
    IF v_location.is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'verified warehouse binding requires active dispatch location';
    END IF;

    IF v_location.verification_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'verified warehouse binding requires verified dispatch location';
    END IF;
  END IF;

  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_warehouse_binding_v1
  ON private.supplier_warehouse_bindings;
CREATE TRIGGER trg_guard_supplier_warehouse_binding_v1
BEFORE INSERT OR UPDATE ON private.supplier_warehouse_bindings
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_warehouse_binding_v1();

REVOKE ALL ON FUNCTION private.guard_supplier_warehouse_binding_v1()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE private.seller_inventory_positions IS
  'ECN-3 seller stock by verified physical dispatch location. Existing products.stockQuantity remains the live seller stock authority until a separately verified cutover.';

COMMENT ON TABLE private.supplier_warehouse_bindings IS
  'ECN-3 mapping from existing supplier warehouse declarations to verified ECN dispatch locations. This table does not copy or replace supplier stock observations/reservations.';
