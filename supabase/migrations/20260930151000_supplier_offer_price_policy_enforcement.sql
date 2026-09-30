-- Per-offer supplier retail price constraints and fail-closed enforcement.
-- Purpose:
-- - support suppliers whose minimum/fixed retail price differs by SKU/offer;
-- - prevent approval, publication or checkout below verified supplier constraints;
-- - keep constraints versioned, evidence-backed and immutable once verified;
-- - enable no Supplier Commerce control by itself.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.supplier_offer_price_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE CASCADE,
  market_code text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL,
  minimum_customer_price numeric(18,4),
  fixed_customer_price numeric(18,4),
  source_ref text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_offer_price_constraint_market_check
    CHECK (market_code = upper(BTRIM(market_code)) AND market_code ~ '^[A-Z]{2}$'),
  CONSTRAINT supplier_offer_price_constraint_status_check
    CHECK (status IN ('draft','verified','retired')),
  CONSTRAINT supplier_offer_price_constraint_currency_check
    CHECK (currency = upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_offer_price_constraint_amount_check
    CHECK (
      (minimum_customer_price IS NULL OR minimum_customer_price >= 0)
      AND (fixed_customer_price IS NULL OR fixed_customer_price >= 0)
      AND (minimum_customer_price IS NOT NULL OR fixed_customer_price IS NOT NULL)
    ),
  CONSTRAINT supplier_offer_price_constraint_dates_check
    CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT supplier_offer_price_constraint_evidence_check
    CHECK (jsonb_typeof(evidence)='object'),
  CONSTRAINT supplier_offer_price_constraint_verified_check
    CHECK (
      status <> 'verified'
      OR (
        evidence <> '{}'::jsonb
        AND NULLIF(BTRIM(COALESCE(source_ref,'')),'') IS NOT NULL
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_offer_price_constraint_version_unique
  ON private.supplier_offer_price_constraints(supplier_offer_id,market_code,version);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_offer_price_constraint_current_verified_unique
  ON private.supplier_offer_price_constraints(supplier_offer_id,market_code)
  WHERE status='verified' AND valid_to IS NULL;

REVOKE ALL ON TABLE private.supplier_offer_price_constraints
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_offer_price_constraint_history_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='verified' THEN
    RAISE EXCEPTION 'verified supplier offer price constraint is historical contract evidence and cannot be deleted';
  END IF;
  IF TG_OP='UPDATE' AND OLD.status='verified' THEN
    IF (
      to_jsonb(NEW) - ARRAY['status','valid_to']::text[]
    ) IS DISTINCT FROM (
      to_jsonb(OLD) - ARRAY['status','valid_to']::text[]
    ) THEN
      RAISE EXCEPTION 'verified supplier offer price constraint is immutable; create a new version';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_offer_price_constraint_history_v1
  ON private.supplier_offer_price_constraints;
CREATE TRIGGER trg_guard_supplier_offer_price_constraint_history_v1
BEFORE UPDATE OR DELETE ON private.supplier_offer_price_constraints
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_offer_price_constraint_history_v1();


-- A supplier_minimum_price policy may be supplier-wide or offer/SKU-specific.
-- Do not force a fake supplier-wide floor when the verified contract is per offer.
CREATE OR REPLACE FUNCTION private.guard_supplier_commercial_profile_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='verified' THEN
    RAISE EXCEPTION 'verified supplier commercial profile is historical contract evidence and cannot be deleted';
  END IF;
  IF TG_OP='UPDATE' AND OLD.status='verified' THEN
    IF (
      to_jsonb(NEW) - ARRAY['status','effective_to']::text[]
    ) IS DISTINCT FROM (
      to_jsonb(OLD) - ARRAY['status','effective_to']::text[]
    ) THEN
      RAISE EXCEPTION 'verified supplier commercial profile is immutable; create a new version';
    END IF;
  END IF;
  IF NEW.pricing_model='supplier_fixed_retail' AND NEW.supplier_fixed_retail IS NULL THEN
    RAISE EXCEPTION 'supplier_fixed_retail requires supplier_fixed_retail amount';
  END IF;
  IF NEW.pricing_model='supplier_rrp' AND NEW.supplier_recommended_retail IS NULL THEN
    RAISE EXCEPTION 'supplier_rrp requires supplier_recommended_retail';
  END IF;
  IF NEW.pricing_model='loadify_managed_with_supplier_constraints' AND NEW.loadify_may_set_retail IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'loadify-managed pricing requires loadify_may_set_retail=true';
  END IF;
  IF NEW.supplier_payable_basis='fixed_contract_amount' AND NEW.supplier_payable_fixed_amount IS NULL THEN
    RAISE EXCEPTION 'fixed_contract_amount requires supplier_payable_fixed_amount';
  END IF;
  IF NEW.supplier_payable_basis='order_level_formula'
     AND (NEW.supplier_payable_formula IS NULL OR NEW.supplier_payable_formula='{}'::jsonb) THEN
    RAISE EXCEPTION 'order_level_formula requires a reviewed declarative supplier_payable_formula';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.server_supplier_offer_price_policy_decision_v1(
  p_supplier_offer_id uuid,
  p_pricing_snapshot_id uuid,
  p_market_code text DEFAULT 'GB'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'GB')));
  v_offer private.supplier_offers%ROWTYPE;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_constraint private.supplier_offer_price_constraints%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_floor numeric(18,4);
  v_fixed numeric(18,4);
BEGIN
  IF p_supplier_offer_id IS NULL OR p_pricing_snapshot_id IS NULL OR v_market !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_price_policy_input','interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id
    AND territory=v_market
    AND status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',1);
  END IF;

  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE supplier_id=v_offer.supplier_id
    AND market_code=v_market
    AND status='verified'
    AND effective_from<=now()
    AND (effective_to IS NULL OR effective_to>now())
  ORDER BY version DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','verified_supplier_commercial_profile_missing','interfaceVersion',1);
  END IF;

  SELECT * INTO v_price
  FROM private.supplier_pricing_snapshots
  WHERE id=p_pricing_snapshot_id
    AND supplier_offer_id=v_offer.id
    AND status='approved'
    AND valid_from<=now()
    AND (valid_to IS NULL OR valid_to>now());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','approved_pricing_snapshot_missing','interfaceVersion',1);
  END IF;

  IF v_price.currency<>v_profile.settlement_currency THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_price_policy_currency_mismatch','interfaceVersion',1);
  END IF;

  SELECT * INTO v_constraint
  FROM private.supplier_offer_price_constraints
  WHERE supplier_offer_id=v_offer.id
    AND market_code=v_market
    AND status='verified'
    AND valid_from<=now()
    AND (valid_to IS NULL OR valid_to>now())
  ORDER BY version DESC
  LIMIT 1;

  IF v_profile.pricing_model='supplier_minimum_price' THEN
    IF FOUND AND v_constraint.minimum_customer_price IS NOT NULL THEN
      IF v_constraint.currency<>v_price.currency THEN
        RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_price_constraint_currency_mismatch','interfaceVersion',1);
      END IF;
      v_floor:=v_constraint.minimum_customer_price;
    ELSIF v_profile.supplier_price_floor IS NOT NULL THEN
      v_floor:=v_profile.supplier_price_floor;
    ELSE
      RETURN jsonb_build_object('eligible',false,'reason','supplier_minimum_price_missing','interfaceVersion',1);
    END IF;
  ELSIF v_profile.pricing_model='supplier_fixed_retail' THEN
    IF FOUND AND v_constraint.fixed_customer_price IS NOT NULL THEN
      IF v_constraint.currency<>v_price.currency THEN
        RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_price_constraint_currency_mismatch','interfaceVersion',1);
      END IF;
      v_fixed:=v_constraint.fixed_customer_price;
    ELSIF v_profile.supplier_fixed_retail IS NOT NULL THEN
      v_fixed:=v_profile.supplier_fixed_retail;
    ELSE
      RETURN jsonb_build_object('eligible',false,'reason','supplier_fixed_retail_missing','interfaceVersion',1);
    END IF;
  ELSIF v_profile.pricing_model='loadify_managed_with_supplier_constraints' THEN
    IF FOUND AND v_constraint.minimum_customer_price IS NOT NULL THEN
      IF v_constraint.currency<>v_price.currency THEN
        RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_price_constraint_currency_mismatch','interfaceVersion',1);
      END IF;
      v_floor:=v_constraint.minimum_customer_price;
    ELSIF v_profile.supplier_price_floor IS NOT NULL THEN
      v_floor:=v_profile.supplier_price_floor;
    END IF;
  END IF;

  IF v_floor IS NOT NULL AND v_price.gross_customer_price < v_floor THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_minimum_price_floor_failed',
      'grossCustomerPrice',v_price.gross_customer_price,
      'minimumCustomerPrice',v_floor,
      'currency',v_price.currency,
      'interfaceVersion',1
    );
  END IF;

  IF v_fixed IS NOT NULL AND v_price.gross_customer_price <> v_fixed THEN
    RETURN jsonb_build_object(
      'eligible',false,
      'reason','supplier_fixed_retail_price_failed',
      'grossCustomerPrice',v_price.gross_customer_price,
      'fixedCustomerPrice',v_fixed,
      'currency',v_price.currency,
      'interfaceVersion',1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','supplier_offer_price_policy_ready',
    'supplierOfferId',v_offer.id,
    'pricingSnapshotId',v_price.id,
    'pricingModel',v_profile.pricing_model,
    'minimumCustomerPrice',v_floor,
    'fixedCustomerPrice',v_fixed,
    'grossCustomerPrice',v_price.gross_customer_price,
    'currency',v_price.currency,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_offer_price_policy_decision_v1(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_offer_price_policy_decision_v1(uuid,uuid,text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_pricing_policy_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_offer private.supplier_offers%ROWTYPE;
  v_profile private.supplier_commercial_profiles%ROWTYPE;
  v_constraint private.supplier_offer_price_constraints%ROWTYPE;
  v_tax private.supplier_tax_rule_versions%ROWTYPE;
BEGIN
  IF NEW.status<>'approved' OR NEW.commercial_mode<>'loadify_supplier_fulfilled' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=NEW.supplier_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier offer is required for approved pricing'; END IF;

  SELECT * INTO v_tax FROM private.supplier_tax_rule_versions WHERE id=NEW.tax_rule_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'tax rule is required for approved pricing'; END IF;

  SELECT * INTO v_profile
  FROM private.supplier_commercial_profiles
  WHERE supplier_id=v_offer.supplier_id
    AND market_code=v_tax.territory
    AND status='verified'
    AND effective_from<=now()
    AND (effective_to IS NULL OR effective_to>now())
  ORDER BY version DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'verified supplier commercial profile is required before pricing approval';
  END IF;

  IF v_profile.pricing_model='supplier_minimum_price' THEN
    SELECT * INTO v_constraint
    FROM private.supplier_offer_price_constraints
    WHERE supplier_offer_id=v_offer.id
      AND market_code=v_tax.territory
      AND status='verified'
      AND valid_from<=now()
      AND (valid_to IS NULL OR valid_to>now())
    ORDER BY version DESC
    LIMIT 1;
    IF FOUND AND v_constraint.minimum_customer_price IS NOT NULL THEN
      IF v_constraint.currency<>NEW.currency THEN
        RAISE EXCEPTION 'supplier offer minimum price currency must match pricing currency';
      END IF;
      IF NEW.gross_customer_price<v_constraint.minimum_customer_price THEN
        RAISE EXCEPTION 'approved customer price is below verified supplier minimum price';
      END IF;
    ELSIF v_profile.supplier_price_floor IS NOT NULL THEN
      IF NEW.gross_customer_price<v_profile.supplier_price_floor THEN
        RAISE EXCEPTION 'approved customer price is below verified supplier minimum price';
      END IF;
    ELSE
      RAISE EXCEPTION 'verified supplier minimum price is required before pricing approval';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_pricing_policy_v1
  ON private.supplier_pricing_snapshots;
CREATE TRIGGER trg_guard_supplier_pricing_policy_v1
BEFORE INSERT OR UPDATE ON private.supplier_pricing_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pricing_policy_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_order_price_policy_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_decision jsonb;
BEGIN
  IF NEW."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled' THEN
    RETURN NEW;
  END IF;
  IF NEW."supplierOfferId" IS NULL OR NEW."pricingSnapshotId" IS NULL THEN
    RAISE EXCEPTION 'supplier offer and pricing snapshot are required for supplier checkout';
  END IF;

  v_decision:=public.server_supplier_offer_price_policy_decision_v1(
    NEW."supplierOfferId",
    NEW."pricingSnapshotId",
    COALESCE(NEW."marketCode",'GB')
  );
  IF COALESCE((v_decision->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier price policy blocks checkout: %',COALESCE(v_decision->>'reason','unknown');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_order_price_policy_v1 ON public.orders;
CREATE TRIGGER trg_guard_supplier_order_price_policy_v1
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_order_price_policy_v1();

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

  SELECT * INTO v_review FROM private.operator_merchandising_reviews
  WHERE id=v_projection.merchandising_review_id
    AND status='approved'
    AND canonical_product_id=v_projection.canonical_product_id
    AND supplier_offer_id=v_projection.supplier_offer_id
    AND supplier_catalog_item_id=v_projection.supplier_catalog_item_id;
  IF v_review.id IS NULL THEN RAISE EXCEPTION 'current approved merchandising review is required'; END IF;
  IF v_review.draft_hash<>v_projection.payload_hash THEN
    RAISE EXCEPTION 'projection payload no longer matches approved merchandising review'; END IF;

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

  UPDATE private.supplier_marketplace_projections
  SET status='published',published_at=COALESCE(published_at,now()),updated_at=now()
  WHERE id=p_projection_id RETURNING * INTO v_projection;

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
    'interfaceVersion',2
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid)
TO service_role;

COMMENT ON TABLE private.supplier_offer_price_constraints IS
'Versioned per-offer retail price constraints such as SKU-specific MAP/minimum or fixed customer price. A verified constraint is immutable contract evidence and does not activate commerce.';

COMMENT ON FUNCTION public.server_supplier_offer_price_policy_decision_v1(uuid,uuid,text) IS
'Fail-closed supplier price-policy decision used by publication and checkout. Supports per-offer minimum/fixed price evidence and does not activate commerce.';

COMMENT ON FUNCTION public.server_publish_supplier_marketplace_projection_v1(uuid,uuid) IS
'Publishes a reviewed supplier projection only after current economics and supplier retail price policy pass. Checkout remains separately gated.';
