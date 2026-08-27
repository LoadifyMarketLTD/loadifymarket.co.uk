-- 676_supplier_product_identity_bridge.sql
-- E2E remediation Stage 1: canonical public-product <-> Supplier Commerce identity bridge.
--
-- This migration does NOT enable Supplier Commerce, publish products, create suppliers,
-- create offers, or perform provider calls. It closes the identity gap that could
-- otherwise allow an order item for public product A to be routed to a supplier
-- offer for canonical product B.

CREATE TABLE IF NOT EXISTS private.supplier_product_listing_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  link_source text NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_product_listing_public_product_unique UNIQUE(public_product_id),
  CONSTRAINT supplier_product_listing_source_check CHECK (
    link_source = lower(BTRIM(link_source))
    AND link_source ~ '^[a-z0-9][a-z0-9._-]{2,63}$'
  ),
  CONSTRAINT supplier_product_listing_evidence_check CHECK (
    jsonb_typeof(evidence) = 'object' AND evidence <> '{}'::jsonb
  )
);

CREATE INDEX IF NOT EXISTS supplier_product_listing_canonical_idx
  ON private.supplier_product_listing_links(canonical_product_id, created_at DESC);

REVOKE ALL ON TABLE private.supplier_product_listing_links FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_product_listing_link_immutable_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  RAISE EXCEPTION 'supplier product listing identity is immutable; create a new public listing instead of rewriting history';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_product_listing_link_immutable_v1
  ON private.supplier_product_listing_links;
CREATE TRIGGER trg_guard_supplier_product_listing_link_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_product_listing_links
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_product_listing_link_immutable_v1();

