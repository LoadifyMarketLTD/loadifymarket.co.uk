-- 631_supplier_price_drift_closure.sql
-- Final Phase H price-drift guard: a fresh supplier price is not commercially safe merely because currency matches.
-- The latest supplier unit price must still match the supplier-product-cost evidence used by the active landed-cost snapshot.

CREATE OR REPLACE FUNCTION public.server_supplier_stock_price_decision_v1(
  p_supplier_offer_id uuid,
  p_canonical_product_id uuid,
  p_commercial_mode text,
  p_territory text DEFAULT 'GB',
  p_external_variant_ref text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_policy private.supplier_offer_sync_policies%ROWTYPE;
  v_stock private.supplier_stock_observations%ROWTYPE;
  v_price private.supplier_price_observations%ROWTYPE;
  v_landed private.supplier_landed_cost_snapshots%ROWTYPE;
  v_economics jsonb;
  v_stock_capability jsonb;
  v_price_capability jsonb;
  v_variant text := BTRIM(COALESCE(p_external_variant_ref, ''));
  v_sellable_quantity integer;
  v_expected_supplier_price_minor bigint;
BEGIN
  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id=p_supplier_offer_id AND canonical_product_id=p_canonical_product_id
     AND territory=upper(BTRIM(COALESCE(p_territory,'GB'))) AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_ready','interfaceVersion',1); END IF;

  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_offer.supplier_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_not_found','interfaceVersion',1); END IF;

  v_stock_capability := public.server_supplier_foundation_decision_v1(v_supplier.supplier_key,v_offer.territory,'stock');
  IF COALESCE((v_stock_capability->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','stock_capability_not_ready','interfaceVersion',1);
  END IF;
  v_price_capability := public.server_supplier_foundation_decision_v1(v_supplier.supplier_key,v_offer.territory,'price');
  IF COALESCE((v_price_capability->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','price_capability_not_ready','interfaceVersion',1);
  END IF;

  SELECT * INTO v_policy FROM private.supplier_offer_sync_policies
   WHERE supplier_offer_id=p_supplier_offer_id AND status='approved' ORDER BY policy_version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','sync_policy_missing','interfaceVersion',1); END IF;

  SELECT * INTO v_stock FROM private.supplier_stock_observations
   WHERE supplier_offer_id=p_supplier_offer_id AND external_variant_ref=v_variant
   ORDER BY observed_at DESC,received_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','stock_observation_missing','interfaceVersion',1); END IF;
  IF v_stock.observed_at + make_interval(secs=>v_policy.stock_max_age_seconds) <= now() THEN
    RETURN jsonb_build_object('eligible',false,'reason','stock_stale','stockObservedAt',v_stock.observed_at,'interfaceVersion',1);
  END IF;
  IF v_stock.availability IN ('out_of_stock','unknown') THEN
    RETURN jsonb_build_object('eligible',false,'reason','stock_unavailable','availability',v_stock.availability,'interfaceVersion',1);
  END IF;
  IF v_stock.quantity IS NULL AND NOT v_policy.allow_unknown_quantity THEN
    RETURN jsonb_build_object('eligible',false,'reason','stock_quantity_unknown','interfaceVersion',1);
  END IF;

  SELECT * INTO v_price FROM private.supplier_price_observations
   WHERE supplier_offer_id=p_supplier_offer_id AND external_variant_ref=v_variant
   ORDER BY observed_at DESC,received_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','price_observation_missing','interfaceVersion',1); END IF;
  IF v_price.observed_at + make_interval(secs=>v_policy.price_max_age_seconds) <= now() THEN
    RETURN jsonb_build_object('eligible',false,'reason','price_stale','priceObservedAt',v_price.observed_at,'interfaceVersion',1);
  END IF;

  v_economics := public.server_supplier_commercial_decision_v1(p_supplier_offer_id,p_canonical_product_id,p_commercial_mode,p_territory);
  IF COALESCE((v_economics->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','commercial_economics_not_ready','economics',v_economics,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_landed FROM private.supplier_landed_cost_snapshots
   WHERE id=NULLIF(v_economics->>'landedCostSnapshotId','')::uuid;
  IF NOT FOUND OR v_landed.status<>'verified' THEN
    RETURN jsonb_build_object('eligible',false,'reason','landed_cost_evidence_missing','interfaceVersion',1);
  END IF;
  IF v_price.currency<>v_landed.currency THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_price_currency_changed','supplierCurrency',v_price.currency,'landedCostCurrency',v_landed.currency,'interfaceVersion',1);
  END IF;
  v_expected_supplier_price_minor := ROUND(v_landed.supplier_product_cost*100,0)::bigint;
  IF v_price.amount_minor<>v_expected_supplier_price_minor THEN
    RETURN jsonb_build_object(
      'eligible',false,'reason','supplier_price_changed',
      'supplierPriceMinor',v_price.amount_minor,'expectedSupplierPriceMinor',v_expected_supplier_price_minor,
      'priceObservationId',v_price.id,'landedCostSnapshotId',v_landed.id,'interfaceVersion',1
    );
  END IF;

  v_sellable_quantity := CASE WHEN v_stock.quantity IS NULL THEN NULL ELSE GREATEST(v_stock.quantity-v_policy.safety_stock_quantity,0) END;
  IF v_sellable_quantity IS NOT NULL AND v_sellable_quantity<=0 THEN
    RETURN jsonb_build_object('eligible',false,'reason','safety_stock_exhausted','sellableQuantity',0,'interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'eligible',true,'reason','stock_price_ready','supplierOfferId',p_supplier_offer_id,'canonicalProductId',p_canonical_product_id,
    'stockObservationId',v_stock.id,'priceObservationId',v_price.id,'pricingSnapshotId',v_economics->>'pricingSnapshotId',
    'availability',v_stock.availability,'sellableQuantity',v_sellable_quantity,'supplierPriceMinor',v_price.amount_minor,
    'currency',v_price.currency,'stockObservedAt',v_stock.observed_at,'priceObservedAt',v_price.observed_at,
    'policyVersion',v_policy.policy_version,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_stock_price_decision_v1(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_stock_price_decision_v1(uuid,uuid,text,text,text) TO service_role;

COMMENT ON FUNCTION public.server_supplier_stock_price_decision_v1(uuid,uuid,text,text,text) IS 'Phase H fail-closed stock/price readiness. Fresh supplier price must still match the verified supplier-product-cost evidence used by active Phase G economics.';
