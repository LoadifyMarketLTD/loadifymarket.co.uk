-- 678_supplier_publish_projection.sql
-- E2E remediation Stage 3: Supplier Commerce publish -> buyer-facing public.products projection.
--
-- This migration does not enable Supplier Commerce. Publish remains governed by the
-- existing fail-closed control plane. It creates no supplier, offer, provider capability
-- or pilot data. Safety hold/unpublish remains available without enabling publish.

ALTER TABLE public.products
  ALTER COLUMN "sellerId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "commercialMode" text,
  ADD COLUMN IF NOT EXISTS "supplierPublicationStatus" text,
  ADD COLUMN IF NOT EXISTS "supplierPublicationVersion" integer,
  ADD COLUMN IF NOT EXISTS "supplierPublicationUpdatedAt" timestamptz;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_commercial_mode_check,
  ADD CONSTRAINT products_commercial_mode_check CHECK (
    "commercialMode" IS NULL
    OR "commercialMode" IN ('marketplace_seller','loadify_supplier_fulfilled','loadify_direct')
  ),
  DROP CONSTRAINT IF EXISTS products_supplier_publication_status_check,
  ADD CONSTRAINT products_supplier_publication_status_check CHECK (
    "supplierPublicationStatus" IS NULL
    OR "supplierPublicationStatus" IN ('active','held','unpublished')
  ),
  DROP CONSTRAINT IF EXISTS products_commercial_mode_shape_check,
  ADD CONSTRAINT products_commercial_mode_shape_check CHECK (
    (
      "commercialMode" IS NULL
      AND "sellerId" IS NOT NULL
      AND "supplierPublicationStatus" IS NULL
      AND "supplierPublicationVersion" IS NULL
      AND "supplierPublicationUpdatedAt" IS NULL
    )
    OR (
      "commercialMode"='marketplace_seller'
      AND "sellerId" IS NOT NULL
      AND "supplierPublicationStatus" IS NULL
      AND "supplierPublicationVersion" IS NULL
      AND "supplierPublicationUpdatedAt" IS NULL
    )
    OR (
      "commercialMode"='loadify_supplier_fulfilled'
      AND "sellerId" IS NULL
      AND "listingContext"='product'
      AND "supplierPublicationStatus" IS NOT NULL
      AND "supplierPublicationVersion" IS NOT NULL
      AND "supplierPublicationVersion">0
      AND "supplierPublicationUpdatedAt" IS NOT NULL
    )
    OR (
      "commercialMode"='loadify_direct'
      AND "sellerId" IS NULL
      AND "supplierPublicationStatus" IS NULL
      AND "supplierPublicationVersion" IS NULL
      AND "supplierPublicationUpdatedAt" IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS products_supplier_publication_idx
  ON public.products("commercialMode","supplierPublicationStatus","isActive","isApproved")
  WHERE "commercialMode"='loadify_supplier_fulfilled';

CREATE TABLE IF NOT EXISTS private.supplier_listing_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE RESTRICT,
  canonical_product_id uuid NOT NULL REFERENCES private.canonical_products(id) ON DELETE RESTRICT,
  external_variant_ref text NOT NULL DEFAULT '',
  current_supplier_offer_id uuid NOT NULL REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  current_pricing_snapshot_id uuid NOT NULL REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  publication_state text NOT NULL DEFAULT 'active',
  publication_version integer NOT NULL DEFAULT 1 CHECK (publication_version>0),
  content_hash text NOT NULL,
  last_request_hash text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_listing_projection_variant_check CHECK (external_variant_ref=BTRIM(external_variant_ref)),
  CONSTRAINT supplier_listing_projection_state_check CHECK (publication_state IN ('active','held','unpublished')),
  CONSTRAINT supplier_listing_projection_hash_check CHECK (
    content_hash ~ '^[0-9a-f]{32}$' AND last_request_hash ~ '^[0-9a-f]{32}$'
  ),
  UNIQUE(canonical_product_id,external_variant_ref)
);

CREATE TABLE IF NOT EXISTS private.supplier_listing_publication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_id uuid NOT NULL REFERENCES private.supplier_listing_projections(id) ON DELETE RESTRICT,
  public_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  previous_state text,
  new_state text NOT NULL,
  supplier_offer_id uuid REFERENCES private.supplier_offers(id) ON DELETE RESTRICT,
  pricing_snapshot_id uuid REFERENCES private.supplier_pricing_snapshots(id) ON DELETE RESTRICT,
  request_hash text NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_listing_publication_event_key_check CHECK (NULLIF(BTRIM(event_key),'') IS NOT NULL),
  CONSTRAINT supplier_listing_publication_event_type_check CHECK (event_type IN ('publish','refresh','hold','unpublish')),
  CONSTRAINT supplier_listing_publication_event_state_check CHECK (
    new_state IN ('active','held','unpublished')
    AND (previous_state IS NULL OR previous_state IN ('active','held','unpublished'))
  ),
  CONSTRAINT supplier_listing_publication_event_hash_check CHECK (request_hash ~ '^[0-9a-f]{32}$'),
  CONSTRAINT supplier_listing_publication_event_evidence_check CHECK (
    jsonb_typeof(evidence)='object' AND evidence<>'{}'::jsonb
  )
);
CREATE INDEX IF NOT EXISTS supplier_listing_publication_event_projection_idx
  ON private.supplier_listing_publication_events(projection_id,created_at DESC);

