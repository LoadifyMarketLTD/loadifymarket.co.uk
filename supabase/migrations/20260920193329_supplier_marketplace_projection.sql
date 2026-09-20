CREATE TABLE IF NOT EXISTS private.supplier_marketplace_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  merchandising_review_id uuid NOT NULL REFERENCES private.operator_merchandising_reviews(id) ON DELETE RESTRICT,
  commercial_mode text NOT NULL DEFAULT 'loadify_supplier_fulfilled'
    CHECK (commercial_mode='loadify_supplier_fulfilled'),
  territory text NOT NULL DEFAULT 'GB' CHECK (territory='GB'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','retired')),
  projection_payload jsonb NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT supplier_marketplace_projection_payload_object CHECK (jsonb_typeof(projection_payload)='object')
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_marketplace_projection_live_product_unique
ON private.supplier_marketplace_projections(canonical_product_id)
WHERE status IN ('draft','ready','published');

REVOKE ALL ON TABLE private.supplier_marketplace_projections FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE private.supplier_marketplace_projections TO service_role;

CREATE OR REPLACE FUNCTION public.server_create_supplier_marketplace_projection_v1(
  p_actor_id uuid,
  p_canonical_product_id uuid,
  p_supplier_offer_id uuid,
  p_supplier_catalog_item_id uuid,
  p_merchandising_review_id uuid,
  p_projection_payload jsonb,
  p_payload_hash text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE v_review private.operator_merchandising_reviews%ROWTYPE;
DECLARE v_saved private.supplier_marketplace_projections%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN RAISE EXCEPTION 'active admin authority is required'; END IF;

  SELECT * INTO v_review FROM private.operator_merchandising_reviews
  WHERE id=p_merchandising_review_id AND status='approved';
  IF v_review.id IS NULL THEN RAISE EXCEPTION 'approved merchandising review is required'; END IF;
  IF v_review.canonical_product_id<>p_canonical_product_id
    OR v_review.supplier_offer_id<>p_supplier_offer_id
    OR v_review.supplier_catalog_item_id<>p_supplier_catalog_item_id
  THEN RAISE EXCEPTION 'merchandising review identity mismatch'; END IF;

  IF jsonb_typeof(p_projection_payload)<>'object'
    OR jsonb_object_length(p_projection_payload)=0
  THEN RAISE EXCEPTION 'projection payload is required'; END IF;
  IF COALESCE(p_payload_hash,'') !~ '^[0-9a-f]{64}$'
  THEN RAISE EXCEPTION 'payload hash is invalid'; END IF;

  INSERT INTO private.supplier_marketplace_projections(
    canonical_product_id,supplier_offer_id,supplier_catalog_item_id,
    merchandising_review_id,projection_payload,payload_hash,created_by
  ) VALUES(
    p_canonical_product_id,p_supplier_offer_id,p_supplier_catalog_item_id,
    p_merchandising_review_id,p_projection_payload,p_payload_hash,p_actor_id
  ) RETURNING * INTO v_saved;

  RETURN jsonb_build_object(
    'ok',true,'projectionId',v_saved.id,'status',v_saved.status,
    'commercialMode',v_saved.commercial_mode,'territory',v_saved.territory,
    'buyerVisible',false,'checkoutEnabled',false,'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_create_supplier_marketplace_projection_v1(
  uuid,uuid,uuid,uuid,uuid,jsonb,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_create_supplier_marketplace_projection_v1(
  uuid,uuid,uuid,uuid,uuid,jsonb,text
) TO service_role;

COMMENT ON TABLE private.supplier_marketplace_projections IS
'Internal Loadify Supplier-Fulfilled marketplace projection. Draft/ready rows are not buyer-visible public.products rows.';

COMMENT ON FUNCTION public.server_create_supplier_marketplace_projection_v1(
  uuid,uuid,uuid,uuid,uuid,jsonb,text
) IS
'Creates an internal draft projection only after an approved human merchandising review. Does not publish or enable checkout.';