CREATE OR REPLACE FUNCTION public.server_link_supplier_product_listing_v1(
  p_public_product_id uuid,
  p_canonical_product_id uuid,
  p_link_source text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_public_product public.products%ROWTYPE;
  v_canonical private.canonical_products%ROWTYPE;
  v_existing private.supplier_product_listing_links%ROWTYPE;
  v_source text := lower(BTRIM(COALESCE(p_link_source,'')));
  v_evidence jsonb := COALESCE(p_evidence,'{}'::jsonb);
BEGIN
  IF p_public_product_id IS NULL OR p_canonical_product_id IS NULL
     OR v_source !~ '^[a-z0-9][a-z0-9._-]{2,63}$'
     OR jsonb_typeof(v_evidence) <> 'object' OR v_evidence = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_supplier_product_listing_link','interfaceVersion',1);
  END IF;

  SELECT * INTO v_public_product FROM public.products WHERE id=p_public_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','public_product_not_found','interfaceVersion',1);
  END IF;

  SELECT * INTO v_canonical FROM private.canonical_products WHERE id=p_canonical_product_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','canonical_product_not_found','interfaceVersion',1);
  END IF;
  IF v_canonical.status <> 'active' THEN
    RETURN jsonb_build_object('ok',false,'reason','canonical_product_not_active','canonicalProductId',v_canonical.id,'interfaceVersion',1);
  END IF;

  -- Never reinterpret a product that already has customer order history as a
  -- Supplier Commerce listing. Historical public product identity is immutable.
  IF EXISTS (SELECT 1 FROM public.order_items oi WHERE oi."productId"=p_public_product_id) THEN
    RETURN jsonb_build_object('ok',false,'reason','ordered_public_product_cannot_be_rebound','publicProductId',p_public_product_id,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_existing
    FROM private.supplier_product_listing_links
   WHERE public_product_id=p_public_product_id;
  IF FOUND THEN
    IF v_existing.canonical_product_id<>p_canonical_product_id
       OR v_existing.link_source<>v_source
       OR v_existing.evidence<>v_evidence THEN
      RAISE EXCEPTION 'supplier product listing identity collision';
    END IF;
    RETURN jsonb_build_object(
      'ok',true,'reason','supplier_product_listing_link_replayed','linkId',v_existing.id,
      'publicProductId',v_existing.public_product_id,'canonicalProductId',v_existing.canonical_product_id,
      'interfaceVersion',1
    );
  END IF;

  INSERT INTO private.supplier_product_listing_links(
    public_product_id,canonical_product_id,link_source,evidence
  ) VALUES(
    p_public_product_id,p_canonical_product_id,v_source,v_evidence
  )
  RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'ok',true,'reason','supplier_product_listing_link_created','linkId',v_existing.id,
    'publicProductId',v_existing.public_product_id,'canonicalProductId',v_existing.canonical_product_id,
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_link_supplier_product_listing_v1(uuid,uuid,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_link_supplier_product_listing_v1(uuid,uuid,text,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_order_item_identity_decision_v1(
  p_order_item_id uuid,
  p_supplier_offer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item public.order_items%ROWTYPE;
  v_link private.supplier_product_listing_links%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
BEGIN
  SELECT * INTO v_item FROM public.order_items WHERE id=p_order_item_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','order_item_not_found','interfaceVersion',1);
  END IF;

  SELECT * INTO v_link
    FROM private.supplier_product_listing_links
   WHERE public_product_id=v_item."productId";
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','public_product_not_linked_to_supplier_canonical_product',
      'orderItemId',v_item.id,'publicProductId',v_item."productId",'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=p_supplier_offer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_found','interfaceVersion',1);
  END IF;

  IF v_offer.canonical_product_id<>v_link.canonical_product_id THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','order_item_supplier_offer_identity_mismatch',
      'orderItemId',v_item.id,'publicProductId',v_item."productId",
      'linkedCanonicalProductId',v_link.canonical_product_id,
      'supplierOfferId',v_offer.id,'offerCanonicalProductId',v_offer.canonical_product_id,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_order_item_identity_ready',
    'orderItemId',v_item.id,'publicProductId',v_item."productId",
    'canonicalProductId',v_link.canonical_product_id,'supplierOfferId',v_offer.id,
    'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_order_item_identity_decision_v1(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_order_item_identity_decision_v1(uuid,uuid)
  TO service_role;

ALTER TABLE private.supplier_fulfilment_leg_items
  DROP CONSTRAINT IF EXISTS supplier_fulfilment_leg_items_canonical_product_id_fkey;
ALTER TABLE private.supplier_fulfilment_leg_items
  ADD CONSTRAINT supplier_fulfilment_leg_items_canonical_product_id_fkey
  FOREIGN KEY (canonical_product_id)
  REFERENCES private.canonical_products(id)
  ON DELETE RESTRICT;

-- Replace the Phase I identity guard with the complete E2E invariant:
-- supplier offer -> canonical product -> public listing -> canonical order item.
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
  v_link private.supplier_product_listing_links%ROWTYPE;
BEGIN
  SELECT oi."orderId",oi."productId"
    INTO v_order_id,v_public_product_id
    FROM public.order_items oi
   WHERE oi.id=NEW.order_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'canonical order item required'; END IF;

  SELECT l.* INTO v_leg
    FROM private.supplier_fulfilment_legs l
   WHERE l.id=NEW.leg_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'fulfilment leg required'; END IF;

  SELECT o.order_id INTO v_leg_order_id
    FROM private.supplier_order_orchestrations o
   WHERE o.id=v_leg.orchestration_id;
  IF NOT FOUND OR v_leg_order_id<>v_order_id THEN
    RAISE EXCEPTION 'fulfilment leg item must belong to the same canonical customer order';
  END IF;

  IF v_leg.fulfiller_type='supplier' THEN
    IF NEW.supplier_offer_id IS NULL
       OR NEW.supplier_offer_id<>v_leg.supplier_offer_id
       OR NEW.canonical_product_id IS NULL THEN
      RAISE EXCEPTION 'supplier fulfilment item must use the leg supplier offer and canonical product';
    END IF;

    SELECT * INTO v_offer FROM private.supplier_offers WHERE id=NEW.supplier_offer_id;
    IF NOT FOUND OR NEW.canonical_product_id IS DISTINCT FROM v_offer.canonical_product_id THEN
      RAISE EXCEPTION 'fulfilment item canonical product must match supplier offer';
    END IF;

    SELECT * INTO v_link
      FROM private.supplier_product_listing_links
     WHERE public_product_id=v_public_product_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier fulfilment item public product must be linked to canonical supplier product';
    END IF;
    IF v_link.canonical_product_id IS DISTINCT FROM NEW.canonical_product_id THEN
      RAISE EXCEPTION 'supplier fulfilment item public product canonical identity mismatch';
    END IF;
  ELSE
    IF NEW.supplier_offer_id IS NOT NULL OR NEW.canonical_product_id IS NOT NULL THEN
      RAISE EXCEPTION 'non-supplier fulfilment item cannot carry supplier product identity';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_fulfilment_item_identity_v1
  ON private.supplier_fulfilment_leg_items;
CREATE TRIGGER trg_guard_supplier_fulfilment_item_identity_v1
BEFORE INSERT OR UPDATE ON private.supplier_fulfilment_leg_items
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_fulfilment_item_identity_v1();

COMMENT ON TABLE private.supplier_product_listing_links IS
  'E2E Supplier Commerce bridge from buyer-facing public.products identity to private canonical supplier product identity. Links are immutable and do not themselves publish or enable commerce.';
COMMENT ON FUNCTION public.server_supplier_order_item_identity_decision_v1(uuid,uuid) IS
  'Fail-closed Stage 1 identity decision proving that the canonical customer order item public product maps to the exact canonical product carried by the supplier offer.';
