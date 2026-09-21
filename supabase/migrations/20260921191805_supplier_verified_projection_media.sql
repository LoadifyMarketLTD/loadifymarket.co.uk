CREATE OR REPLACE FUNCTION public.server_supplier_verified_media_snapshot_v1(
  p_supplier_catalog_item_id uuid,
  p_canonical_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item private.supplier_import_items%ROWTYPE;
  v_image_urls jsonb;
BEGIN
  SELECT *
  INTO v_item
  FROM private.supplier_import_items
  WHERE supplier_catalog_item_id=p_supplier_catalog_item_id
    AND canonical_product_id=p_canonical_product_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','import_item_not_found','imageUrls','[]'::jsonb,'interfaceVersion',1);
  END IF;
  IF v_item.status<>'approved' THEN
    RETURN jsonb_build_object('eligible',false,'reason','import_item_not_approved','imageUrls','[]'::jsonb,'interfaceVersion',1);
  END IF;
  IF EXISTS (
    SELECT 1 FROM private.supplier_import_asset_rights r
    WHERE r.import_item_id=v_item.id AND r.rights_status<>'verified'
  ) THEN
    RETURN jsonb_build_object('eligible',false,'reason','asset_rights_not_clear','imageUrls','[]'::jsonb,'interfaceVersion',1);
  END IF;
  IF EXISTS (
    SELECT 1 FROM private.supplier_import_asset_rights r
    WHERE r.import_item_id=v_item.id
      AND r.asset_type='image'
      AND r.rights_status='verified'
      AND r.asset_ref !~ '^https://'
  ) THEN
    RETURN jsonb_build_object('eligible',false,'reason','verified_media_url_invalid','imageUrls','[]'::jsonb,'interfaceVersion',1);
  END IF;

  SELECT COALESCE(jsonb_agg(x.asset_ref ORDER BY x.created_at,x.id),'[]'::jsonb)
  INTO v_image_urls
  FROM (
    SELECT r.id,r.asset_ref,r.created_at
    FROM private.supplier_import_asset_rights r
    WHERE r.import_item_id=v_item.id
      AND r.asset_type='image'
      AND r.rights_status='verified'
    ORDER BY r.created_at,r.id
    LIMIT 12
  ) x;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','verified_media_snapshot_ready',
    'importItemId',v_item.id,
    'imageUrls',v_image_urls,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_verified_media_snapshot_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.server_supplier_verified_media_snapshot_v1(uuid,uuid)
TO service_role;

COMMENT ON FUNCTION public.server_supplier_verified_media_snapshot_v1(uuid,uuid) IS
'Service-role-only media input boundary for Supplier Hub merchandising/projection. Returns only HTTPS image assets whose import rights are verified; does not publish or mutate marketplace state.';