REVOKE ALL ON TABLE private.supplier_listing_projections FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE private.supplier_listing_publication_events FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_supplier_listing_publication_event_immutable_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  RAISE EXCEPTION 'supplier listing publication events are append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_supplier_listing_publication_event_immutable_v1
  ON private.supplier_listing_publication_events;
CREATE TRIGGER trg_guard_supplier_listing_publication_event_immutable_v1
BEFORE UPDATE OR DELETE ON private.supplier_listing_publication_events
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_listing_publication_event_immutable_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_managed_public_product_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='UPDATE'
     AND OLD."commercialMode"='loadify_supplier_fulfilled'
     AND (
       NEW."commercialMode" IS DISTINCT FROM OLD."commercialMode"
       OR NEW."sellerId" IS DISTINCT FROM OLD."sellerId"
     ) THEN
    RAISE EXCEPTION 'supplier-managed public listing identity cannot be converted or assigned to a marketplace seller';
  END IF;

  IF TG_OP='UPDATE'
     AND OLD."commercialMode" IS DISTINCT FROM 'loadify_supplier_fulfilled'
     AND NEW."commercialMode"='loadify_supplier_fulfilled' THEN
    RAISE EXCEPTION 'existing marketplace/direct listing cannot be converted into a supplier-managed listing';
  END IF;

  IF NEW."commercialMode"='loadify_supplier_fulfilled' THEN
    IF NEW."sellerId" IS NOT NULL
       OR NEW."listingContext"<>'product'
       OR NEW."supplierPublicationStatus" IS NULL
       OR NEW."supplierPublicationVersion" IS NULL
       OR NEW."supplierPublicationUpdatedAt" IS NULL THEN
      RAISE EXCEPTION 'complete supplier-managed public listing shape is required';
    END IF;
    IF COALESCE(auth.jwt()->>'role','') IN ('anon','authenticated') THEN
      RAISE EXCEPTION 'supplier-managed public listings are server-managed only';
    END IF;
  ELSIF NEW."supplierPublicationStatus" IS NOT NULL
        OR NEW."supplierPublicationVersion" IS NOT NULL
        OR NEW."supplierPublicationUpdatedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'supplier publication fields are reserved for supplier-managed listings';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_supplier_managed_public_product_v1()
  FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS trg_guard_supplier_managed_public_product_v1 ON public.products;
CREATE TRIGGER trg_guard_supplier_managed_public_product_v1
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_managed_public_product_v1();

