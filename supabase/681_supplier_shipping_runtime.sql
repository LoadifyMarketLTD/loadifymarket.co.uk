-- 681_supplier_shipping_runtime.sql
-- E2E remediation Stage 5A: provider-neutral supplier shipping quote preparation,
-- evidence recording and selection. SQL performs no provider call.

CREATE TABLE IF NOT EXISTS private.supplier_shipping_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES private.supplier_foundation_suppliers(id) ON DELETE RESTRICT,
  pricing_snapshot_id uuid NOT NULL REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity>0),
  destination_country text NOT NULL,
  provider_key text NOT NULL,
  adapter_version text NOT NULL,
  supplier_key text NOT NULL,
  external_offer_ref text NOT NULL,
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  request_fingerprint text NOT NULL,
  state text NOT NULL DEFAULT 'prepared',
  error_class text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT supplier_shipping_request_destination_check CHECK (
    destination_country=upper(BTRIM(destination_country)) AND destination_country ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT supplier_shipping_request_identity_check CHECK (
    NULLIF(BTRIM(provider_key),'') IS NOT NULL
    AND NULLIF(BTRIM(adapter_version),'') IS NOT NULL
    AND NULLIF(BTRIM(supplier_key),'') IS NOT NULL
    AND NULLIF(BTRIM(external_offer_ref),'') IS NOT NULL
    AND NULLIF(BTRIM(idempotency_key),'') IS NOT NULL
    AND request_fingerprint ~ '^[0-9a-f]{32}$'
  ),
  CONSTRAINT supplier_shipping_request_state_check CHECK (
    state IN ('prepared','quoted','failed','unknown','selected')
  )
);
CREATE INDEX IF NOT EXISTS supplier_shipping_request_offer_idx
  ON private.supplier_shipping_quote_requests(supplier_offer_id,created_at DESC);

CREATE TABLE IF NOT EXISTS private.supplier_shipping_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES private.supplier_shipping_quote_requests(id) ON DELETE RESTRICT,
  service_ref text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor>=0),
  currency text NOT NULL,
  estimated_dispatch_at timestamptz,
  estimated_delivery_from timestamptz,
  estimated_delivery_to timestamptz,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_shipping_quote_service_check CHECK (NULLIF(BTRIM(service_ref),'') IS NOT NULL),
  CONSTRAINT supplier_shipping_quote_currency_check CHECK (currency=upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_shipping_quote_delivery_window_check CHECK (
    estimated_delivery_to IS NULL OR estimated_delivery_from IS NULL OR estimated_delivery_to>=estimated_delivery_from
  ),
  CONSTRAINT supplier_shipping_quote_evidence_check CHECK (jsonb_typeof(evidence)='object' AND evidence<>'{}'::jsonb),
  UNIQUE(request_id,service_ref)
);

