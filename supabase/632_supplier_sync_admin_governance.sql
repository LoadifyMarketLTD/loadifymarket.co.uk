-- 632_supplier_sync_admin_governance.sql
-- Phase H admin governance: version lifecycle, audit and server-side status visibility.

CREATE TABLE IF NOT EXISTS private.supplier_sync_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  policy_id uuid REFERENCES private.supplier_offer_sync_policies(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  policy_version integer NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_sync_policy_audit_action_check CHECK (action IN ('created','approved','retired')),
  CONSTRAINT supplier_sync_policy_audit_reason_check CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_sync_policy_audit_evidence_check CHECK (jsonb_typeof(evidence)='object')
);
CREATE INDEX IF NOT EXISTS supplier_sync_policy_audit_offer_idx
  ON private.supplier_sync_policy_audit(supplier_offer_id, created_at DESC);
REVOKE ALL ON TABLE private.supplier_sync_policy_audit FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_sync_policy_history_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.status='approved' THEN RAISE EXCEPTION 'approved sync policy cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status='approved' AND (
    NEW.stock_max_age_seconds IS DISTINCT FROM OLD.stock_max_age_seconds OR
    NEW.price_max_age_seconds IS DISTINCT FROM OLD.price_max_age_seconds OR
    NEW.safety_stock_quantity IS DISTINCT FROM OLD.safety_stock_quantity OR
    NEW.allow_unknown_quantity IS DISTINCT FROM OLD.allow_unknown_quantity OR
    NEW.policy_version IS DISTINCT FROM OLD.policy_version OR
    NEW.evidence IS DISTINCT FROM OLD.evidence OR
    NEW.approved_by IS DISTINCT FROM OLD.approved_by OR
    NEW.approved_at IS DISTINCT FROM OLD.approved_at
  ) THEN RAISE EXCEPTION 'approved sync policy is immutable; retire and create a new versioned policy'; END IF;
  RETURN NEW;
