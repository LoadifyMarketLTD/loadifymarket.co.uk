CREATE OR REPLACE FUNCTION private.phase_e_actor_is_active_admin(p_actor_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id=p_actor_id AND u.role='admin' AND u."isActive"=true);
$$;
REVOKE ALL ON FUNCTION private.phase_e_actor_is_active_admin(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.normalize_catalog_identifier_v1(p_type text,p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO '' AS $$
DECLARE v_type text:=lower(BTRIM(COALESCE(p_type,''))); v_value text:=BTRIM(COALESCE(p_value,'')); v_result text;
BEGIN
  IF v_value='' THEN RAISE EXCEPTION 'catalog identifier value is required'; END IF;
  IF v_type IN ('gtin','ean','upc','isbn') THEN
    v_result:=regexp_replace(v_value,'[[:space:]-]','','g');
    IF v_result !~ '^[0-9]{8,14}$' THEN RAISE EXCEPTION 'numeric catalog identifier is invalid'; END IF;
    RETURN v_result;
  END IF;
  v_result:=lower(regexp_replace(v_value,'[[:space:]]+',' ','g'));
  IF length(v_result)>256 THEN RAISE EXCEPTION 'catalog identifier is too long'; END IF;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION private.normalize_catalog_identifier_v1(text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_verified_canonical_identifier_v1() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF OLD.verification_status='verified' AND (NEW.canonical_product_id IS DISTINCT FROM OLD.canonical_product_id OR NEW.identifier_type IS DISTINCT FROM OLD.identifier_type OR NEW.identifier_namespace IS DISTINCT FROM OLD.identifier_namespace OR NEW.normalized_value IS DISTINCT FROM OLD.normalized_value) THEN RAISE EXCEPTION 'verified canonical identifier identity is immutable'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_verified_canonical_identifier_v1 ON private.canonical_product_identifiers;
CREATE TRIGGER trg_guard_verified_canonical_identifier_v1 BEFORE UPDATE ON private.canonical_product_identifiers FOR EACH ROW EXECUTE FUNCTION private.guard_verified_canonical_identifier_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_catalog_item_identity_v1() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR NEW.external_product_ref IS DISTINCT FROM OLD.external_product_ref OR NEW.external_variant_ref IS DISTINCT FROM OLD.external_variant_ref THEN RAISE EXCEPTION 'supplier catalog external identity is immutable'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_supplier_catalog_item_identity_v1 ON private.supplier_catalog_items;
CREATE TRIGGER trg_guard_supplier_catalog_item_identity_v1 BEFORE UPDATE ON private.supplier_catalog_items FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_catalog_item_identity_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_offer_consistency_v1() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_item_supplier uuid; v_item_status text; v_product_status text;
BEGIN
  SELECT supplier_id,status INTO v_item_supplier,v_item_status FROM private.supplier_catalog_items WHERE id=NEW.supplier_catalog_item_id;
  IF NOT FOUND OR v_item_supplier<>NEW.supplier_id THEN RAISE EXCEPTION 'supplier offer must reference a catalog item owned by the same supplier'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='approved' AND (NEW.supplier_id IS DISTINCT FROM OLD.supplier_id OR NEW.supplier_catalog_item_id IS DISTINCT FROM OLD.supplier_catalog_item_id OR NEW.canonical_product_id IS DISTINCT FROM OLD.canonical_product_id OR NEW.external_offer_ref IS DISTINCT FROM OLD.external_offer_ref OR NEW.territory IS DISTINCT FROM OLD.territory) THEN RAISE EXCEPTION 'approved supplier offer identity is immutable'; END IF;
  IF NEW.status='approved' THEN
    SELECT status INTO v_product_status FROM private.canonical_products WHERE id=NEW.canonical_product_id;
    IF NOT FOUND OR v_product_status<>'active' THEN RAISE EXCEPTION 'approved supplier offer requires an active canonical product'; END IF;
    IF v_item_status IN ('restricted','retired') THEN RAISE EXCEPTION 'restricted or retired supplier catalog item cannot back an approved offer'; END IF;
    IF EXISTS (SELECT 1 FROM private.catalog_dedup_candidates d WHERE d.supplier_catalog_item_id=NEW.supplier_catalog_item_id AND d.decision IN ('pending','manual_review')) THEN RAISE EXCEPTION 'unresolved catalog deduplication blocks offer approval'; END IF;
    IF NEW.identity_method='verified_identifier' AND NOT EXISTS (
      SELECT 1 FROM private.supplier_catalog_identifiers si JOIN private.canonical_product_identifiers ci ON ci.identifier_type=si.identifier_type AND ci.identifier_namespace=si.identifier_namespace AND ci.normalized_value=si.normalized_value
      WHERE si.supplier_catalog_item_id=NEW.supplier_catalog_item_id AND si.verification_status='verified' AND ci.canonical_product_id=NEW.canonical_product_id AND ci.verification_status='verified'
    ) THEN RAISE EXCEPTION 'verified identifier offer link requires matching verified catalog identity'; END IF;
    IF NEW.identity_method='dedup_resolution' AND NOT EXISTS (SELECT 1 FROM private.catalog_dedup_candidates d WHERE d.supplier_catalog_item_id=NEW.supplier_catalog_item_id AND d.candidate_canonical_product_id=NEW.canonical_product_id AND d.decision='same_product') THEN RAISE EXCEPTION 'dedup resolution offer link requires a same-product resolution'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_supplier_offer_consistency_v1 ON private.supplier_offers;
CREATE TRIGGER trg_guard_supplier_offer_consistency_v1 BEFORE INSERT OR UPDATE ON private.supplier_offers FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_offer_consistency_v1();

CREATE OR REPLACE FUNCTION private.guard_catalog_dedup_resolution_v1() RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.decision IN ('same_product','different_product') AND (NEW.decision IS DISTINCT FROM OLD.decision OR NEW.supplier_catalog_item_id IS DISTINCT FROM OLD.supplier_catalog_item_id OR NEW.candidate_canonical_product_id IS DISTINCT FROM OLD.candidate_canonical_product_id) THEN RAISE EXCEPTION 'terminal catalog dedup resolution is immutable'; END IF;
  IF NEW.decision IN ('same_product','different_product') AND jsonb_object_length(NEW.evidence)=0 THEN RAISE EXCEPTION 'terminal catalog dedup resolution requires evidence'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_catalog_dedup_resolution_v1 ON private.catalog_dedup_candidates;
CREATE TRIGGER trg_guard_catalog_dedup_resolution_v1 BEFORE INSERT OR UPDATE ON private.catalog_dedup_candidates FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_dedup_resolution_v1();

CREATE OR REPLACE FUNCTION public.server_mutate_supplier_catalog_v1(p_actor_id uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_action text:=lower(BTRIM(COALESCE(p_action,''))); v_payload jsonb:=COALESCE(p_payload,'{}'::jsonb); v_product private.canonical_products%ROWTYPE; v_item private.supplier_catalog_items%ROWTYPE; v_offer private.supplier_offers%ROWTYPE; v_dedup private.catalog_dedup_candidates%ROWTYPE; v_identifier private.canonical_product_identifiers%ROWTYPE; v_supplier_id uuid; v_product_id uuid; v_item_id uuid; v_status text; v_type text; v_namespace text; v_normalized text; v_now timestamptz:=now();
BEGIN
  IF NOT private.phase_e_actor_is_active_admin(p_actor_id) THEN RAISE EXCEPTION 'active admin authority is required'; END IF;
  IF jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'payload must be an object'; END IF;
  IF v_action='upsert_canonical_product' THEN
    IF NULLIF(BTRIM(v_payload->>'catalogKey'),'') IS NULL OR NULLIF(BTRIM(v_payload->>'workingLabel'),'') IS NULL THEN RAISE EXCEPTION 'catalogKey and workingLabel are required'; END IF;
    SELECT * INTO v_product FROM private.canonical_products WHERE catalog_key=lower(BTRIM(v_payload->>'catalogKey'));
    IF FOUND THEN
      IF v_product.status IN ('active','restricted','retired') THEN RAISE EXCEPTION 'active, restricted or retired canonical identity cannot be rewritten by upsert'; END IF;
      UPDATE private.canonical_products SET working_label=BTRIM(v_payload->>'workingLabel'),product_kind=COALESCE(NULLIF(BTRIM(v_payload->>'productKind'),''),product_kind),identity_reason=COALESCE(NULLIF(BTRIM(v_payload->>'reason'),''),identity_reason),identity_version=identity_version+1,updated_at=v_now WHERE id=v_product.id RETURNING * INTO v_product;
    ELSE
      INSERT INTO private.canonical_products(catalog_key,working_label,product_kind,identity_reason,created_by) VALUES(lower(BTRIM(v_payload->>'catalogKey')),BTRIM(v_payload->>'workingLabel'),COALESCE(NULLIF(BTRIM(v_payload->>'productKind'),''),'physical_good'),COALESCE(NULLIF(BTRIM(v_payload->>'reason'),''),'Canonical identity created'),p_actor_id) RETURNING * INTO v_product;
    END IF;
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,new_version,evidence) VALUES('canonical_product',v_product.id,p_actor_id,v_action,v_product.identity_version,v_payload);
    RETURN jsonb_build_object('ok',true,'canonicalProductId',v_product.id,'identityVersion',v_product.identity_version);
  END IF;
  IF v_action='set_canonical_status' THEN
    v_product_id:=NULLIF(v_payload->>'canonicalProductId','')::uuid; v_status:=lower(BTRIM(COALESCE(v_payload->>'status','')));
    SELECT * INTO v_product FROM private.canonical_products WHERE id=v_product_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'canonical product not found'; END IF;
    IF v_status NOT IN ('draft','review','active','restricted','retired') THEN RAISE EXCEPTION 'invalid canonical product status'; END IF;
    IF v_product.status='retired' AND v_status<>'retired' THEN RAISE EXCEPTION 'retired canonical product cannot be reactivated'; END IF;
    IF v_status='active' AND NOT EXISTS (SELECT 1 FROM private.canonical_product_identifiers i WHERE i.canonical_product_id=v_product.id AND i.verification_status='verified') THEN RAISE EXCEPTION 'active canonical product requires verified catalog identity'; END IF;
    UPDATE private.canonical_products SET status=v_status,identity_reason=COALESCE(NULLIF(BTRIM(v_payload->>'reason'),''),identity_reason),identity_version=identity_version+1,reviewed_by=CASE WHEN v_status IN ('active','restricted','retired') THEN p_actor_id ELSE reviewed_by END,reviewed_at=CASE WHEN v_status IN ('active','restricted','retired') THEN v_now ELSE reviewed_at END,updated_at=v_now WHERE id=v_product.id RETURNING * INTO v_product;
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,previous_version,new_version,evidence) VALUES('canonical_product',v_product.id,p_actor_id,v_action,v_product.identity_version-1,v_product.identity_version,v_payload);
    RETURN jsonb_build_object('ok',true,'canonicalProductId',v_product.id,'status',v_product.status,'identityVersion',v_product.identity_version);
  END IF;
  IF v_action='attach_identifier' THEN
    v_product_id:=NULLIF(v_payload->>'canonicalProductId','')::uuid; v_type:=lower(BTRIM(COALESCE(v_payload->>'identifierType',''))); v_namespace:=lower(BTRIM(COALESCE(v_payload->>'identifierNamespace',CASE WHEN v_type IN ('gtin','ean','upc','isbn') THEN 'global' ELSE '' END))); v_normalized:=private.normalize_catalog_identifier_v1(v_type,v_payload->>'value'); v_status:=lower(BTRIM(COALESCE(v_payload->>'verificationStatus','unverified')));
    IF v_type NOT IN ('gtin','ean','upc','isbn','mpn','brand_mpn','internal') THEN RAISE EXCEPTION 'invalid identifier type'; END IF; IF NULLIF(v_namespace,'') IS NULL THEN RAISE EXCEPTION 'identifier namespace is required'; END IF; IF v_status NOT IN ('unverified','verified','rejected','stale') THEN RAISE EXCEPTION 'invalid identifier verification status'; END IF; IF v_status='verified' AND NULLIF(BTRIM(v_payload->>'sourceRef'),'') IS NULL THEN RAISE EXCEPTION 'verified identifier sourceRef is required'; END IF; IF NOT EXISTS (SELECT 1 FROM private.canonical_products WHERE id=v_product_id) THEN RAISE EXCEPTION 'canonical product not found'; END IF;
    INSERT INTO private.canonical_product_identifiers(canonical_product_id,identifier_type,identifier_namespace,raw_value,normalized_value,verification_status,source_ref,evidence_hash,verified_by,verified_at)
    VALUES(v_product_id,v_type,v_namespace,BTRIM(v_payload->>'value'),v_normalized,v_status,NULLIF(BTRIM(v_payload->>'sourceRef'),''),NULLIF(BTRIM(v_payload->>'evidenceHash'),''),CASE WHEN v_status='verified' THEN p_actor_id ELSE NULL END,CASE WHEN v_status='verified' THEN v_now ELSE NULL END)
    ON CONFLICT (canonical_product_id,identifier_type,identifier_namespace,normalized_value) DO UPDATE SET verification_status=EXCLUDED.verification_status,source_ref=EXCLUDED.source_ref,evidence_hash=EXCLUDED.evidence_hash,verified_by=EXCLUDED.verified_by,verified_at=EXCLUDED.verified_at RETURNING * INTO v_identifier;
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,evidence) VALUES('canonical_identifier',v_identifier.id,p_actor_id,v_action,v_payload);
    RETURN jsonb_build_object('ok',true,'identifierId',v_identifier.id,'normalizedValue',v_identifier.normalized_value);
  END IF;
  IF v_action='upsert_supplier_catalog_item' THEN
    v_supplier_id:=NULLIF(v_payload->>'supplierId','')::uuid;
    IF NOT EXISTS (SELECT 1 FROM private.supplier_foundation_suppliers s WHERE s.id=v_supplier_id AND s.lifecycle_status<>'banned') THEN RAISE EXCEPTION 'supplier not found or banned'; END IF;
    IF NULLIF(BTRIM(v_payload->>'externalProductRef'),'') IS NULL OR NULLIF(BTRIM(v_payload->>'sourceRef'),'') IS NULL OR NULLIF(BTRIM(v_payload->>'rawIdentityHash'),'') IS NULL THEN RAISE EXCEPTION 'externalProductRef, sourceRef and rawIdentityHash are required'; END IF;
    SELECT * INTO v_item FROM private.supplier_catalog_items WHERE supplier_id=v_supplier_id AND external_product_ref=BTRIM(v_payload->>'externalProductRef') AND COALESCE(external_variant_ref,'')=COALESCE(NULLIF(BTRIM(v_payload->>'externalVariantRef'),''),'');
    IF FOUND THEN UPDATE private.supplier_catalog_items SET source_ref=BTRIM(v_payload->>'sourceRef'),source_observed_at=COALESCE(NULLIF(v_payload->>'sourceObservedAt','')::timestamptz,v_now),raw_identity_hash=BTRIM(v_payload->>'rawIdentityHash'),raw_snapshot_ref=NULLIF(BTRIM(v_payload->>'rawSnapshotRef'),''),status=CASE WHEN status='retired' THEN status ELSE 'identity_review' END,updated_at=v_now WHERE id=v_item.id RETURNING * INTO v_item;
    ELSE INSERT INTO private.supplier_catalog_items(supplier_id,external_product_ref,external_variant_ref,source_ref,source_observed_at,raw_identity_hash,raw_snapshot_ref,status) VALUES(v_supplier_id,BTRIM(v_payload->>'externalProductRef'),NULLIF(BTRIM(v_payload->>'externalVariantRef'),''),BTRIM(v_payload->>'sourceRef'),COALESCE(NULLIF(v_payload->>'sourceObservedAt','')::timestamptz,v_now),BTRIM(v_payload->>'rawIdentityHash'),NULLIF(BTRIM(v_payload->>'rawSnapshotRef'),''),'captured') RETURNING * INTO v_item; END IF;
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,evidence) VALUES('supplier_catalog_item',v_item.id,p_actor_id,v_action,v_payload);
    RETURN jsonb_build_object('ok',true,'supplierCatalogItemId',v_item.id,'status',v_item.status);
  END IF;
  IF v_action='link_supplier_offer' THEN
    v_item_id:=NULLIF(v_payload->>'supplierCatalogItemId','')::uuid; v_product_id:=NULLIF(v_payload->>'canonicalProductId','')::uuid; SELECT * INTO v_item FROM private.supplier_catalog_items WHERE id=v_item_id; IF NOT FOUND THEN RAISE EXCEPTION 'supplier catalog item not found'; END IF; IF NOT EXISTS (SELECT 1 FROM private.canonical_products WHERE id=v_product_id) THEN RAISE EXCEPTION 'canonical product not found'; END IF; v_status:=lower(BTRIM(COALESCE(v_payload->>'status','candidate')));
    INSERT INTO private.supplier_offers(offer_key,supplier_id,supplier_catalog_item_id,canonical_product_id,external_offer_ref,territory,status,identity_method,identity_confidence,identity_evidence,linked_by,linked_at,approved_by,approved_at)
    VALUES(lower(BTRIM(v_payload->>'offerKey')),v_item.supplier_id,v_item.id,v_product_id,BTRIM(v_payload->>'externalOfferRef'),upper(BTRIM(COALESCE(v_payload->>'territory','GB'))),v_status,lower(BTRIM(v_payload->>'identityMethod')),NULLIF(v_payload->>'identityConfidence','')::numeric,COALESCE(v_payload->'identityEvidence','{}'::jsonb),p_actor_id,v_now,CASE WHEN v_status='approved' THEN p_actor_id ELSE NULL END,CASE WHEN v_status='approved' THEN v_now ELSE NULL END)
    ON CONFLICT (offer_key) DO UPDATE SET status=EXCLUDED.status,identity_method=EXCLUDED.identity_method,identity_confidence=EXCLUDED.identity_confidence,identity_evidence=EXCLUDED.identity_evidence,approved_by=EXCLUDED.approved_by,approved_at=EXCLUDED.approved_at,updated_at=v_now RETURNING * INTO v_offer;
    UPDATE private.supplier_catalog_items SET status='linked',updated_at=v_now WHERE id=v_item.id AND status IN ('captured','identity_review');
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,evidence) VALUES('supplier_offer',v_offer.id,p_actor_id,v_action,v_payload);
    RETURN jsonb_build_object('ok',true,'supplierOfferId',v_offer.id,'status',v_offer.status);
  END IF;
  IF v_action='record_dedup_candidate' THEN
    v_item_id:=NULLIF(v_payload->>'supplierCatalogItemId','')::uuid; v_product_id:=NULLIF(v_payload->>'candidateCanonicalProductId','')::uuid; IF NOT EXISTS (SELECT 1 FROM private.supplier_catalog_items WHERE id=v_item_id) THEN RAISE EXCEPTION 'supplier catalog item not found'; END IF; IF NOT EXISTS (SELECT 1 FROM private.canonical_products WHERE id=v_product_id) THEN RAISE EXCEPTION 'canonical product not found'; END IF; IF NULLIF(BTRIM(v_payload->>'candidateKey'),'') IS NULL THEN RAISE EXCEPTION 'candidateKey is required'; END IF;
    INSERT INTO private.catalog_dedup_candidates(supplier_catalog_item_id,candidate_canonical_product_id,candidate_key,score,evidence) VALUES(v_item_id,v_product_id,BTRIM(v_payload->>'candidateKey'),NULLIF(v_payload->>'score','')::numeric,COALESCE(v_payload->'evidence','{}'::jsonb))
    ON CONFLICT (supplier_catalog_item_id,candidate_canonical_product_id) DO UPDATE SET candidate_key=EXCLUDED.candidate_key,score=EXCLUDED.score,evidence=EXCLUDED.evidence,decision=CASE WHEN private.catalog_dedup_candidates.decision IN ('same_product','different_product') THEN private.catalog_dedup_candidates.decision ELSE 'pending' END,updated_at=v_now RETURNING * INTO v_dedup;
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,evidence) VALUES('dedup_candidate',v_dedup.id,p_actor_id,v_action,v_payload);
    RETURN jsonb_build_object('ok',true,'dedupCandidateId',v_dedup.id,'decision',v_dedup.decision);
  END IF;
  IF v_action='resolve_dedup_candidate' THEN
    v_status:=lower(BTRIM(COALESCE(v_payload->>'decision',''))); IF v_status NOT IN ('same_product','different_product','manual_review') THEN RAISE EXCEPTION 'invalid dedup decision'; END IF; IF NULLIF(BTRIM(v_payload->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'dedup resolution reason is required'; END IF;
    SELECT * INTO v_dedup FROM private.catalog_dedup_candidates WHERE id=NULLIF(v_payload->>'dedupCandidateId','')::uuid FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'dedup candidate not found'; END IF; IF v_dedup.decision IN ('same_product','different_product') THEN RAISE EXCEPTION 'terminal dedup resolution is immutable'; END IF;
    UPDATE private.catalog_dedup_candidates SET decision=v_status,decision_reason=BTRIM(v_payload->>'reason'),evidence=CASE WHEN v_payload ? 'evidence' THEN v_payload->'evidence' ELSE evidence END,resolution_version=resolution_version+1,resolved_by=p_actor_id,resolved_at=v_now,updated_at=v_now WHERE id=v_dedup.id RETURNING * INTO v_dedup;
    INSERT INTO private.catalog_identity_audit(entity_type,entity_id,actor_id,action,previous_version,new_version,evidence) VALUES('dedup_candidate',v_dedup.id,p_actor_id,v_action,v_dedup.resolution_version-1,v_dedup.resolution_version,v_payload);
    RETURN jsonb_build_object('ok',true,'dedupCandidateId',v_dedup.id,'decision',v_dedup.decision,'resolutionVersion',v_dedup.resolution_version);
  END IF;
  RAISE EXCEPTION 'unsupported Supplier Catalog action';
END; $$;
REVOKE ALL ON FUNCTION public.server_mutate_supplier_catalog_v1(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_mutate_supplier_catalog_v1(uuid,text,jsonb) TO service_role;
COMMENT ON FUNCTION public.server_mutate_supplier_catalog_v1(uuid,text,jsonb) IS 'Active-admin-only Phase E catalog identity mutation boundary. It does not enable Supplier Commerce runtime.';;
