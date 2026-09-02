-- 681_supplier_publication_binding_foundation.sql
-- Provider-neutral bridge between customer-facing marketplace listings and
-- canonical Supplier Commerce identity. This migration is deliberately
-- fail-closed: it does not publish products, alter public product RLS, enable
-- checkout, activate a provider, or create supplier orders.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_publication_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  source_import_item_id uuid NOT NULL REFERENCES private.supplier_import_items(id) ON DELETE RESTRICT,
  commercial_mode text NOT NULL DEFAULT 'loadify_supplier_fulfilled',
  legal_seller_key text NOT NULL DEFAULT 'xdrive_logistics_ltd_ta_loadify_market',
  territory text NOT NULL DEFAULT 'GB',
  status text NOT NULL DEFAULT 'draft',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_publication_binding_mode_check CHECK (
    commercial_mode = 'loadify_supplier_fulfilled'
  ),
  CONSTRAINT supplier_publication_binding_legal_seller_check CHECK (
    legal_seller_key = 'xdrive_logistics_ltd_ta_loadify_market'
  ),
  CONSTRAINT supplier_publication_binding_territory_check CHECK (
    territory = upper(BTRIM(territory)) AND territory ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT supplier_publication_binding_status_check CHECK (
    status IN ('draft','review','approved','restricted','retired')
  ),
  CONSTRAINT supplier_publication_binding_evidence_check CHECK (
    jsonb_typeof(evidence) = 'object'
  ),
  CONSTRAINT supplier_publication_binding_approval_check CHECK (
    status <> 'approved'
    OR (
      approved_by IS NOT NULL
      AND approved_at IS NOT NULL
      AND evidence <> '{}'::jsonb
    )
  )
);

CREATE INDEX IF NOT EXISTS supplier_publication_binding_canonical_idx
  ON private.supplier_publication_bindings(canonical_product_id, status, territory);
CREATE INDEX IF NOT EXISTS supplier_publication_binding_import_idx
  ON private.supplier_publication_bindings(source_import_item_id, status);

REVOKE ALL ON TABLE private.supplier_publication_bindings FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.supplier_publication_actor_is_active_admin_v1(p_actor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_actor_id
      AND u.role = 'admin'
      AND u."isActive" = true
  );
