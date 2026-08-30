-- 627_supplier_commercial_economics_guards.sql
-- Phase G hard guards and active-admin mutation boundary.

CREATE OR REPLACE FUNCTION private.phase_g_actor_is_active_admin(p_actor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = p_actor_id AND u.role = 'admin' AND u."isActive" = true
  );
$$;
REVOKE ALL ON FUNCTION private.phase_g_actor_is_active_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_landed_cost_consistency_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_offer_item uuid;
  v_import_item uuid;
BEGIN
  SELECT supplier_catalog_item_id INTO v_offer_item FROM private.supplier_offers WHERE id = NEW.supplier_offer_id;
  SELECT supplier_catalog_item_id INTO v_import_item FROM private.supplier_import_items WHERE id = NEW.import_item_id;
  IF v_offer_item IS NULL OR v_import_item IS NULL OR v_offer_item <> v_import_item THEN
    RAISE EXCEPTION 'landed cost must reference import evidence for the supplier offer catalog item';
  END IF;
  IF NEW.destination_territory <> 'GB' THEN
    RAISE EXCEPTION 'Phase G currently supports GB only; NI requires a separately verified rule set';
  END IF;
  IF NEW.status = 'verified' AND NEW.valid_from > now() THEN
    RAISE EXCEPTION 'verified landed cost cannot start in the future';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_landed_cost_consistency_v1 ON private.supplier_landed_cost_snapshots;
CREATE TRIGGER trg_guard_supplier_landed_cost_consistency_v1
BEFORE INSERT OR UPDATE ON private.supplier_landed_cost_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_landed_cost_consistency_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_pricing_consistency_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_offer_product uuid;
  v_landed_offer uuid;
  v_landed_currency text;
  v_tax_mode text;
  v_tax_territory text;
BEGIN
  SELECT canonical_product_id INTO v_offer_product FROM private.supplier_offers WHERE id = NEW.supplier_offer_id;
  SELECT supplier_offer_id, currency INTO v_landed_offer, v_landed_currency
    FROM private.supplier_landed_cost_snapshots WHERE id = NEW.landed_cost_snapshot_id;
  SELECT commercial_mode, territory INTO v_tax_mode, v_tax_territory
    FROM private.supplier_tax_rule_versions WHERE id = NEW.tax_rule_version_id;

  IF v_offer_product IS NULL OR v_offer_product <> NEW.canonical_product_id THEN
    RAISE EXCEPTION 'pricing canonical product must match supplier offer';
  END IF;
  IF v_landed_offer IS NULL OR v_landed_offer <> NEW.supplier_offer_id THEN
    RAISE EXCEPTION 'pricing landed cost must belong to supplier offer';
  END IF;
  IF v_landed_currency <> NEW.currency THEN
    RAISE EXCEPTION 'pricing and landed-cost currencies must match';
  END IF;
  IF v_tax_mode IS NULL OR v_tax_mode <> NEW.commercial_mode OR v_tax_territory <> 'GB' THEN
    RAISE EXCEPTION 'pricing tax rule must match commercial mode and GB territory';
  END IF;
  IF NEW.status = 'approved' AND NEW.valid_from > now() THEN
    RAISE EXCEPTION 'approved pricing cannot start in the future';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_pricing_consistency_v1 ON private.supplier_pricing_snapshots;
CREATE TRIGGER trg_guard_supplier_pricing_consistency_v1
BEFORE INSERT OR UPDATE ON private.supplier_pricing_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_pricing_consistency_v1();

CREATE OR REPLACE FUNCTION private.guard_verified_economics_history_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'verified commercial evidence is historical truth and cannot be deleted';
  END IF;
  IF OLD.status IN ('verified','approved') AND (
    to_jsonb(NEW) - ARRAY['status','valid_to','effective_to']::text[]
    IS DISTINCT FROM
    to_jsonb(OLD) - ARRAY['status','valid_to','effective_to']::text[]
  ) THEN
    RAISE EXCEPTION 'verified commercial evidence is immutable; create a new version/snapshot';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tax_rule_history_v1 ON private.supplier_tax_rule_versions;
CREATE TRIGGER trg_guard_tax_rule_history_v1 BEFORE UPDATE OR DELETE ON private.supplier_tax_rule_versions
FOR EACH ROW EXECUTE FUNCTION private.guard_verified_economics_history_v1();
DROP TRIGGER IF EXISTS trg_guard_landed_cost_history_v1 ON private.supplier_landed_cost_snapshots;
CREATE TRIGGER trg_guard_landed_cost_history_v1 BEFORE UPDATE OR DELETE ON private.supplier_landed_cost_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_verified_economics_history_v1();
DROP TRIGGER IF EXISTS trg_guard_pricing_history_v1 ON private.supplier_pricing_snapshots;
CREATE TRIGGER trg_guard_pricing_history_v1 BEFORE UPDATE OR DELETE ON private.supplier_pricing_snapshots
FOR EACH ROW EXECUTE FUNCTION private.guard_verified_economics_history_v1();

