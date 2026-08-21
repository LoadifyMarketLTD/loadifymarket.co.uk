-- 629_supplier_stock_price_sync_guards.sql
-- Phase H hard guards, canonical control-plane extension and server-only ingestion/admin boundaries.

CREATE OR REPLACE FUNCTION public.server_supplier_commerce_control_decision_v1(
  p_operation text,
  p_scope jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_operation text := lower(BTRIM(COALESCE(p_operation, '')));
  v_global private.supplier_commerce_controls%ROWTYPE;
  v_operation_control private.supplier_commerce_controls%ROWTYPE;
  v_scope_type text;
  v_scope_ref text;
  v_blocker private.supplier_commerce_controls%ROWTYPE;
  v_scope_key text;
BEGIN
  IF v_operation NOT IN (
    'import','publish','checkout','reservation','supplier_order','tracking_ingest','return_recovery','stock_sync','price_sync'
  ) THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'unknown_operation', 'interfaceVersion', 1);
  END IF;
  IF p_scope IS NULL OR jsonb_typeof(p_scope) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('enabled', false, 'reason', 'invalid_scope', 'interfaceVersion', 1);
  END IF;

  SELECT * INTO v_global FROM private.supplier_commerce_controls
   WHERE operation='*' AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF NOT FOUND OR v_global.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('enabled',false,'reason','supplier_commerce_global_disabled','interfaceVersion',1,'controlVersion',COALESCE(v_global.version,0));
  END IF;

  SELECT * INTO v_operation_control FROM private.supplier_commerce_controls
   WHERE operation=v_operation AND scope_type='global' AND scope_ref IS NULL LIMIT 1;
  IF NOT FOUND OR v_operation_control.enabled IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('enabled',false,'reason','operation_disabled','operation',v_operation,'interfaceVersion',1,'controlVersion',COALESCE(v_operation_control.version,0));
  END IF;

  FOREACH v_scope_type IN ARRAY ARRAY['provider','supplier','offer','product','category','territory','cohort']::text[] LOOP
    v_scope_key := CASE v_scope_type
      WHEN 'provider' THEN 'providerRef' WHEN 'supplier' THEN 'supplierRef' WHEN 'offer' THEN 'offerRef'
      WHEN 'product' THEN 'productRef' WHEN 'category' THEN 'categoryRef' WHEN 'territory' THEN 'territory'
      WHEN 'cohort' THEN 'cohort' END;
    v_scope_ref := NULLIF(BTRIM(p_scope ->> v_scope_key), '');
    IF v_scope_ref IS NOT NULL THEN
      SELECT * INTO v_blocker FROM private.supplier_commerce_controls
       WHERE operation IN ('*',v_operation) AND scope_type=v_scope_type AND scope_ref=v_scope_ref AND enabled=false
       ORDER BY CASE WHEN operation=v_operation THEN 0 ELSE 1 END LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object('enabled',false,'reason','scoped_kill_switch','operation',v_operation,'scopeType',v_scope_type,'scopeRef',v_scope_ref,'interfaceVersion',1,'controlVersion',v_blocker.version);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('enabled',true,'reason','enabled','operation',v_operation,'interfaceVersion',1,'controlVersion',GREATEST(v_global.version,v_operation_control.version));
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_commerce_control_decision_v1(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_commerce_control_decision_v1(text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_set_supplier_commerce_control_v1(
  p_actor_id uuid, p_operation text, p_scope_type text, p_scope_ref text, p_enabled boolean, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_operation text := lower(BTRIM(COALESCE(p_operation,'')));
  v_scope_type text := lower(BTRIM(COALESCE(p_scope_type,'')));
  v_scope_ref text := NULLIF(BTRIM(p_scope_ref),'');
  v_reason text := NULLIF(BTRIM(p_reason),'');
  v_existing private.supplier_commerce_controls%ROWTYPE;
  v_saved private.supplier_commerce_controls%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority required' USING ERRCODE='42501';
  END IF;
  IF v_operation NOT IN ('*','import','publish','checkout','reservation','supplier_order','tracking_ingest','return_recovery','stock_sync','price_sync') THEN
    RAISE EXCEPTION 'unsupported Supplier Commerce control operation' USING ERRCODE='22023';
  END IF;
  IF v_scope_type NOT IN ('global','provider','supplier','offer','product','category','territory','cohort') THEN
    RAISE EXCEPTION 'unsupported Supplier Commerce control scope' USING ERRCODE='22023';
  END IF;
  IF (v_scope_type='global' AND v_scope_ref IS NOT NULL) OR (v_scope_type<>'global' AND v_scope_ref IS NULL) THEN
    RAISE EXCEPTION 'invalid Supplier Commerce control scope reference' USING ERRCODE='22023';
  END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'control change reason is required' USING ERRCODE='22023'; END IF;

  SELECT * INTO v_existing FROM private.supplier_commerce_controls
   WHERE operation=v_operation AND scope_type=v_scope_type AND scope_ref_key=COALESCE(v_scope_ref,'') FOR UPDATE;
  IF FOUND THEN
    UPDATE private.supplier_commerce_controls SET enabled=p_enabled, reason=v_reason, version=version+1,
      updated_by=p_actor_id, updated_at=now() WHERE id=v_existing.id RETURNING * INTO v_saved;
  ELSE
    INSERT INTO private.supplier_commerce_controls(operation,scope_type,scope_ref,enabled,reason,updated_by)
    VALUES(v_operation,v_scope_type,v_scope_ref,p_enabled,v_reason,p_actor_id) RETURNING * INTO v_saved;
  END IF;

  INSERT INTO private.supplier_commerce_control_audit(
    control_id,actor_id,operation,scope_type,scope_ref,previous_enabled,new_enabled,previous_version,new_version,reason
  ) VALUES(
    v_saved.id,p_actor_id,v_operation,v_scope_type,v_scope_ref,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.enabled END,v_saved.enabled,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE v_existing.version END,v_saved.version,v_reason
  );
  RETURN jsonb_build_object('id',v_saved.id,'operation',v_saved.operation,'scopeType',v_saved.scope_type,'scopeRef',v_saved.scope_ref,'enabled',v_saved.enabled,'version',v_saved.version,'updatedAt',v_saved.updated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.server_set_supplier_commerce_control_v1(uuid,text,text,text,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_set_supplier_commerce_control_v1(uuid,text,text,text,boolean,text) TO service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_sync_observation_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier sync observations are append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_stock_observation_immutable_v1 ON private.supplier_stock_observations;
CREATE TRIGGER trg_guard_supplier_stock_observation_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_stock_observations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_sync_observation_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_price_observation_immutable_v1 ON private.supplier_price_observations;
CREATE TRIGGER trg_guard_supplier_price_observation_immutable_v1 BEFORE UPDATE OR DELETE ON private.supplier_price_observations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_sync_observation_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_sync_policy_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='DELETE' AND OLD.status='approved' THEN RAISE EXCEPTION 'approved sync policy cannot be deleted'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='approved' AND (
    NEW.stock_max_age_seconds IS DISTINCT FROM OLD.stock_max_age_seconds OR
    NEW.price_max_age_seconds IS DISTINCT FROM OLD.price_max_age_seconds OR
    NEW.safety_stock_quantity IS DISTINCT FROM OLD.safety_stock_quantity OR
    NEW.allow_unknown_quantity IS DISTINCT FROM OLD.allow_unknown_quantity OR
    NEW.policy_version IS DISTINCT FROM OLD.policy_version OR
    NEW.evidence IS DISTINCT FROM OLD.evidence OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  ) THEN RAISE EXCEPTION 'approved sync policy is immutable; retire and create a new versioned policy'; END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_sync_policy_history_v1 ON private.supplier_offer_sync_policies;
CREATE TRIGGER trg_guard_supplier_sync_policy_history_v1 BEFORE UPDATE OR DELETE ON private.supplier_offer_sync_policies
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_sync_policy_history_v1();

CREATE OR REPLACE FUNCTION public.server_record_supplier_sync_observation_v1(
  p_kind text,
  p_supplier_offer_id uuid,
  p_external_variant_ref text,
  p_provider_event_key text,
  p_observed_at timestamptz,
  p_adapter_version text,
  p_availability text DEFAULT NULL,
  p_quantity integer DEFAULT NULL,
  p_amount_minor bigint DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_source_ref text DEFAULT NULL,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_kind text := lower(BTRIM(COALESCE(p_kind,'')));
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_control jsonb;
  v_id uuid;
  v_existing_stock private.supplier_stock_observations%ROWTYPE;
  v_existing_price private.supplier_price_observations%ROWTYPE;
BEGIN
  IF v_kind NOT IN ('stock','price') THEN RAISE EXCEPTION 'sync kind must be stock or price'; END IF;
  IF p_observed_at IS NULL OR p_observed_at > now() + interval '5 minutes' THEN RAISE EXCEPTION 'invalid supplier observation timestamp'; END IF;
  IF NULLIF(BTRIM(p_provider_event_key),'') IS NULL OR NULLIF(BTRIM(p_adapter_version),'') IS NULL THEN RAISE EXCEPTION 'event key and adapter version are required'; END IF;
  IF jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'evidence must be an object'; END IF;

  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=p_supplier_offer_id AND status='approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'approved supplier offer required'; END IF;
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers WHERE id=v_offer.supplier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier foundation record missing'; END IF;

  v_control := public.server_supplier_commerce_control_decision_v1(
    CASE WHEN v_kind='stock' THEN 'stock_sync' ELSE 'price_sync' END,
    jsonb_build_object('supplierRef',v_supplier.supplier_key,'offerRef',v_offer.offer_key,'productRef',v_offer.canonical_product_id::text,'territory',v_offer.territory)
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('accepted',false,'reason','sync_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;

  IF v_kind='stock' THEN
    IF p_availability NOT IN ('in_stock','out_of_stock','limited','unknown') OR (p_quantity IS NOT NULL AND p_quantity<0) THEN RAISE EXCEPTION 'invalid stock observation'; END IF;
    SELECT * INTO v_existing_stock FROM private.supplier_stock_observations WHERE provider_event_key=BTRIM(p_provider_event_key);
    IF FOUND THEN
      IF v_existing_stock.supplier_offer_id<>p_supplier_offer_id OR v_existing_stock.external_variant_ref<>BTRIM(COALESCE(p_external_variant_ref,'')) OR
         v_existing_stock.availability<>p_availability OR v_existing_stock.quantity IS DISTINCT FROM p_quantity OR v_existing_stock.observed_at<>p_observed_at THEN
        RAISE EXCEPTION 'stock event key collision with different evidence';
      END IF;
      RETURN jsonb_build_object('accepted',true,'changed',false,'observationId',v_existing_stock.id,'interfaceVersion',1);
    END IF;
    INSERT INTO private.supplier_stock_observations(
      supplier_offer_id,supplier_catalog_item_id,external_variant_ref,provider_event_key,availability,quantity,observed_at,adapter_version,source_ref,evidence
    ) VALUES(
      p_supplier_offer_id,v_offer.supplier_catalog_item_id,BTRIM(COALESCE(p_external_variant_ref,'')),BTRIM(p_provider_event_key),p_availability,p_quantity,p_observed_at,BTRIM(p_adapter_version),NULLIF(BTRIM(p_source_ref),''),COALESCE(p_evidence,'{}'::jsonb)
    ) RETURNING id INTO v_id;
  ELSE
    IF p_amount_minor IS NULL OR p_amount_minor<0 OR COALESCE(BTRIM(p_currency),'') !~ '^[A-Za-z]{3}$' THEN RAISE EXCEPTION 'invalid price observation'; END IF;
    SELECT * INTO v_existing_price FROM private.supplier_price_observations WHERE provider_event_key=BTRIM(p_provider_event_key);
    IF FOUND THEN
      IF v_existing_price.supplier_offer_id<>p_supplier_offer_id OR v_existing_price.external_variant_ref<>BTRIM(COALESCE(p_external_variant_ref,'')) OR
         v_existing_price.amount_minor<>p_amount_minor OR v_existing_price.currency<>upper(BTRIM(p_currency)) OR v_existing_price.observed_at<>p_observed_at THEN
        RAISE EXCEPTION 'price event key collision with different evidence';
      END IF;
      RETURN jsonb_build_object('accepted',true,'changed',false,'observationId',v_existing_price.id,'interfaceVersion',1);
    END IF;
    INSERT INTO private.supplier_price_observations(
      supplier_offer_id,supplier_catalog_item_id,external_variant_ref,provider_event_key,amount_minor,currency,observed_at,adapter_version,source_ref,evidence
    ) VALUES(
      p_supplier_offer_id,v_offer.supplier_catalog_item_id,BTRIM(COALESCE(p_external_variant_ref,'')),BTRIM(p_provider_event_key),p_amount_minor,upper(BTRIM(p_currency)),p_observed_at,BTRIM(p_adapter_version),NULLIF(BTRIM(p_source_ref),''),COALESCE(p_evidence,'{}'::jsonb)
    ) RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('accepted',true,'changed',true,'observationId',v_id,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_sync_observation_v1(text,uuid,text,text,timestamptz,text,text,integer,bigint,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_sync_observation_v1(text,uuid,text,text,timestamptz,text,text,integer,bigint,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_sync_policy_v1(
  p_actor_id uuid,
  p_supplier_offer_id uuid,
  p_stock_max_age_seconds integer,
  p_price_max_age_seconds integer,
  p_safety_stock_quantity integer,
  p_allow_unknown_quantity boolean,
  p_policy_version integer,
  p_status text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_saved private.supplier_offer_sync_policies%ROWTYPE; v_status text:=lower(BTRIM(COALESCE(p_status,'draft')));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN RAISE EXCEPTION 'active admin authority is required'; END IF;
  IF v_status NOT IN ('draft','approved') THEN RAISE EXCEPTION 'new sync policy status must be draft or approved'; END IF;
  IF EXISTS (SELECT 1 FROM private.supplier_offer_sync_policies p WHERE p.supplier_offer_id=p_supplier_offer_id AND p.status='approved') THEN
    RAISE EXCEPTION 'retire the existing approved sync policy before replacing it';
  END IF;
  INSERT INTO private.supplier_offer_sync_policies(
    supplier_offer_id,stock_max_age_seconds,price_max_age_seconds,safety_stock_quantity,allow_unknown_quantity,policy_version,status,evidence,approved_by,approved_at
  ) VALUES(
    p_supplier_offer_id,p_stock_max_age_seconds,p_price_max_age_seconds,COALESCE(p_safety_stock_quantity,0),COALESCE(p_allow_unknown_quantity,false),p_policy_version,v_status,COALESCE(p_evidence,'{}'::jsonb),
    CASE WHEN v_status='approved' THEN p_actor_id ELSE NULL END,CASE WHEN v_status='approved' THEN now() ELSE NULL END
  ) RETURNING * INTO v_saved;
  RETURN jsonb_build_object('ok',true,'supplierOfferId',v_saved.supplier_offer_id,'policyVersion',v_saved.policy_version,'status',v_saved.status,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_sync_policy_v1(uuid,uuid,integer,integer,integer,boolean,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_sync_policy_v1(uuid,uuid,integer,integer,integer,boolean,integer,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_offer_checkout_guard_v1(
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
DECLARE v_offer private.supplier_offers%ROWTYPE; v_control jsonb; v_sync jsonb;
BEGIN
  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=p_supplier_offer_id AND canonical_product_id=p_canonical_product_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'reason','supplier_offer_not_linked','interfaceVersion',1); END IF;
  v_control := public.server_supplier_commerce_control_decision_v1('checkout',jsonb_build_object('offerRef',v_offer.offer_key,'productRef',p_canonical_product_id::text,'territory',upper(BTRIM(COALESCE(p_territory,'GB')))));
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','checkout_control_disabled','control',v_control,'interfaceVersion',1);
  END IF;
  v_sync := public.server_supplier_stock_price_decision_v1(p_supplier_offer_id,p_canonical_product_id,p_commercial_mode,p_territory,p_external_variant_ref);
  IF COALESCE((v_sync->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','stock_price_not_ready','sync',v_sync,'interfaceVersion',1);
  END IF;
  RETURN jsonb_build_object('eligible',true,'reason','supplier_offer_checkout_ready','sync',v_sync,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_supplier_offer_checkout_guard_v1(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_offer_checkout_guard_v1(uuid,uuid,text,text,text) TO service_role;

-- Phase H does not enable any control. stock_sync, price_sync and checkout remain OFF unless explicitly activated later.
