CREATE TABLE IF NOT EXISTS private.operator_merchandising_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_catalog_item_id uuid NOT NULL REFERENCES private.supplier_catalog_items(id) ON DELETE RESTRICT,
  draft jsonb NOT NULL,
  draft_hash text NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','superseded','revoked')),
  review_reason text NOT NULL,
  reviewed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_merchandising_reviews_draft_object CHECK (jsonb_typeof(draft)='object'),
  CONSTRAINT operator_merchandising_reviews_hash CHECK (draft_hash ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS operator_merchandising_one_approved_per_product
  ON private.operator_merchandising_reviews(canonical_product_id)
  WHERE status='approved';

REVOKE ALL ON TABLE private.operator_merchandising_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE private.operator_merchandising_reviews TO service_role;

CREATE OR REPLACE FUNCTION public.server_approve_operator_merchandising_v1(
  p_actor_id uuid,
  p_canonical_product_id uuid,
  p_supplier_offer_id uuid,
  p_supplier_catalog_item_id uuid,
  p_draft jsonb,
  p_draft_hash text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_actor_id IS NULL OR p_canonical_product_id IS NULL OR p_supplier_offer_id IS NULL OR p_supplier_catalog_item_id IS NULL THEN
    RAISE EXCEPTION 'review identity is required';
  END IF;
  IF jsonb_typeof(p_draft) <> 'object' OR jsonb_object_length(p_draft)=0 THEN
    RAISE EXCEPTION 'merchandising draft is required';
  END IF;
  IF COALESCE(BTRIM(p_reason),'')='' THEN RAISE EXCEPTION 'review reason is required'; END IF;
  IF COALESCE(p_draft_hash,'') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'draft hash is invalid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM private.supplier_offers o
    WHERE o.id=p_supplier_offer_id AND o.canonical_product_id=p_canonical_product_id
      AND o.supplier_catalog_item_id=p_supplier_catalog_item_id
  ) THEN RAISE EXCEPTION 'supplier publication identity mismatch'; END IF;

  UPDATE private.operator_merchandising_reviews
  SET status='superseded'
  WHERE canonical_product_id=p_canonical_product_id AND status='approved';

  INSERT INTO private.operator_merchandising_reviews(
    canonical_product_id,supplier_offer_id,supplier_catalog_item_id,draft,draft_hash,review_reason,reviewed_by
  ) VALUES(
    p_canonical_product_id,p_supplier_offer_id,p_supplier_catalog_item_id,p_draft,p_draft_hash,BTRIM(p_reason),p_actor_id
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok',true,'reviewId',v_id,'status','approved','draftHash',p_draft_hash,'interfaceVersion',1);
END;
$$;

REVOKE ALL ON FUNCTION public.server_approve_operator_merchandising_v1(uuid,uuid,uuid,uuid,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_approve_operator_merchandising_v1(uuid,uuid,uuid,uuid,jsonb,text,text) TO service_role;
COMMENT ON FUNCTION public.server_approve_operator_merchandising_v1(uuid,uuid,uuid,uuid,jsonb,text,text)
IS 'Service-role-only final human merchandising review record. Approval does not publish or expose a marketplace listing.';