CREATE OR REPLACE FUNCTION public.server_admin_supplier_economics_v1(
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
  v_id uuid;
  v_status text;
  v_now timestamptz := now();
BEGIN
  IF NOT private.phase_g_actor_is_active_admin(p_actor_id) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF jsonb_typeof(v_payload) <> 'object' THEN RAISE EXCEPTION 'payload must be an object'; END IF;

  IF v_action = 'record_tax_rule' THEN
    v_status := lower(BTRIM(COALESCE(v_payload->>'status','draft')));
    INSERT INTO private.supplier_tax_rule_versions(
      rule_key, version, territory, commercial_mode, status, effective_from, effective_to,
      rule_payload, evidence_refs, evidence_hash, verified_by, verified_at
    ) VALUES (
      lower(BTRIM(v_payload->>'ruleKey')), NULLIF(v_payload->>'version','')::integer,
      upper(BTRIM(COALESCE(v_payload->>'territory','GB'))), lower(BTRIM(v_payload->>'commercialMode')),
      v_status, COALESCE(NULLIF(v_payload->>'effectiveFrom','')::timestamptz,v_now),
      NULLIF(v_payload->>'effectiveTo','')::timestamptz, COALESCE(v_payload->'rulePayload','{}'::jsonb),
      COALESCE(v_payload->'evidenceRefs','[]'::jsonb), NULLIF(BTRIM(v_payload->>'evidenceHash'),''),
      CASE WHEN v_status='verified' THEN p_actor_id ELSE NULL END,
      CASE WHEN v_status='verified' THEN v_now ELSE NULL END
    ) RETURNING id INTO v_id;
    RETURN jsonb_build_object('ok',true,'taxRuleVersionId',v_id);
  END IF;

  IF v_action = 'record_landed_cost' THEN
    v_status := lower(BTRIM(COALESCE(v_payload->>'status','draft')));
    INSERT INTO private.supplier_landed_cost_snapshots(
      supplier_offer_id, import_item_id, currency, supplier_product_cost, supplier_shipping_cost,
      carrier_cost, customs_duty, import_vat, fx_cost, other_cost, ship_from_country,
      destination_territory, importer_of_record, source_refs, evidence_hash, status,
      valid_from, valid_to, reviewed_by, reviewed_at
    ) VALUES (
      NULLIF(v_payload->>'supplierOfferId','')::uuid, NULLIF(v_payload->>'importItemId','')::uuid,
      upper(BTRIM(v_payload->>'currency')), COALESCE(NULLIF(v_payload->>'supplierProductCost','')::numeric,0),
      COALESCE(NULLIF(v_payload->>'supplierShippingCost','')::numeric,0), COALESCE(NULLIF(v_payload->>'carrierCost','')::numeric,0),
      COALESCE(NULLIF(v_payload->>'customsDuty','')::numeric,0), COALESCE(NULLIF(v_payload->>'importVat','')::numeric,0),
      COALESCE(NULLIF(v_payload->>'fxCost','')::numeric,0), COALESCE(NULLIF(v_payload->>'otherCost','')::numeric,0),
      NULLIF(upper(BTRIM(v_payload->>'shipFromCountry')),''), upper(BTRIM(COALESCE(v_payload->>'destinationTerritory','GB'))),
      NULLIF(BTRIM(v_payload->>'importerOfRecord'),''), COALESCE(v_payload->'sourceRefs','[]'::jsonb),
      BTRIM(v_payload->>'evidenceHash'), v_status, COALESCE(NULLIF(v_payload->>'validFrom','')::timestamptz,v_now),
      NULLIF(v_payload->>'validTo','')::timestamptz, CASE WHEN v_status='verified' THEN p_actor_id ELSE NULL END,
      CASE WHEN v_status='verified' THEN v_now ELSE NULL END
    ) RETURNING id INTO v_id;
    RETURN jsonb_build_object('ok',true,'landedCostSnapshotId',v_id);
  END IF;

  IF v_action = 'record_pricing' THEN
    v_status := lower(BTRIM(COALESCE(v_payload->>'status','candidate')));
    INSERT INTO private.supplier_pricing_snapshots(
      supplier_offer_id, canonical_product_id, landed_cost_snapshot_id, tax_rule_version_id,
      commercial_mode, currency, merchandise_amount, mandatory_fee_amount, customer_shipping_charge,
      tax_amount, gross_customer_price, expected_contribution, minimum_contribution,
      pricing_policy_version, status, valid_from, valid_to, evidence, approved_by, approved_at
    ) VALUES (
      NULLIF(v_payload->>'supplierOfferId','')::uuid, NULLIF(v_payload->>'canonicalProductId','')::uuid,
      NULLIF(v_payload->>'landedCostSnapshotId','')::uuid, NULLIF(v_payload->>'taxRuleVersionId','')::uuid,
      lower(BTRIM(v_payload->>'commercialMode')), upper(BTRIM(v_payload->>'currency')),
      COALESCE(NULLIF(v_payload->>'merchandiseAmount','')::numeric,0), COALESCE(NULLIF(v_payload->>'mandatoryFeeAmount','')::numeric,0),
      COALESCE(NULLIF(v_payload->>'customerShippingCharge','')::numeric,0), COALESCE(NULLIF(v_payload->>'taxAmount','')::numeric,0),
      NULLIF(v_payload->>'grossCustomerPrice','')::numeric, NULLIF(v_payload->>'expectedContribution','')::numeric,
      COALESCE(NULLIF(v_payload->>'minimumContribution','')::numeric,0), NULLIF(v_payload->>'pricingPolicyVersion','')::integer,
      v_status, COALESCE(NULLIF(v_payload->>'validFrom','')::timestamptz,v_now), NULLIF(v_payload->>'validTo','')::timestamptz,
      COALESCE(v_payload->'evidence','{}'::jsonb), CASE WHEN v_status='approved' THEN p_actor_id ELSE NULL END,
      CASE WHEN v_status='approved' THEN v_now ELSE NULL END
    ) RETURNING id INTO v_id;
    RETURN jsonb_build_object('ok',true,'pricingSnapshotId',v_id);
  END IF;

  RAISE EXCEPTION 'unsupported supplier economics action';
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_economics_v1(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_economics_v1(uuid,text,jsonb) TO service_role;

-- No control is enabled by Phase G.;