$$;
REVOKE ALL ON FUNCTION private.supplier_publication_actor_is_active_admin_v1(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_publication_binding_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_canonical private.canonical_products%ROWTYPE;
  v_import_item private.supplier_import_items%ROWTYPE;
  v_import jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND (
    NEW.public_product_id IS DISTINCT FROM OLD.public_product_id
    OR NEW.canonical_product_id IS DISTINCT FROM OLD.canonical_product_id
    OR NEW.source_import_item_id IS DISTINCT FROM OLD.source_import_item_id
    OR NEW.commercial_mode IS DISTINCT FROM OLD.commercial_mode
    OR NEW.legal_seller_key IS DISTINCT FROM OLD.legal_seller_key
    OR NEW.territory IS DISTINCT FROM OLD.territory
  ) THEN
    RAISE EXCEPTION 'approved supplier publication binding identity is immutable';
  END IF;

  IF NEW.status = 'approved' THEN
    IF NOT private.supplier_publication_actor_is_active_admin_v1(NEW.approved_by) THEN
      RAISE EXCEPTION 'active admin approval is required for supplier publication binding';
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = NEW.public_product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'public product listing is required'; END IF;
    IF lower(BTRIM(COALESCE(v_product."listingContext", ''))) = 'service' THEN
      RAISE EXCEPTION 'supplier-fulfilled publication binding requires a physical product listing';
    END IF;

    SELECT * INTO v_canonical FROM private.canonical_products WHERE id = NEW.canonical_product_id;
    IF NOT FOUND OR v_canonical.status <> 'active' THEN
      RAISE EXCEPTION 'active canonical product is required for supplier publication binding';
    END IF;

    SELECT * INTO v_import_item
      FROM private.supplier_import_items
      WHERE id = NEW.source_import_item_id;
    IF NOT FOUND
       OR v_import_item.canonical_product_id IS DISTINCT FROM NEW.canonical_product_id
       OR v_import_item.status <> 'approved' THEN
      RAISE EXCEPTION 'approved source import item must match supplier publication canonical product';
    END IF;

    v_import := public.server_supplier_import_decision_v1(
      v_import_item.supplier_catalog_item_id,
      NEW.canonical_product_id
    );
    IF COALESCE((v_import->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'supplier publication source import is not ready: %', COALESCE(v_import->>'reason', 'unknown');
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_publication_binding_v1
  ON private.supplier_publication_bindings;
CREATE TRIGGER trg_guard_supplier_publication_binding_v1
BEFORE INSERT OR UPDATE ON private.supplier_publication_bindings
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_publication_binding_v1();

CREATE OR REPLACE FUNCTION public.server_admin_supplier_publication_binding_v1(
  p_actor_id uuid,
  p_action text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action text := lower(BTRIM(COALESCE(p_action, '')));
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
  v_binding private.supplier_publication_bindings%ROWTYPE;
  v_product_id uuid;
  v_canonical_id uuid;
  v_import_item_id uuid;
  v_status text;
  v_territory text;
  v_evidence jsonb;
BEGIN
  IF NOT private.supplier_publication_actor_is_active_admin_v1(p_actor_id) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN RAISE EXCEPTION 'payload must be an object'; END IF;

  IF v_action = 'upsert_binding' THEN
    v_product_id := NULLIF(v_payload->>'publicProductId', '')::uuid;
    v_canonical_id := NULLIF(v_payload->>'canonicalProductId', '')::uuid;
    v_import_item_id := NULLIF(v_payload->>'sourceImportItemId', '')::uuid;
    v_territory := upper(BTRIM(COALESCE(NULLIF(v_payload->>'territory', ''), 'GB')));
    v_evidence := COALESCE(v_payload->'evidence', '{}'::jsonb);
    IF v_product_id IS NULL OR v_canonical_id IS NULL OR v_import_item_id IS NULL THEN
      RAISE EXCEPTION 'publicProductId, canonicalProductId and sourceImportItemId are required';
    END IF;
    IF jsonb_typeof(v_evidence) <> 'object' THEN RAISE EXCEPTION 'evidence must be an object'; END IF;

    INSERT INTO private.supplier_publication_bindings(
      public_product_id, canonical_product_id, source_import_item_id,
      commercial_mode, legal_seller_key, territory, status, evidence
    ) VALUES (
      v_product_id, v_canonical_id, v_import_item_id,
      'loadify_supplier_fulfilled', 'xdrive_logistics_ltd_ta_loadify_market',
      v_territory, 'draft', v_evidence
    )
    ON CONFLICT (public_product_id) DO UPDATE SET
      canonical_product_id = EXCLUDED.canonical_product_id,
      source_import_item_id = EXCLUDED.source_import_item_id,
      territory = EXCLUDED.territory,
      evidence = EXCLUDED.evidence,
      updated_at = now()
    RETURNING * INTO v_binding;

    RETURN jsonb_build_object(
      'ok', true,
      'bindingId', v_binding.id,
      'publicProductId', v_binding.public_product_id,
      'canonicalProductId', v_binding.canonical_product_id,
      'status', v_binding.status,
      'interfaceVersion', 1
    );
  END IF;

  IF v_action = 'set_status' THEN
    SELECT * INTO v_binding
      FROM private.supplier_publication_bindings
      WHERE id = NULLIF(v_payload->>'bindingId', '')::uuid
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier publication binding not found'; END IF;

    v_status := lower(BTRIM(COALESCE(v_payload->>'status', '')));
    IF v_status NOT IN ('draft','review','approved','restricted','retired') THEN
      RAISE EXCEPTION 'invalid supplier publication binding status';
    END IF;
    v_evidence := COALESCE(v_payload->'evidence', v_binding.evidence);
    IF jsonb_typeof(v_evidence) <> 'object' THEN RAISE EXCEPTION 'evidence must be an object'; END IF;
    IF v_status = 'approved' AND v_evidence = '{}'::jsonb THEN
      RAISE EXCEPTION 'approved supplier publication binding requires evidence';
    END IF;

    UPDATE private.supplier_publication_bindings
    SET status = v_status,
        evidence = v_evidence,
        approved_by = CASE WHEN v_status = 'approved' THEN p_actor_id ELSE approved_by END,
        approved_at = CASE WHEN v_status = 'approved' THEN now() ELSE approved_at END,
        updated_at = now()
    WHERE id = v_binding.id
    RETURNING * INTO v_binding;

    RETURN jsonb_build_object(
      'ok', true,
      'bindingId', v_binding.id,
      'publicProductId', v_binding.public_product_id,
      'canonicalProductId', v_binding.canonical_product_id,
      'status', v_binding.status,
      'interfaceVersion', 1
    );
  END IF;

  RAISE EXCEPTION 'unsupported supplier publication binding action';
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_publication_binding_v1(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_publication_binding_v1(uuid, text, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_listing_binding_decision_v1(
  p_public_product_id uuid,
  p_supplier_offer_id uuid,
  p_territory text DEFAULT 'GB'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_binding private.supplier_publication_bindings%ROWTYPE;
  v_canonical private.canonical_products%ROWTYPE;
  v_import_item private.supplier_import_items%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_territory text := upper(BTRIM(COALESCE(p_territory, 'GB')));
  v_import jsonb;
  v_catalog jsonb;
  v_economics jsonb;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = p_public_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'public_product_not_found', 'interfaceVersion', 1);
  END IF;
  IF lower(BTRIM(COALESCE(v_product."listingContext", ''))) = 'service' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_fulfilled_service_not_supported', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_binding
    FROM private.supplier_publication_bindings
    WHERE public_product_id = p_public_product_id
      AND status = 'approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_publication_binding_not_approved', 'interfaceVersion', 1);
  END IF;
  IF v_binding.commercial_mode <> 'loadify_supplier_fulfilled'
     OR v_binding.legal_seller_key <> 'xdrive_logistics_ltd_ta_loadify_market'
     OR v_binding.territory <> v_territory THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_publication_binding_identity_mismatch', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_canonical FROM private.canonical_products WHERE id = v_binding.canonical_product_id;
  IF NOT FOUND OR v_canonical.status <> 'active' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'canonical_product_not_active', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_import_item FROM private.supplier_import_items WHERE id = v_binding.source_import_item_id;
  IF NOT FOUND OR v_import_item.canonical_product_id IS DISTINCT FROM v_binding.canonical_product_id THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_publication_import_identity_mismatch', 'interfaceVersion', 1);
  END IF;
  v_import := public.server_supplier_import_decision_v1(
    v_import_item.supplier_catalog_item_id,
    v_binding.canonical_product_id
  );
  IF COALESCE((v_import->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_publication_import_not_ready', 'import', v_import, 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_offer
    FROM private.supplier_offers
    WHERE id = p_supplier_offer_id
      AND canonical_product_id = v_binding.canonical_product_id
      AND territory = v_territory
      AND status = 'approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_offer_not_bound_to_public_product', 'interfaceVersion', 1);
  END IF;

  v_catalog := public.server_supplier_catalog_decision_v1(
    v_binding.canonical_product_id,
    v_offer.id,
    v_territory
  );
  IF COALESCE((v_catalog->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_catalog_not_ready_for_listing', 'catalog', v_catalog, 'interfaceVersion', 1);
  END IF;

  v_economics := public.server_supplier_commercial_decision_v1(
    v_offer.id,
    v_binding.canonical_product_id,
    'loadify_supplier_fulfilled',
    v_territory
  );
  IF COALESCE((v_economics->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'supplier_economics_not_ready_for_listing', 'economics', v_economics, 'interfaceVersion', 1);
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'supplier_listing_binding_ready',
    'bindingId', v_binding.id,
    'publicProductId', v_binding.public_product_id,
    'canonicalProductId', v_binding.canonical_product_id,
    'supplierOfferId', v_offer.id,
    'commercialMode', v_binding.commercial_mode,
    'legalSellerKey', v_binding.legal_seller_key,
    'territory', v_binding.territory,
    'interfaceVersion', 1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_listing_binding_decision_v1(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_listing_binding_decision_v1(uuid, uuid, text)
  TO service_role;

-- Extend the existing fulfilment-item identity guard. Supplier order routing now
-- requires proof that the customer-facing product is an approved publication
-- binding for the exact canonical product behind the selected supplier offer.
CREATE OR REPLACE FUNCTION private.guard_supplier_fulfilment_item_identity_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_order_id uuid;
  v_public_product_id uuid;
  v_leg_order_id uuid;
  v_leg private.supplier_fulfilment_legs%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_binding jsonb;
BEGIN
  SELECT oi."orderId", oi."productId"
    INTO v_order_id, v_public_product_id
    FROM public.order_items oi
    WHERE oi.id = NEW.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'canonical order item required'; END IF;

  SELECT l.* INTO v_leg FROM private.supplier_fulfilment_legs l WHERE l.id = NEW.leg_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'fulfilment leg required'; END IF;
  SELECT o.order_id INTO v_leg_order_id
    FROM private.supplier_order_orchestrations o
    WHERE o.id = v_leg.orchestration_id;
  IF NOT FOUND OR v_leg_order_id <> v_order_id THEN
    RAISE EXCEPTION 'fulfilment leg item must belong to the same canonical customer order';
  END IF;

  IF v_leg.fulfiller_type = 'supplier' THEN
    IF NEW.supplier_offer_id IS NULL
       OR NEW.supplier_offer_id <> v_leg.supplier_offer_id
       OR NEW.canonical_product_id IS NULL THEN
      RAISE EXCEPTION 'supplier fulfilment item must use the leg supplier offer and canonical product';
    END IF;
    SELECT * INTO v_offer FROM private.supplier_offers WHERE id = NEW.supplier_offer_id;
    IF NOT FOUND OR NEW.canonical_product_id IS DISTINCT FROM v_offer.canonical_product_id THEN
      RAISE EXCEPTION 'fulfilment item canonical product must match supplier offer';
    END IF;

    v_binding := public.server_supplier_listing_binding_decision_v1(
      v_public_product_id,
      NEW.supplier_offer_id,
      v_offer.territory
    );
    IF COALESCE((v_binding->>'eligible')::boolean, false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'supplier fulfilment item public listing binding is not ready: %',
        COALESCE(v_binding->>'reason', 'unknown');
    END IF;
    IF (v_binding->>'canonicalProductId')::uuid IS DISTINCT FROM NEW.canonical_product_id THEN
      RAISE EXCEPTION 'public listing binding canonical product must match fulfilment item';
    END IF;
  ELSE
    IF NEW.supplier_offer_id IS NOT NULL THEN
      RAISE EXCEPTION 'non-supplier fulfilment item cannot carry supplier offer identity';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE private.supplier_publication_bindings IS
  'Fail-closed bridge from public marketplace product identity to canonical Loadify Supplier-Fulfilled product identity. Approval does not publish the product or enable checkout.';
COMMENT ON FUNCTION public.server_supplier_listing_binding_decision_v1(uuid, uuid, text) IS
  'Validates that a public product and selected supplier offer resolve to the same approved canonical Loadify Supplier-Fulfilled identity and existing catalog/import/economics gates.';
