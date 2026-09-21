CREATE OR REPLACE FUNCTION public.server_get_supplier_marketplace_projection_v1(
  p_projection_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  canonical_product_id uuid,
  supplier_offer_id uuid,
  supplier_catalog_item_id uuid,
  projection_payload jsonb,
  payload_hash text,
  status text,
  commercial_mode text,
  territory text,
  published_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO ''
AS $$
  SELECT
    p.id,
    p.canonical_product_id,
    p.supplier_offer_id,
    p.supplier_catalog_item_id,
    p.projection_payload,
    p.payload_hash,
    p.status,
    p.commercial_mode,
    p.territory,
    p.published_at
  FROM private.supplier_marketplace_projections p
  WHERE p.status='published'
    AND p.commercial_mode='loadify_supplier_fulfilled'
    AND p.territory='GB'
    AND (p_projection_id IS NULL OR p.id=p_projection_id)
  ORDER BY p.published_at DESC NULLS LAST
  LIMIT CASE WHEN p_projection_id IS NULL THEN 50 ELSE 1 END;
$$;

REVOKE ALL ON FUNCTION public.server_get_supplier_marketplace_projection_v1(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_get_supplier_marketplace_projection_v1(uuid)
TO service_role;

COMMENT ON FUNCTION public.server_get_supplier_marketplace_projection_v1(uuid) IS
'Service-role-only read boundary for published GB Loadify Supplier-Fulfilled marketplace projections. Keeps private schema unexposed to PostgREST.';
