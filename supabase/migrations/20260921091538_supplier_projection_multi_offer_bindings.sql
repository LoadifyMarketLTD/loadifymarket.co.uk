CREATE TABLE IF NOT EXISTS private.supplier_projection_offer_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_id uuid NOT NULL REFERENCES private.supplier_marketplace_projections(id) ON DELETE CASCADE,
  supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','approved','disabled')),
  fallback_allowed boolean NOT NULL DEFAULT true,
  reason text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_projection_offer_binding_reason_check
    CHECK (NULLIF(BTRIM(reason),'') IS NOT NULL),
  CONSTRAINT supplier_projection_offer_binding_approval_check
    CHECK (
      (status='approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND disabled_at IS NULL)
      OR (status='candidate' AND disabled_at IS NULL)
      OR (status='disabled' AND disabled_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_projection_offer_binding_unique
  ON private.supplier_projection_offer_bindings(projection_id,supplier_offer_id);
CREATE INDEX IF NOT EXISTS supplier_projection_offer_binding_active_idx
  ON private.supplier_projection_offer_bindings(projection_id,status,supplier_offer_id)
  WHERE status='approved';

REVOKE ALL ON TABLE private.supplier_projection_offer_bindings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE private.supplier_projection_offer_bindings TO service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_projection_offer_binding_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
BEGIN
  SELECT * INTO v_projection
  FROM private.supplier_marketplace_projections
  WHERE id=NEW.projection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier marketplace projection not found';
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=NEW.supplier_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier offer not found';
  END IF;

  IF v_offer.canonical_product_id IS DISTINCT FROM v_projection.canonical_product_id THEN
    RAISE EXCEPTION 'supplier offer canonical product does not match projection';
  END IF;
  IF v_offer.territory IS DISTINCT FROM v_projection.territory THEN
    RAISE EXCEPTION 'supplier offer territory does not match projection';
  END IF;
  IF NEW.status='approved' AND v_offer.status<>'approved' THEN
    RAISE EXCEPTION 'only an approved supplier offer may be approved for projection fulfilment';
  END IF;

  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_projection_offer_binding_v1
  ON private.supplier_projection_offer_bindings;
CREATE TRIGGER trg_guard_supplier_projection_offer_binding_v1
BEFORE INSERT OR UPDATE ON private.supplier_projection_offer_bindings
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_projection_offer_binding_v1();

CREATE OR REPLACE FUNCTION private.seed_supplier_projection_primary_offer_binding_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO private.supplier_projection_offer_bindings(
    projection_id,
    supplier_offer_id,
    status,
    fallback_allowed,
    reason,
    created_by,
    approved_by,
    approved_at
  ) VALUES (
    NEW.id,
    NEW.supplier_offer_id,
    'approved',
    true,
    'Primary supplier offer approved with the reviewed marketplace projection',
    NEW.created_by,
    NEW.created_by,
    now()
  )
  ON CONFLICT (projection_id,supplier_offer_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_supplier_projection_primary_offer_binding_v1
  ON private.supplier_marketplace_projections;
CREATE TRIGGER trg_seed_supplier_projection_primary_offer_binding_v1
AFTER INSERT ON private.supplier_marketplace_projections
FOR EACH ROW EXECUTE FUNCTION private.seed_supplier_projection_primary_offer_binding_v1();

INSERT INTO private.supplier_projection_offer_bindings(
  projection_id,
  supplier_offer_id,
  status,
  fallback_allowed,
  reason,
  created_by,
  approved_by,
  approved_at
)
SELECT
  p.id,
  p.supplier_offer_id,
  'approved',
  true,
  'Backfilled primary supplier offer from existing governed projection',
  p.created_by,
  p.created_by,
  COALESCE(p.published_at,p.created_at)
FROM private.supplier_marketplace_projections p
JOIN private.supplier_offers o
  ON o.id=p.supplier_offer_id
 AND o.canonical_product_id=p.canonical_product_id
 AND o.territory=p.territory
 AND o.status='approved'
ON CONFLICT (projection_id,supplier_offer_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.server_admin_supplier_projection_offer_binding_v1(
  p_actor_id uuid,
  p_action text,
  p_projection_id uuid,
  p_supplier_offer_id uuid,
  p_reason text,
  p_fallback_allowed boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action text:=lower(BTRIM(COALESCE(p_action,'')));
  v_reason text:=BTRIM(COALESCE(p_reason,''));
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_binding private.supplier_projection_offer_bindings%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin authority is required';
  END IF;
  IF v_action NOT IN ('bind','approve','disable') THEN
    RAISE EXCEPTION 'unsupported projection offer binding action';
  END IF;
  IF v_reason='' THEN
    RAISE EXCEPTION 'binding reason is required';
  END IF;

  SELECT * INTO v_projection
  FROM private.supplier_marketplace_projections
  WHERE id=p_projection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier marketplace projection not found';
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier offer not found';
  END IF;
  IF v_offer.canonical_product_id IS DISTINCT FROM v_projection.canonical_product_id
     OR v_offer.territory IS DISTINCT FROM v_projection.territory THEN
    RAISE EXCEPTION 'supplier offer is not interchangeable for this canonical projection';
  END IF;

  IF v_action='bind' THEN
    INSERT INTO private.supplier_projection_offer_bindings(
      projection_id,supplier_offer_id,status,fallback_allowed,reason,created_by
    ) VALUES (
      p_projection_id,p_supplier_offer_id,'candidate',COALESCE(p_fallback_allowed,true),v_reason,p_actor_id
    )
    ON CONFLICT (projection_id,supplier_offer_id) DO UPDATE SET
      status='candidate',
      fallback_allowed=EXCLUDED.fallback_allowed,
      reason=EXCLUDED.reason,
      approved_by=NULL,
      approved_at=NULL,
      disabled_at=NULL,
      updated_at=now()
    RETURNING * INTO v_binding;
  ELSIF v_action='approve' THEN
    IF v_offer.status<>'approved' THEN
      RAISE EXCEPTION 'supplier offer must be approved before projection fulfilment approval';
    END IF;
    UPDATE private.supplier_projection_offer_bindings
    SET status='approved',
        fallback_allowed=COALESCE(p_fallback_allowed,true),
        reason=v_reason,
        approved_by=p_actor_id,
        approved_at=now(),
        disabled_at=NULL,
        updated_at=now()
    WHERE projection_id=p_projection_id AND supplier_offer_id=p_supplier_offer_id
    RETURNING * INTO v_binding;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier projection offer binding must be created before approval';
    END IF;
  ELSE
    UPDATE private.supplier_projection_offer_bindings
    SET status='disabled',
        reason=v_reason,
        disabled_at=now(),
        updated_at=now()
    WHERE projection_id=p_projection_id AND supplier_offer_id=p_supplier_offer_id
    RETURNING * INTO v_binding;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'supplier projection offer binding not found';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'bindingId',v_binding.id,
    'projectionId',v_binding.projection_id,
    'supplierOfferId',v_binding.supplier_offer_id,
    'status',v_binding.status,
    'fallbackAllowed',v_binding.fallback_allowed,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_admin_supplier_projection_offer_binding_v1(
  uuid,text,uuid,uuid,text,boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_admin_supplier_projection_offer_binding_v1(
  uuid,text,uuid,uuid,text,boolean
) TO service_role;

CREATE OR REPLACE FUNCTION public.server_supplier_projection_offer_candidates_v1(
  p_projection_id uuid,
  p_territory text DEFAULT 'GB'
)
RETURNS TABLE (
  supplier_offer_id uuid,
  supplier_id uuid,
  supplier_key text,
  canonical_product_id uuid,
  supplier_catalog_item_id uuid,
  external_variant_ref text,
  territory text,
  fallback_allowed boolean,
  dispatch_hours integer,
  return_window_days integer,
  tracking_deadline_hours integer,
  pricing_snapshot_id uuid,
  currency text,
  gross_customer_price numeric,
  expected_contribution numeric,
  minimum_contribution numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT
    o.id,
    o.supplier_id,
    s.supplier_key,
    o.canonical_product_id,
    o.supplier_catalog_item_id,
    COALESCE(ci.external_variant_ref,''),
    o.territory,
    b.fallback_allowed,
    sla.dispatch_hours,
    sla.return_window_days,
    sla.tracking_deadline_hours,
    price.id,
    price.currency,
    price.gross_customer_price,
    price.expected_contribution,
    price.minimum_contribution
  FROM private.supplier_marketplace_projections p
  JOIN private.supplier_projection_offer_bindings b
    ON b.projection_id=p.id
   AND b.status='approved'
  JOIN private.supplier_offers o
    ON o.id=b.supplier_offer_id
   AND o.canonical_product_id=p.canonical_product_id
   AND o.status='approved'
  JOIN private.supplier_foundation_suppliers s
    ON s.id=o.supplier_id
  JOIN private.supplier_catalog_items ci
    ON ci.id=o.supplier_catalog_item_id
  LEFT JOIN LATERAL (
    SELECT x.dispatch_hours,x.return_window_days,x.tracking_deadline_hours
    FROM private.supplier_sla_versions x
    WHERE x.supplier_id=o.supplier_id
      AND x.status='active'
      AND x.effective_from<=now()
      AND (x.effective_to IS NULL OR x.effective_to>now())
    ORDER BY x.version DESC
    LIMIT 1
  ) sla ON true
  LEFT JOIN LATERAL (
    SELECT ps.id,ps.currency,ps.gross_customer_price,ps.expected_contribution,ps.minimum_contribution
    FROM private.supplier_pricing_snapshots ps
    WHERE ps.supplier_offer_id=o.id
      AND ps.canonical_product_id=o.canonical_product_id
      AND ps.commercial_mode='loadify_supplier_fulfilled'
      AND ps.status='approved'
      AND ps.valid_from<=now()
      AND (ps.valid_to IS NULL OR ps.valid_to>now())
    ORDER BY ps.valid_from DESC
    LIMIT 1
  ) price ON true
  WHERE p.id=p_projection_id
    AND p.status='published'
    AND p.commercial_mode='loadify_supplier_fulfilled'
    AND p.territory=upper(BTRIM(COALESCE(p_territory,'GB')))
    AND o.territory=p.territory
  ORDER BY o.id;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_projection_offer_candidates_v1(uuid,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_projection_offer_candidates_v1(uuid,text)
TO service_role;

COMMENT ON TABLE private.supplier_projection_offer_bindings IS
'Admin-governed many-offer fulfilment set for one canonical Supplier-Fulfilled marketplace projection. Bindings do not bypass catalog, economics, stock, provider capability, shipping, returns or checkout gates.';

COMMENT ON FUNCTION public.server_supplier_projection_offer_candidates_v1(uuid,text) IS
'Service-role-only read boundary for approved interchangeable supplier offers attached to a published canonical projection. Eligibility and ranking remain separate fail-closed runtime decisions.';


ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS "supplierExternalVariantRefSnapshot" text;

CREATE OR REPLACE FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  p_buyer_id uuid,
  p_projection_id uuid,
  p_supplier_offer_id uuid,
  p_quantity integer,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_reservation_key text,
  p_orchestration_idempotency_key text,
  p_correlation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_projection private.supplier_marketplace_projections%ROWTYPE;
  v_binding private.supplier_projection_offer_bindings%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_catalog_item private.supplier_catalog_items%ROWTYPE;
  v_price private.supplier_pricing_snapshots%ROWTYPE;
  v_buyer public.users%ROWTYPE;
  v_order_id uuid;
  v_order_item_id uuid;
  v_reservation jsonb;
  v_subtotal numeric(12,2);
  v_tax numeric(12,2);
  v_shipping numeric(12,2);
  v_total numeric(12,2);
BEGIN
  IF p_buyer_id IS NULL OR p_projection_id IS NULL OR p_supplier_offer_id IS NULL OR p_correlation_id IS NULL THEN
    RAISE EXCEPTION 'buyer, projection, selected offer and correlation identity are required';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'supplier checkout quantity must be between 1 and 100';
  END IF;
  IF COALESCE(BTRIM(p_reservation_key),'')='' OR COALESCE(BTRIM(p_orchestration_idempotency_key),'')='' THEN
    RAISE EXCEPTION 'checkout idempotency keys are required';
  END IF;
  IF jsonb_typeof(COALESCE(p_shipping_address,'{}'::jsonb))<>'object'
     OR jsonb_typeof(COALESCE(p_billing_address,'{}'::jsonb))<>'object' THEN
    RAISE EXCEPTION 'checkout addresses must be JSON objects';
  END IF;

  SELECT * INTO v_buyer
  FROM public.users
  WHERE id=p_buyer_id AND role='buyer' AND "isActive"=true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active buyer identity is required';
  END IF;

  SELECT * INTO v_projection
  FROM private.supplier_marketplace_projections
  WHERE id=p_projection_id
    AND status='published'
    AND commercial_mode='loadify_supplier_fulfilled'
    AND territory='GB'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'published supplier projection is required';
  END IF;

  SELECT * INTO v_binding
  FROM private.supplier_projection_offer_bindings
  WHERE projection_id=v_projection.id
    AND supplier_offer_id=p_supplier_offer_id
    AND status='approved'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'selected supplier offer is not approved for this projection';
  END IF;

  SELECT * INTO v_offer
  FROM private.supplier_offers
  WHERE id=p_supplier_offer_id
    AND canonical_product_id=v_projection.canonical_product_id
    AND territory=v_projection.territory
    AND status='approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'selected supplier offer is not interchangeable for this projection';
  END IF;

  SELECT * INTO v_catalog_item
  FROM private.supplier_catalog_items
  WHERE id=v_offer.supplier_catalog_item_id
    AND supplier_id=v_offer.supplier_id;
  IF NOT FOUND OR NULLIF(BTRIM(COALESCE(v_catalog_item.external_variant_ref,'')),'') IS NULL THEN
    RAISE EXCEPTION 'selected supplier offer variant identity is unavailable';
  END IF;

  SELECT * INTO v_price
  FROM private.supplier_pricing_snapshots
  WHERE id=(
    SELECT NULLIF(
      public.server_supplier_commercial_decision_v1(
        v_offer.id,
        v_projection.canonical_product_id,
        'loadify_supplier_fulfilled',
        v_projection.territory
      )->>'pricingSnapshotId',''
    )::uuid
  )
    AND supplier_offer_id=v_offer.id
    AND canonical_product_id=v_projection.canonical_product_id
    AND status='approved'
    AND commercial_mode='loadify_supplier_fulfilled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approved selected-offer pricing snapshot is required';
  END IF;

  v_subtotal:=ROUND(((v_price.merchandise_amount+v_price.mandatory_fee_amount)*p_quantity)::numeric,2);
  v_tax:=ROUND((v_price.tax_amount*p_quantity)::numeric,2);
  v_shipping:=ROUND((v_price.customer_shipping_charge*p_quantity)::numeric,2);
  v_total:=ROUND((v_price.gross_customer_price*p_quantity)::numeric,2);

  INSERT INTO public.orders(
    "buyerId","sellerId","productId",quantity,subtotal,"vatAmount","shippingAmount",total,
    commission,status,"escrowStatus","shippingAddress","billingAddress",
    "commercialMode","canonicalProductId","supplierOfferId","supplierCatalogItemId",
    "supplierProjectionId","pricingSnapshotId","supplierExternalVariantRefSnapshot","legalSellerIdentitySnapshot",
    "merchantOfRecordSnapshot","invoiceIssuerSnapshot","paymentRecipientSnapshot"
  ) VALUES(
    p_buyer_id,NULL,NULL,p_quantity,v_subtotal,v_tax,v_shipping,v_total,
    0,'awaiting_payment','held',COALESCE(p_shipping_address,'{}'::jsonb),COALESCE(p_billing_address,'{}'::jsonb),
    'loadify_supplier_fulfilled',v_projection.canonical_product_id,v_offer.id,
    v_offer.supplier_catalog_item_id,v_projection.id,v_price.id,v_catalog_item.external_variant_ref,
    'XDrive Logistics Ltd trading as Loadify Market','Loadify Market','Loadify Market','Loadify Market'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items(
    "orderId","productId",quantity,"pricePerUnit","vatRate",subtotal,
    "canonicalProductId","supplierOfferId","pricingSnapshotId",
    "productTitleSnapshot","listingContextSnapshot","productSnapshotSource","productSnapshotCapturedAt"
  ) VALUES(
    v_order_id,NULL,p_quantity,ROUND((v_subtotal/p_quantity)::numeric,2),0,v_subtotal,
    v_projection.canonical_product_id,v_offer.id,v_price.id,
    COALESCE(NULLIF(BTRIM(v_projection.projection_payload->>'title'),''),
      'Loadify supplier product'),
    'product','checkout_verified',now()
  ) RETURNING id INTO v_order_item_id;

  v_reservation:=public.server_reserve_supplier_offer_v1(
    v_order_id,v_order_item_id,v_offer.id,
    'loadify_supplier_fulfilled',p_quantity,v_projection.territory,v_catalog_item.external_variant_ref,
    BTRIM(p_reservation_key),BTRIM(p_orchestration_idempotency_key),
    p_correlation_id,'{}'::jsonb,'supplier_commerce_default',30
  );
  IF COALESCE((v_reservation->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'selected supplier reservation failed: %',COALESCE(v_reservation->>'reason','unknown');
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'orderId',v_order_id,
    'orderItemId',v_order_item_id,
    'projectionId',v_projection.id,
    'supplierOfferId',v_offer.id,
    'supplierCatalogItemId',v_offer.supplier_catalog_item_id,
    'supplierExternalVariantRef',v_catalog_item.external_variant_ref,
    'pricingSnapshotId',v_price.id,
    'amount',v_total,
    'currency',v_price.currency,
    'reservation',v_reservation,
    'merchantOfRecord','Loadify Market',
    'sellerOfRecord','XDrive Logistics Ltd trading as Loadify Market',
    'offerSelectedBy','provider_neutral_selection_v1',
    'paymentSessionCreated',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) TO service_role;

COMMENT ON FUNCTION public.server_prepare_supplier_checkout_selected_offer_v1(
  uuid,uuid,uuid,integer,jsonb,jsonb,text,text,uuid
) IS
'Creates an awaiting-payment Supplier-Fulfilled order for the explicitly selected approved interchangeable supplier offer and reserves that exact offer atomically. It does not submit a provider order or create/capture payment.';
