-- Supplier brand/trademark usage policy and fail-closed publication guard.
-- Does not grant rights, publish products, or enable Supplier Commerce.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_brand_usage_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE CASCADE,
  market_code text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft',
  restricted_brand_terms text[] NOT NULL DEFAULT '{}',
  allow_brand_name_in_listing boolean NOT NULL DEFAULT false,
  allow_logo_in_listing boolean NOT NULL DEFAULT false,
  allow_brand_name_in_marketing boolean NOT NULL DEFAULT false,
  allow_logo_in_marketing boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_brand_usage_market_check
    CHECK (market_code=upper(BTRIM(market_code)) AND market_code ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_brand_usage_status_check
    CHECK (status IN ('draft','verified','retired')),
  CONSTRAINT supplier_brand_usage_terms_check
    CHECK (cardinality(restricted_brand_terms) BETWEEN 1 AND 32),
  CONSTRAINT supplier_brand_usage_evidence_check
    CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_brand_usage_reason_check
    CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_brand_usage_dates_check
    CHECK (effective_to IS NULL OR effective_to>effective_from),
  CONSTRAINT supplier_brand_usage_verified_check
    CHECK (
      status<>'verified'
      OR (
        evidence<>'{}'::jsonb
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_brand_usage_policy_version_unique
  ON private.supplier_brand_usage_policies(supplier_id,market_code,version);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_brand_usage_policy_current_verified_unique
  ON private.supplier_brand_usage_policies(supplier_id,market_code)
  WHERE status='verified' AND effective_to IS NULL;

REVOKE ALL ON TABLE private.supplier_brand_usage_policies
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_brand_usage_policy_history_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='verified' THEN
    RAISE EXCEPTION 'verified supplier brand usage policy is historical contract evidence and cannot be deleted';
  END IF;
  IF TG_OP='UPDATE' AND OLD.status='verified' THEN
    IF (
      to_jsonb(NEW) - ARRAY['status','effective_to']::text[]
    ) IS DISTINCT FROM (
      to_jsonb(OLD) - ARRAY['status','effective_to']::text[]
    ) THEN
      RAISE EXCEPTION 'verified supplier brand usage policy is immutable; create a new version';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_brand_usage_policy_history_v1
  ON private.supplier_brand_usage_policies;
CREATE TRIGGER trg_guard_supplier_brand_usage_policy_history_v1
BEFORE UPDATE OR DELETE ON private.supplier_brand_usage_policies
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_brand_usage_policy_history_v1();

CREATE OR REPLACE FUNCTION public.server_supplier_brand_usage_decision_v1(
  p_supplier_offer_id uuid,
  p_market_code text,
  p_context text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
  v_context text:=lower(BTRIM(COALESCE(p_context,'')));
  v_offer private.supplier_offers%ROWTYPE;
  v_policy private.supplier_brand_usage_policies%ROWTYPE;
  v_text text:='';
  v_term text;
  v_brand_allowed boolean;
  v_logo_allowed boolean;
  v_logo_requested boolean:=false;
BEGIN
  IF p_supplier_offer_id IS NULL
     OR v_market !~ '^[A-Z]{2}$'
     OR v_context NOT IN ('listing','marketing')
     OR jsonb_typeof(COALESCE(p_payload,'{}'::jsonb))<>'object' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_supplier_brand_usage_input','interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id
    AND territory=v_market
    AND status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',1);
  END IF;

  SELECT * INTO v_policy
  FROM private.supplier_brand_usage_policies
  WHERE supplier_id=v_offer.supplier_id
    AND market_code=v_market
    AND status='verified'
    AND effective_from<=now()
    AND (effective_to IS NULL OR effective_to>now())
  ORDER BY version DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','verified_supplier_brand_usage_policy_missing','interfaceVersion',1);
  END IF;

  v_brand_allowed:=CASE WHEN v_context='listing'
    THEN v_policy.allow_brand_name_in_listing
    ELSE v_policy.allow_brand_name_in_marketing END;
  v_logo_allowed:=CASE WHEN v_context='listing'
    THEN v_policy.allow_logo_in_listing
    ELSE v_policy.allow_logo_in_marketing END;

  v_text:=concat_ws(' ',
    p_payload->>'title',
    p_payload->>'subtitle',
    p_payload->>'description',
    p_payload->>'brand',
    p_payload->>'supplierBrand',
    p_payload->>'sellerName',
    p_payload->>'marketingCopy',
    p_payload->>'seoTitle',
    p_payload->>'seoDescription'
  );

  IF NOT v_brand_allowed THEN
    FOREACH v_term IN ARRAY v_policy.restricted_brand_terms LOOP
      IF position(lower(BTRIM(v_term)) in lower(v_text))>0 THEN
        RETURN jsonb_build_object(
          'eligible',false,
          'reason','supplier_brand_name_usage_not_permitted',
          'context',v_context,
          'matchedRestrictedTerm',BTRIM(v_term),
          'interfaceVersion',1
        );
      END IF;
    END LOOP;
  END IF;

  v_logo_requested :=
    COALESCE(NULLIF(BTRIM(p_payload->>'logo'),'') IS NOT NULL,false)
    OR COALESCE(NULLIF(BTRIM(p_payload->>'logoUrl'),'') IS NOT NULL,false)
    OR COALESCE(NULLIF(BTRIM(p_payload->>'brandLogo'),'') IS NOT NULL,false)
    OR COALESCE(NULLIF(BTRIM(p_payload->>'brandLogoUrl'),'') IS NOT NULL,false)
    OR COALESCE(NULLIF(BTRIM(p_payload->>'supplierLogo'),'') IS NOT NULL,false)
    OR COALESCE(NULLIF(BTRIM(p_payload->>'supplierLogoUrl'),'') IS NOT NULL,false);

  IF v_logo_requested AND NOT v_logo_allowed THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_logo_usage_not_permitted',
      'context',v_context,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_brand_usage_ready',
    'context',v_context,
    'policyId',v_policy.id,
    'policyVersion',v_policy.version,
    'brandNameAllowed',v_brand_allowed,
    'logoAllowed',v_logo_allowed,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_brand_usage_decision_v1(uuid,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_brand_usage_decision_v1(uuid,text,text,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_publish_supplier_marketplace_projection_v1(
  p_actor_id uuid,
  p_projection_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_review private.operator_merchandising_reviews%ROWTYPE;
  v_economics jsonb;
  v_price_policy jsonb;
  v_brand_policy jsonb;
  v_pricing_snapshot_id uuid;
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

  SELECT * INTO v_review
  FROM private.operator_merchandising_reviews
  WHERE id=v_projection.merchandising_review_id
    AND status='approved'
    AND canonical_product_id=v_projection.canonical_product_id
    AND supplier_offer_id=v_projection.supplier_offer_id
    AND supplier_catalog_item_id=v_projection.supplier_catalog_item_id;
  IF v_review.id IS NULL THEN RAISE EXCEPTION 'current approved merchandising review is required'; END IF;
  IF v_review.draft_hash<>v_projection.payload_hash THEN
    RAISE EXCEPTION 'projection payload no longer matches approved merchandising review';
  END IF;

  v_economics:=public.server_supplier_commercial_decision_v1(
    v_projection.supplier_offer_id,
    v_projection.canonical_product_id,
    v_projection.commercial_mode,
    v_projection.territory
  );
  IF COALESCE((v_economics->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier economics are not ready for publication: %',COALESCE(v_economics->>'reason','unknown');
  END IF;

  v_pricing_snapshot_id:=NULLIF(v_economics->>'pricingSnapshotId','')::uuid;
  v_price_policy:=public.server_supplier_offer_price_policy_decision_v1(
    v_projection.supplier_offer_id,
    v_pricing_snapshot_id,
    v_projection.territory
  );
  IF COALESCE((v_price_policy->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier price policy blocks publication: %',COALESCE(v_price_policy->>'reason','unknown');
  END IF;

  v_brand_policy:=public.server_supplier_brand_usage_decision_v1(
    v_projection.supplier_offer_id,
    v_projection.territory,
    'listing',
    v_projection.projection_payload
  );
  IF COALESCE((v_brand_policy->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier brand usage policy blocks publication: %',COALESCE(v_brand_policy->>'reason','unknown');
  END IF;

  UPDATE private.supplier_marketplace_projections
  SET status='published',published_at=COALESCE(published_at,now()),updated_at=now()
  WHERE id=p_projection_id
  RETURNING * INTO v_projection;

  RETURN jsonb_build_object(
    'ok',true,
    'projectionId',v_projection.id,
    'status',v_projection.status,
    'commercialMode',v_projection.commercial_mode,
    'territory',v_projection.territory,
    'buyerVisible',true,
    'checkoutEnabled',false,
    'publishedAt',v_projection.published_at,
    'pricePolicy',v_price_policy,
    'brandPolicy',v_brand_policy,
    'interfaceVersion',3
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid)
TO service_role;

COMMENT ON TABLE private.supplier_brand_usage_policies IS
'Versioned supplier brand/trademark usage permission for listings and marketing. Verified policy is immutable contract evidence and grants nothing beyond its reviewed flags.';

COMMENT ON FUNCTION public.server_supplier_brand_usage_decision_v1(uuid,text,text,jsonb) IS
'Fail-closed supplier brand/trademark usage decision. Publication requires a verified current policy and blocks restricted names or logo fields unless explicitly permitted.';
