CREATE OR REPLACE FUNCTION public.server_publish_supplier_marketplace_projection_v1(
  p_actor_id uuid,
  p_projection_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE v_projection private.supplier_marketplace_projections%ROWTYPE;
DECLARE v_review private.operator_merchandising_reviews%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN RAISE EXCEPTION 'active admin authority is required'; END IF;

  SELECT * INTO v_projection
  FROM private.supplier_marketplace_projections
  WHERE id=p_projection_id FOR UPDATE;
  IF v_projection.id IS NULL THEN RAISE EXCEPTION 'marketplace projection not found'; END IF;
  IF v_projection.status='retired' THEN RAISE EXCEPTION 'retired projection cannot be published'; END IF;

  SELECT * INTO v_review FROM private.operator_merchandising_reviews
  WHERE id=v_projection.merchandising_review_id
    AND status='approved'
    AND canonical_product_id=v_projection.canonical_product_id
    AND supplier_offer_id=v_projection.supplier_offer_id
    AND supplier_catalog_item_id=v_projection.supplier_catalog_item_id;
  IF v_review.id IS NULL THEN RAISE EXCEPTION 'current approved merchandising review is required'; END IF;
  IF v_review.draft_hash<>v_projection.payload_hash THEN
    RAISE EXCEPTION 'projection payload no longer matches approved merchandising review'; END IF;

  UPDATE private.supplier_marketplace_projections
  SET status='published',published_at=COALESCE(published_at,now()),updated_at=now()
  WHERE id=p_projection_id RETURNING * INTO v_projection;

  RETURN jsonb_build_object(
    'ok',true,'projectionId',v_projection.id,'status',v_projection.status,
    'commercialMode',v_projection.commercial_mode,'territory',v_projection.territory,
    'buyerVisible',true,'checkoutEnabled',false,'publishedAt',v_projection.published_at,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid)
TO service_role;

COMMENT ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid) IS
'Marks a reviewed supplier projection buyer-visible. Checkout remains separately gated by fresh stock/price and supplier order reservation.';