-- Preserve existing public marketplace visibility while adding one explicit buyer-visible
-- branch for server-managed Supplier Commerce listings. A supplier listing has no sellerId.
DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products
FOR SELECT TO public
USING (
  (
    "isActive"=true
    AND "isApproved"=true
    AND COALESCE("listingStatus",'active')='active'
    AND (
      COALESCE("listingContext",'product')='service'
      OR COALESCE("stockQuantity",0)>0
    )
    AND (
      (
        ("commercialMode" IS NULL OR "commercialMode"='marketplace_seller')
        AND "sellerId" IS NOT NULL
        AND public.is_seller_checkout_ready("sellerId")
      )
      OR (
        "commercialMode"='loadify_supplier_fulfilled'
        AND "sellerId" IS NULL
        AND "supplierPublicationStatus"='active'
      )
    )
  )
  OR auth.uid()="sellerId"
  OR public.is_admin()
);

CREATE OR REPLACE FUNCTION public.server_publish_supplier_listing_v1(
  p_actor_id uuid,
  p_canonical_product_id uuid,
  p_supplier_offer_id uuid,
  p_external_variant_ref text,
  p_title text,
  p_description text,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_images text[],
  p_listing_type text,
  p_publish_key text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_canonical private.canonical_products%ROWTYPE;
  v_offer private.supplier_offers%ROWTYPE;
  v_projection private.supplier_listing_projections%ROWTYPE;
  v_pricing private.supplier_pricing_snapshots%ROWTYPE;
  v_event private.supplier_listing_publication_events%ROWTYPE;
  v_control jsonb;
  v_readiness jsonb;
  v_link jsonb;
  v_variant text:=BTRIM(COALESCE(p_external_variant_ref,''));
  v_title text:=BTRIM(COALESCE(p_title,''));
  v_description text:=BTRIM(COALESCE(p_description,''));
  v_listing_type text:=lower(BTRIM(COALESCE(p_listing_type,'retail')));
  v_publish_key text:=BTRIM(COALESCE(p_publish_key,''));
  v_evidence jsonb:=COALESCE(p_evidence,'{}'::jsonb);
  v_sellable_quantity integer;
  v_public_price numeric(12,2);
  v_public_product_id uuid;
  v_content_hash text;
  v_request_hash text;
  v_previous_state text;
  v_next_version integer;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);

  IF p_canonical_product_id IS NULL OR p_supplier_offer_id IS NULL OR p_category_id IS NULL
     OR v_title='' OR v_description='' OR v_publish_key=''
     OR jsonb_typeof(v_evidence)<>'object' OR v_evidence='{}'::jsonb
     OR COALESCE(array_length(p_images,1),0)=0
     OR v_listing_type NOT IN ('pallet','wholesale','retail','handmade','logistics') THEN
    RETURN jsonb_build_object('published',false,'reason','invalid_supplier_publication_request','interfaceVersion',1);
  END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_images) AS img WHERE NULLIF(BTRIM(img),'') IS NULL) THEN
    RETURN jsonb_build_object('published',false,'reason','invalid_supplier_publication_images','interfaceVersion',1);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.id=p_category_id) THEN
    RETURN jsonb_build_object('published',false,'reason','publication_category_not_found','interfaceVersion',1);
  END IF;

  SELECT * INTO v_canonical FROM private.canonical_products
   WHERE id=p_canonical_product_id AND status='active' AND product_kind='physical_good';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('published',false,'reason','active_physical_canonical_product_required','interfaceVersion',1);
  END IF;

  SELECT * INTO v_offer FROM private.supplier_offers
   WHERE id=p_supplier_offer_id
     AND canonical_product_id=p_canonical_product_id
     AND territory='GB'
     AND status='approved';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('published',false,'reason','approved_gb_supplier_offer_required','interfaceVersion',1);
  END IF;

  v_control:=public.server_supplier_commerce_control_decision_v1(
    'publish',
    jsonb_build_object(
      'supplierRef',v_offer.supplier_id::text,
      'offerRef',v_offer.id::text,
      'productRef',v_offer.canonical_product_id::text,
      'territory','GB'
    )
  );
  IF COALESCE((v_control->>'enabled')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'published',false,'reason','publish_control_disabled','control',v_control,'interfaceVersion',1
    );
  END IF;

  v_readiness:=public.server_supplier_stock_price_decision_v1(
    p_supplier_offer_id,p_canonical_product_id,'loadify_supplier_fulfilled','GB',v_variant
  );
  IF COALESCE((v_readiness->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'published',false,'reason','supplier_listing_not_sellable','readiness',v_readiness,'interfaceVersion',1
    );
  END IF;

  BEGIN
    v_sellable_quantity:=NULLIF(v_readiness->>'sellableQuantity','')::integer;
  EXCEPTION WHEN others THEN
    v_sellable_quantity:=NULL;
  END;
  IF v_sellable_quantity IS NULL OR v_sellable_quantity<=0 THEN
    RETURN jsonb_build_object(
      'published',false,'reason','known_positive_sellable_quantity_required','readiness',v_readiness,'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_pricing FROM private.supplier_pricing_snapshots p
   WHERE p.id=(v_readiness->>'pricingSnapshotId')::uuid
     AND p.supplier_offer_id=p_supplier_offer_id
     AND p.canonical_product_id=p_canonical_product_id
     AND p.commercial_mode='loadify_supplier_fulfilled'
     AND p.currency='GBP'
     AND p.status='approved'
     AND p.valid_from<=now()
     AND (p.valid_to IS NULL OR p.valid_to>now());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('published',false,'reason','approved_current_gbp_pricing_snapshot_required','interfaceVersion',1);
  END IF;

  v_public_price:=round((v_pricing.gross_customer_price-v_pricing.customer_shipping_charge)::numeric,2);
  IF v_public_price<=0 THEN
    RETURN jsonb_build_object('published',false,'reason','positive_buyer_listing_price_required','interfaceVersion',1);
  END IF;

  v_content_hash:=md5(jsonb_build_object(
    'title',v_title,'description',v_description,'categoryId',p_category_id,
    'subcategoryId',p_subcategory_id,'images',to_jsonb(p_images),'listingType',v_listing_type
  )::text);
  v_request_hash:=md5(jsonb_build_object(
    'canonicalProductId',p_canonical_product_id,'supplierOfferId',p_supplier_offer_id,
    'variantRef',v_variant,'pricingSnapshotId',v_pricing.id,'sellableQuantity',v_sellable_quantity,
    'publicPrice',v_public_price,'contentHash',v_content_hash,'evidence',v_evidence
  )::text);

  SELECT * INTO v_event FROM private.supplier_listing_publication_events
   WHERE event_key=v_publish_key;
  IF FOUND THEN
    IF v_event.request_hash<>v_request_hash THEN
      RAISE EXCEPTION 'supplier publication idempotency key collision';
    END IF;
    RETURN jsonb_build_object(
      'published',true,'replayed',true,'publicProductId',v_event.public_product_id,
      'projectionId',v_event.projection_id,'state',v_event.new_state,'interfaceVersion',1
    );
  END IF;

  SELECT * INTO v_projection FROM private.supplier_listing_projections
   WHERE canonical_product_id=p_canonical_product_id AND external_variant_ref=v_variant
   FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.products(
      "sellerId",title,description,type,"listingType",condition,"categoryId","subcategoryId",
      price,"priceExVat","vatRate","stockQuantity","stockStatus",images,
      "isHandmade","isUnique","isActive","isApproved","isFeatured",
      "listingContext","listingStatus","commercialMode","supplierPublicationStatus",
      "supplierPublicationVersion","supplierPublicationUpdatedAt"
    ) VALUES(
      NULL,v_title,v_description,'product',v_listing_type,'new',p_category_id,p_subcategory_id,
      v_public_price,NULL,NULL,v_sellable_quantity,
      CASE WHEN v_sellable_quantity<=10 THEN 'low_stock' ELSE 'in_stock' END,
      p_images,false,false,true,true,false,
      'product','active','loadify_supplier_fulfilled','active',1,now()
    ) RETURNING id INTO v_public_product_id;

    v_link:=public.server_link_supplier_product_listing_v1(
      v_public_product_id,p_canonical_product_id,'supplier_publish_v1',
      jsonb_build_object('canonicalProductId',p_canonical_product_id,'bridgeVersion',1)
    );
    IF COALESCE((v_link->>'ok')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'supplier publication identity bridge failed: %',v_link;
    END IF;

    INSERT INTO private.supplier_listing_projections(
      public_product_id,canonical_product_id,external_variant_ref,current_supplier_offer_id,
      current_pricing_snapshot_id,publication_state,publication_version,content_hash,last_request_hash,
      created_by,updated_by
    ) VALUES(
      v_public_product_id,p_canonical_product_id,v_variant,p_supplier_offer_id,v_pricing.id,
      'active',1,v_content_hash,v_request_hash,p_actor_id,p_actor_id
    ) RETURNING * INTO v_projection;

    v_previous_state:=NULL;
  ELSE
    v_public_product_id:=v_projection.public_product_id;
    v_previous_state:=v_projection.publication_state;
    v_next_version:=v_projection.publication_version+1;

    v_link:=public.server_link_supplier_product_listing_v1(
      v_public_product_id,p_canonical_product_id,'supplier_publish_v1',
      jsonb_build_object('canonicalProductId',p_canonical_product_id,'bridgeVersion',1)
    );
    IF COALESCE((v_link->>'ok')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'supplier publication identity replay failed: %',v_link;
    END IF;

    UPDATE public.products SET
      title=v_title,description=v_description,"listingType"=v_listing_type,
      "categoryId"=p_category_id,"subcategoryId"=p_subcategory_id,
      price=v_public_price,"stockQuantity"=v_sellable_quantity,
      "stockStatus"=CASE WHEN v_sellable_quantity<=10 THEN 'low_stock' ELSE 'in_stock' END,
      images=p_images,"isActive"=true,"isApproved"=true,"listingStatus"='active',
      "supplierPublicationStatus"='active',"supplierPublicationVersion"=v_next_version,
      "supplierPublicationUpdatedAt"=now()
    WHERE id=v_public_product_id AND "commercialMode"='loadify_supplier_fulfilled';
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier projection public listing missing or mode changed'; END IF;

    UPDATE private.supplier_listing_projections SET
      current_supplier_offer_id=p_supplier_offer_id,
      current_pricing_snapshot_id=v_pricing.id,
      publication_state='active',publication_version=v_next_version,
      content_hash=v_content_hash,last_request_hash=v_request_hash,
      updated_by=p_actor_id,updated_at=now()
    WHERE id=v_projection.id
    RETURNING * INTO v_projection;
  END IF;

  INSERT INTO private.supplier_listing_publication_events(
    projection_id,public_product_id,event_key,event_type,previous_state,new_state,
    supplier_offer_id,pricing_snapshot_id,request_hash,actor_id,evidence
  ) VALUES(
    v_projection.id,v_public_product_id,v_publish_key,
    CASE WHEN v_previous_state='active' THEN 'refresh' ELSE 'publish' END,
    v_previous_state,'active',p_supplier_offer_id,v_pricing.id,v_request_hash,p_actor_id,
    v_evidence||jsonb_build_object(
      'stockPriceReadiness',v_readiness,'publishControl',v_control,
      'publicPrice',v_public_price,'sellableQuantity',v_sellable_quantity,
      'contentHash',v_content_hash
    )
  );

  RETURN jsonb_build_object(
    'published',true,'replayed',false,'publicProductId',v_public_product_id,
    'projectionId',v_projection.id,'state','active','publicationVersion',v_projection.publication_version,
    'pricingSnapshotId',v_pricing.id,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_publish_supplier_listing_v1(
  uuid,uuid,uuid,text,text,text,uuid,uuid,text[],text,text,jsonb
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_publish_supplier_listing_v1(
  uuid,uuid,uuid,text,text,text,uuid,uuid,text[],text,text,jsonb
) TO service_role;

CREATE OR REPLACE FUNCTION public.server_set_supplier_listing_state_v1(
  p_actor_id uuid,
  p_public_product_id uuid,
  p_state text,
  p_event_key text,
  p_reason text,
  p_evidence jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_projection private.supplier_listing_projections%ROWTYPE;
  v_event private.supplier_listing_publication_events%ROWTYPE;
  v_state text:=lower(BTRIM(COALESCE(p_state,'')));
  v_event_key text:=BTRIM(COALESCE(p_event_key,''));
  v_reason text:=BTRIM(COALESCE(p_reason,''));
  v_evidence jsonb:=COALESCE(p_evidence,'{}'::jsonb);
  v_request_hash text;
  v_previous_state text;
  v_next_version integer;
BEGIN
  PERFORM private.require_active_admin_v1(p_actor_id);
  IF v_state NOT IN ('held','unpublished') OR v_event_key='' OR v_reason=''
     OR jsonb_typeof(v_evidence)<>'object' OR v_evidence='{}'::jsonb THEN
    RETURN jsonb_build_object('ok',false,'reason','invalid_supplier_listing_state_request','interfaceVersion',1);
  END IF;

  SELECT * INTO v_projection FROM private.supplier_listing_projections
   WHERE public_product_id=p_public_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'reason','supplier_listing_projection_not_found','interfaceVersion',1);
  END IF;

  v_request_hash:=md5(jsonb_build_object(
    'publicProductId',p_public_product_id,'state',v_state,'reason',v_reason,'evidence',v_evidence
  )::text);
  SELECT * INTO v_event FROM private.supplier_listing_publication_events WHERE event_key=v_event_key;
  IF FOUND THEN
    IF v_event.request_hash<>v_request_hash THEN
      RAISE EXCEPTION 'supplier listing state idempotency key collision';
    END IF;
    RETURN jsonb_build_object(
      'ok',true,'replayed',true,'publicProductId',v_event.public_product_id,
      'state',v_event.new_state,'interfaceVersion',1
    );
  END IF;

  v_previous_state:=v_projection.publication_state;
  v_next_version:=v_projection.publication_version+1;

  UPDATE public.products SET
    "isActive"=false,"supplierPublicationStatus"=v_state,
    "supplierPublicationVersion"=v_next_version,"supplierPublicationUpdatedAt"=now()
  WHERE id=p_public_product_id AND "commercialMode"='loadify_supplier_fulfilled';
  IF NOT FOUND THEN RAISE EXCEPTION 'supplier-managed public listing missing'; END IF;

  UPDATE private.supplier_listing_projections SET
    publication_state=v_state,publication_version=v_next_version,
    last_request_hash=v_request_hash,updated_by=p_actor_id,updated_at=now()
  WHERE id=v_projection.id RETURNING * INTO v_projection;

  INSERT INTO private.supplier_listing_publication_events(
    projection_id,public_product_id,event_key,event_type,previous_state,new_state,
    supplier_offer_id,pricing_snapshot_id,request_hash,actor_id,evidence
  ) VALUES(
    v_projection.id,p_public_product_id,v_event_key,
    CASE WHEN v_state='held' THEN 'hold' ELSE 'unpublish' END,
    v_previous_state,v_state,v_projection.current_supplier_offer_id,
    v_projection.current_pricing_snapshot_id,v_request_hash,p_actor_id,
    v_evidence||jsonb_build_object('reason',v_reason,'safetyAction',true)
  );

  RETURN jsonb_build_object(
    'ok',true,'replayed',false,'publicProductId',p_public_product_id,
    'state',v_state,'publicationVersion',v_projection.publication_version,'interfaceVersion',1
  );
END;
$$;
REVOKE ALL ON FUNCTION public.server_set_supplier_listing_state_v1(uuid,uuid,text,text,text,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_set_supplier_listing_state_v1(uuid,uuid,text,text,text,jsonb)
  TO service_role;

COMMENT ON TABLE private.supplier_listing_projections IS
  'Current provider-neutral Supplier Commerce projection from canonical product/variant to one buyer-facing public.products listing. Current routing may change before customer commitment; customer order snapshots freeze the chosen route.';
COMMENT ON FUNCTION public.server_publish_supplier_listing_v1(uuid,uuid,uuid,text,text,text,uuid,uuid,text[],text,text,jsonb) IS
  'Stage 3 fail-closed publish/refresh boundary. Requires publish control plus current canonical catalog, economics, stock and price readiness. Raw supplier stock/price is never copied directly to buyer truth.';
COMMENT ON FUNCTION public.server_set_supplier_listing_state_v1(uuid,uuid,text,text,text,jsonb) IS
  'Stage 3 safety hold/unpublish boundary. Does not require publish to be enabled so kill-switch and safety actions remain possible while Supplier Commerce is OFF.';