CREATE TABLE IF NOT EXISTS private.supplier_shipping_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES private.supplier_shipping_quote_requests(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL UNIQUE REFERENCES private.supplier_shipping_quotes(id) ON DELETE RESTRICT,
  public_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  pricing_snapshot_id uuid NOT NULL REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  service_ref text NOT NULL,
  supplier_shipping_cost_minor bigint NOT NULL CHECK (supplier_shipping_cost_minor>=0),
  currency text NOT NULL,
  decision_key text NOT NULL UNIQUE,
  evidence jsonb NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_shipping_decision_currency_check CHECK (currency=upper(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$'),
  CONSTRAINT supplier_shipping_decision_key_check CHECK (NULLIF(BTRIM(decision_key),'') IS NOT NULL),
  CONSTRAINT supplier_shipping_decision_evidence_check CHECK (jsonb_typeof(evidence)='object' AND evidence<>'{}'::jsonb)
);

REVOKE ALL ON TABLE private.supplier_shipping_quote_requests FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_shipping_quotes FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_shipping_decisions FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_shipping_evidence_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier shipping quote/decision evidence is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_shipping_quotes_immutable_v1 ON private.supplier_shipping_quotes;
CREATE TRIGGER trg_guard_supplier_shipping_quotes_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_shipping_quotes
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_shipping_evidence_immutable_v1();
DROP TRIGGER IF EXISTS trg_guard_supplier_shipping_decisions_immutable_v1 ON private.supplier_shipping_decisions;
CREATE TRIGGER trg_guard_supplier_shipping_decisions_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_shipping_decisions
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_shipping_evidence_immutable_v1();

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_shipping_quote_v1(
  p_public_product_id uuid,
  p_quantity integer,
  p_destination_country text,
  p_idempotency_key text,
  p_correlation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_checkout jsonb;
  v_offer private.supplier_offers%ROWTYPE;
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_adapter private.supplier_adapter_registrations%ROWTYPE;
  v_existing private.supplier_shipping_quote_requests%ROWTYPE;
  v_request private.supplier_shipping_quote_requests%ROWTYPE;
  v_destination text:=upper(BTRIM(COALESCE(p_destination_country,'')));
  v_key text:=BTRIM(COALESCE(p_idempotency_key,''));
  v_fingerprint text;
BEGIN
  IF p_public_product_id IS NULL OR p_quantity IS NULL OR p_quantity<=0
     OR v_destination !~ '^[A-Z]{2}$' OR v_key='' OR p_correlation_id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_shipping_quote_request','interfaceVersion',1);
  END IF;
  IF v_destination<>'GB' THEN
    RETURN jsonb_build_object('eligible',false,'reason','shipping_destination_not_enabled','destinationCountry',v_destination,'interfaceVersion',1);
  END IF;

  v_checkout:=public.server_supplier_listing_checkout_decision_v1(p_public_product_id,p_quantity);
  IF COALESCE((v_checkout->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_checkout_not_ready','checkout',v_checkout,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id=(v_checkout->>'supplierOfferId')::uuid AND status='approved';
  SELECT * INTO v_supplier FROM private.supplier_foundation_suppliers
   WHERE id=v_offer.supplier_id AND lifecycle_status='approved';
  IF v_supplier.id IS NULL THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_approved','interfaceVersion',1);
  END IF;

  SELECT * INTO v_adapter FROM private.supplier_adapter_registrations a
   WHERE a.supplier_id=v_supplier.id
     AND a.status='active'
     AND a.interface_version=1
     AND a.verified_at IS NOT NULL
     AND a.capabilities @> ARRAY['shipping']::text[]
   ORDER BY a.verified_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_shipping_adapter_not_ready','interfaceVersion',1);
  END IF;

  v_fingerprint:=md5(concat_ws('|',
    p_public_product_id::text,p_quantity::text,v_destination,v_offer.id::text,
    v_checkout->>'pricingSnapshotId',v_adapter.provider_key,v_adapter.adapter_version
  ));

  SELECT * INTO v_existing FROM private.supplier_shipping_quote_requests WHERE idempotency_key=v_key;
  IF FOUND THEN
    IF v_existing.request_fingerprint<>v_fingerprint OR v_existing.correlation_id<>p_correlation_id THEN
      RAISE EXCEPTION 'supplier shipping quote idempotency collision';
    END IF;
    RETURN jsonb_build_object(
      'eligible',true,'reason','shipping_quote_request_replayed','requestId',v_existing.id,
      'state',v_existing.state,'supplierKey',v_existing.supplier_key,'providerKey',v_existing.provider_key,
      'adapterVersion',v_existing.adapter_version,'externalOfferRef',v_existing.external_offer_ref,
      'quantity',v_existing.quantity,'destinationCountry',v_existing.destination_country,
      'idempotencyKey',v_existing.idempotency_key,'correlationId',v_existing.correlation_id,'interfaceVersion',1
    );
  END IF;

  INSERT INTO private.supplier_shipping_quote_requests(
    public_product_id,canonical_product_id,supplier_offer_id,supplier_id,pricing_snapshot_id,
    quantity,destination_country,provider_key,adapter_version,supplier_key,external_offer_ref,
    correlation_id,idempotency_key,request_fingerprint
  ) VALUES(
    p_public_product_id,(v_checkout->>'canonicalProductId')::uuid,v_offer.id,v_supplier.id,
    (v_checkout->>'pricingSnapshotId')::uuid,p_quantity,v_destination,v_adapter.provider_key,
    v_adapter.adapter_version,v_supplier.supplier_key,v_offer.external_offer_ref,p_correlation_id,v_key,v_fingerprint
  ) RETURNING * INTO v_request;

  RETURN jsonb_build_object(
    'eligible',true,'reason','supplier_shipping_quote_ready','requestId',v_request.id,
    'publicProductId',v_request.public_product_id,'canonicalProductId',v_request.canonical_product_id,
    'supplierOfferId',v_request.supplier_offer_id,'pricingSnapshotId',v_request.pricing_snapshot_id,
    'supplierKey',v_request.supplier_key,'providerKey',v_request.provider_key,'adapterVersion',v_request.adapter_version,
    'externalOfferRef',v_request.external_offer_ref,'quantity',v_request.quantity,
    'destinationCountry',v_request.destination_country,'idempotencyKey',v_request.idempotency_key,
    'correlationId',v_request.correlation_id,'state',v_request.state,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_prepare_supplier_shipping_quote_v1(uuid,integer,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_shipping_quote_v1(uuid,integer,text,text,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_record_supplier_shipping_quote_result_v1(
  p_request_id uuid,
  p_result_class text,
  p_quotes jsonb,
  p_error_class text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_request private.supplier_shipping_quote_requests%ROWTYPE;
  v_result text:=upper(BTRIM(COALESCE(p_result_class,'')));
  v_quote jsonb;
  v_count integer:=0;
BEGIN
  SELECT * INTO v_request FROM private.supplier_shipping_quote_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','shipping_quote_request_not_found','interfaceVersion',1); END IF;
  IF v_request.state IN ('quoted','selected') THEN
    RETURN jsonb_build_object('ok',true,'reason','shipping_quote_result_already_recorded','requestId',v_request.id,'state',v_request.state,'interfaceVersion',1);
  END IF;
  IF v_result NOT IN ('SUCCESS','AUTH_CONFIGURATION_FAILURE','RATE_LIMITED','RETRYABLE_FAILURE','PERMANENT_REJECTION','UNKNOWN_OUTCOME','MALFORMED_RESPONSE','CAPABILITY_UNAVAILABLE') THEN
    RAISE EXCEPTION 'invalid shipping quote result class';
  END IF;

  IF v_result='SUCCESS' THEN
    IF jsonb_typeof(COALESCE(p_quotes,'[]'::jsonb))<>'array' OR jsonb_array_length(p_quotes)=0 THEN
      RAISE EXCEPTION 'successful shipping quote result requires at least one quote';
    END IF;
    FOR v_quote IN SELECT value FROM jsonb_array_elements(p_quotes) LOOP
      IF jsonb_typeof(v_quote)<>'object'
         OR NULLIF(BTRIM(v_quote->>'serviceRef'),'') IS NULL
         OR jsonb_typeof(v_quote->'amountMinor')<>'number'
         OR (v_quote->>'amountMinor')::numeric<0
         OR upper(BTRIM(COALESCE(v_quote->>'currency','')))<>'GBP' THEN
        RAISE EXCEPTION 'malformed supplier shipping quote evidence';
      END IF;
      INSERT INTO private.supplier_shipping_quotes(
        request_id,service_ref,amount_minor,currency,estimated_dispatch_at,
        estimated_delivery_from,estimated_delivery_to,evidence
      ) VALUES(
        v_request.id,BTRIM(v_quote->>'serviceRef'),(v_quote->>'amountMinor')::bigint,'GBP',
        NULLIF(v_quote->>'estimatedDispatchAt','')::timestamptz,
        NULLIF(v_quote->>'estimatedDeliveryFrom','')::timestamptz,
        NULLIF(v_quote->>'estimatedDeliveryTo','')::timestamptz,v_quote
      ) ON CONFLICT(request_id,service_ref) DO NOTHING;
      v_count:=v_count+1;
    END LOOP;
    UPDATE private.supplier_shipping_quote_requests SET state='quoted',completed_at=now(),error_class=NULL,error_message=NULL
     WHERE id=v_request.id;
    RETURN jsonb_build_object('ok',true,'reason','shipping_quotes_recorded','requestId',v_request.id,'quoteCount',v_count,'state','quoted','interfaceVersion',1);
  END IF;

  UPDATE private.supplier_shipping_quote_requests SET
    state=CASE WHEN v_result IN ('UNKNOWN_OUTCOME','MALFORMED_RESPONSE') THEN 'unknown' ELSE 'failed' END,
    error_class=COALESCE(NULLIF(BTRIM(p_error_class),''),v_result),
    error_message=NULLIF(BTRIM(p_error_message),''),completed_at=now()
  WHERE id=v_request.id;
  RETURN jsonb_build_object('ok',false,'reason','shipping_quote_provider_failure','requestId',v_request.id,
    'resultClass',v_result,'state',CASE WHEN v_result IN ('UNKNOWN_OUTCOME','MALFORMED_RESPONSE') THEN 'unknown' ELSE 'failed' END,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_record_supplier_shipping_quote_result_v1(uuid,text,jsonb,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_record_supplier_shipping_quote_result_v1(uuid,text,jsonb,text,text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_select_supplier_shipping_quote_v1(
  p_request_id uuid,
  p_service_ref text,
  p_decision_key text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_request private.supplier_shipping_quote_requests%ROWTYPE;
  v_quote private.supplier_shipping_quotes%ROWTYPE;
  v_existing private.supplier_shipping_decisions%ROWTYPE;
  v_decision private.supplier_shipping_decisions%ROWTYPE;
  v_pricing private.supplier_pricing_snapshots%ROWTYPE;
  v_landed private.supplier_landed_cost_snapshots%ROWTYPE;
  v_key text:=BTRIM(COALESCE(p_decision_key,''));
  v_evidence jsonb:=COALESCE(p_evidence,'{}'::jsonb);
  v_cost_ceiling_minor bigint;
BEGIN
  IF v_key='' OR NULLIF(BTRIM(p_service_ref),'') IS NULL
     OR jsonb_typeof(v_evidence)<>'object' OR v_evidence='{}'::jsonb THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_shipping_selection_request','interfaceVersion',1);
  END IF;
  SELECT * INTO v_request FROM private.supplier_shipping_quote_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.state<>'quoted' THEN
    RETURN jsonb_build_object('ok',false,'reason','shipping_quote_request_not_selectable','interfaceVersion',1);
  END IF;
  SELECT * INTO v_quote FROM private.supplier_shipping_quotes
   WHERE request_id=v_request.id AND service_ref=BTRIM(p_service_ref);
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'reason','shipping_service_quote_not_found','interfaceVersion',1); END IF;

  SELECT * INTO v_existing FROM private.supplier_shipping_decisions WHERE decision_key=v_key;
  IF FOUND THEN
    IF v_existing.request_id<>v_request.id OR v_existing.quote_id<>v_quote.id THEN
      RAISE EXCEPTION 'supplier shipping decision idempotency collision';
    END IF;
    RETURN jsonb_build_object('ok',true,'reason','shipping_decision_replayed','shippingDecisionId',v_existing.id,
      'serviceRef',v_existing.service_ref,'amountMinor',v_existing.supplier_shipping_cost_minor,'currency',v_existing.currency,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_pricing FROM private.supplier_pricing_snapshots WHERE id=v_request.pricing_snapshot_id;
  SELECT * INTO v_landed FROM private.supplier_landed_cost_snapshots WHERE id=v_pricing.landed_cost_snapshot_id;
  IF v_landed.id IS NULL OR v_landed.currency<>'GBP' THEN
    RETURN jsonb_build_object('ok',false,'reason','shipping_cost_economics_not_ready','interfaceVersion',1);
  END IF;
  v_cost_ceiling_minor:=round(v_landed.supplier_shipping_cost*100)::bigint;
  IF v_quote.amount_minor>v_cost_ceiling_minor THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_shipping_cost_exceeds_priced_economics',
      'quoteAmountMinor',v_quote.amount_minor,'pricedCostCeilingMinor',v_cost_ceiling_minor,'interfaceVersion',1);
  END IF;

  INSERT INTO private.supplier_shipping_decisions(
    request_id,quote_id,public_product_id,supplier_offer_id,pricing_snapshot_id,
    service_ref,supplier_shipping_cost_minor,currency,decision_key,evidence
  ) VALUES(
    v_request.id,v_quote.id,v_request.public_product_id,v_request.supplier_offer_id,v_request.pricing_snapshot_id,
    v_quote.service_ref,v_quote.amount_minor,v_quote.currency,v_key,
    v_evidence||jsonb_build_object('pricedSupplierShippingCostCeilingMinor',v_cost_ceiling_minor,'quoteEvidenceId',v_quote.id)
  ) RETURNING * INTO v_decision;
  UPDATE private.supplier_shipping_quote_requests SET state='selected' WHERE id=v_request.id;

  RETURN jsonb_build_object('ok',true,'reason','supplier_shipping_selected','shippingDecisionId',v_decision.id,
    'requestId',v_request.id,'publicProductId',v_decision.public_product_id,'supplierOfferId',v_decision.supplier_offer_id,
    'pricingSnapshotId',v_decision.pricing_snapshot_id,'serviceRef',v_decision.service_ref,
    'amountMinor',v_decision.supplier_shipping_cost_minor,'currency',v_decision.currency,'interfaceVersion',1);
END;
$$;
REVOKE ALL ON FUNCTION public.server_select_supplier_shipping_quote_v1(uuid,text,text,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_select_supplier_shipping_quote_v1(uuid,text,text,jsonb)
  TO service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_shipping_quote_v1(uuid,integer,text,text,uuid) IS
  'Stage 5A prepares an exact adapter-bound supplier shipping request only after canonical checkout readiness. No provider call is made by SQL.';
COMMENT ON FUNCTION public.server_select_supplier_shipping_quote_v1(uuid,text,text,jsonb) IS
  'Stage 5A selects immutable provider quote evidence only when supplier shipping cost does not exceed the cost already approved in the pricing economics snapshot.';