END;
$$;

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
DECLARE
  v_saved private.supplier_offer_sync_policies%ROWTYPE;
  v_status text:=lower(BTRIM(COALESCE(p_status,'draft')));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.supplier_offers o WHERE o.id=p_supplier_offer_id) THEN RAISE EXCEPTION 'supplier offer not found'; END IF;
  IF v_status NOT IN ('draft','approved') THEN RAISE EXCEPTION 'new sync policy status must be draft or approved'; END IF;
  IF jsonb_typeof(COALESCE(p_evidence,'{}'::jsonb))<>'object' THEN RAISE EXCEPTION 'policy evidence must be an object'; END IF;
  IF v_status='approved' AND COALESCE(p_evidence,'{}'::jsonb)='{}'::jsonb THEN RAISE EXCEPTION 'approved policy requires evidence'; END IF;
  IF EXISTS (SELECT 1 FROM private.supplier_offer_sync_policies p WHERE p.supplier_offer_id=p_supplier_offer_id AND p.status='approved') THEN
    RAISE EXCEPTION 'retire the existing approved sync policy before replacing it';
  END IF;

  INSERT INTO private.supplier_offer_sync_policies(
    supplier_offer_id,stock_max_age_seconds,price_max_age_seconds,safety_stock_quantity,
    allow_unknown_quantity,policy_version,status,evidence,approved_by,approved_at
  ) VALUES(
    p_supplier_offer_id,p_stock_max_age_seconds,p_price_max_age_seconds,COALESCE(p_safety_stock_quantity,0),
    COALESCE(p_allow_unknown_quantity,false),p_policy_version,v_status,COALESCE(p_evidence,'{}'::jsonb),
    CASE WHEN v_status='approved' THEN p_actor_id ELSE NULL END,
    CASE WHEN v_status='approved' THEN now() ELSE NULL END
  ) RETURNING * INTO v_saved;

  INSERT INTO private.supplier_sync_policy_audit(
    supplier_offer_id,policy_id,actor_id,action,policy_version,reason,evidence
  ) VALUES(
    v_saved.supplier_offer_id,v_saved.id,p_actor_id,CASE WHEN v_status='approved' THEN 'approved' ELSE 'created' END,
    v_saved.policy_version,CASE WHEN v_status='approved' THEN 'Approved Phase H sync policy' ELSE 'Created Phase H draft sync policy' END,v_saved.evidence
  );

  RETURN jsonb_build_object('ok',true,'policyId',v_saved.id,'supplierOfferId',v_saved.supplier_offer_id,'policyVersion',v_saved.policy_version,'status',v_saved.status,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_sync_policy_v1(uuid,uuid,integer,integer,integer,boolean,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_sync_policy_v1(uuid,uuid,integer,integer,integer,boolean,integer,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_retire_supplier_sync_policy_v1(
  p_actor_id uuid,
  p_supplier_offer_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_policy private.supplier_offer_sync_policies%ROWTYPE; v_reason text:=NULLIF(BTRIM(p_reason),'');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN RAISE EXCEPTION 'active admin authority is required'; END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'retirement reason is required'; END IF;
  SELECT * INTO v_policy FROM private.supplier_offer_sync_policies
   WHERE supplier_offer_id=p_supplier_offer_id AND status='approved' ORDER BY policy_version DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'approved sync policy not found'; END IF;
  UPDATE private.supplier_offer_sync_policies SET status='retired',updated_at=now() WHERE id=v_policy.id RETURNING * INTO v_policy;
  INSERT INTO private.supplier_sync_policy_audit(supplier_offer_id,policy_id,actor_id,action,policy_version,reason,evidence)
  VALUES(v_policy.supplier_offer_id,v_policy.id,p_actor_id,'retired',v_policy.policy_version,v_reason,v_policy.evidence);
  RETURN jsonb_build_object('ok',true,'policyId',v_policy.id,'supplierOfferId',v_policy.supplier_offer_id,'policyVersion',v_policy.policy_version,'status',v_policy.status,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_retire_supplier_sync_policy_v1(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_retire_supplier_sync_policy_v1(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_sync_status_v1(
  p_actor_id uuid,
  p_supplier_offer_id uuid,
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
  v_policy private.supplier_offer_sync_policies%ROWTYPE;
  v_stock private.supplier_stock_observations%ROWTYPE;
  v_price private.supplier_price_observations%ROWTYPE;
  v_decision jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true) THEN RAISE EXCEPTION 'active admin authority is required'; END IF;
  SELECT * INTO v_offer FROM private.supplier_offers WHERE id=p_supplier_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier offer not found'; END IF;
  SELECT * INTO v_policy FROM private.supplier_offer_sync_policies WHERE supplier_offer_id=p_supplier_offer_id AND status='approved' ORDER BY policy_version DESC LIMIT 1;
  SELECT * INTO v_stock FROM private.supplier_stock_observations WHERE supplier_offer_id=p_supplier_offer_id AND external_variant_ref=BTRIM(COALESCE(p_external_variant_ref,'')) ORDER BY observed_at DESC,received_at DESC LIMIT 1;
  SELECT * INTO v_price FROM private.supplier_price_observations WHERE supplier_offer_id=p_supplier_offer_id AND external_variant_ref=BTRIM(COALESCE(p_external_variant_ref,'')) ORDER BY observed_at DESC,received_at DESC LIMIT 1;
  v_decision:=public.server_supplier_stock_price_decision_v1(p_supplier_offer_id,v_offer.canonical_product_id,p_commercial_mode,p_territory,p_external_variant_ref);
  RETURN jsonb_build_object(
    'supplierOfferId',p_supplier_offer_id,'offerKey',v_offer.offer_key,'interfaceVersion',1,
    'policy',CASE WHEN v_policy.id IS NULL THEN NULL ELSE jsonb_build_object('id',v_policy.id,'version',v_policy.policy_version,'status',v_policy.status,'stockMaxAgeSeconds',v_policy.stock_max_age_seconds,'priceMaxAgeSeconds',v_policy.price_max_age_seconds,'safetyStockQuantity',v_policy.safety_stock_quantity,'allowUnknownQuantity',v_policy.allow_unknown_quantity) END,
    'latestStock',CASE WHEN v_stock.id IS NULL THEN NULL ELSE jsonb_build_object('id',v_stock.id,'availability',v_stock.availability,'quantity',v_stock.quantity,'observedAt',v_stock.observed_at,'receivedAt',v_stock.received_at) END,
    'latestPrice',CASE WHEN v_price.id IS NULL THEN NULL ELSE jsonb_build_object('id',v_price.id,'amountMinor',v_price.amount_minor,'currency',v_price.currency,'observedAt',v_price.observed_at,'receivedAt',v_price.received_at) END,
    'decision',v_decision
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_admin_supplier_sync_status_v1(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_sync_status_v1(uuid,uuid,text,text,text) TO service_role;

-- No Supplier Commerce control is enabled by this governance migration.
