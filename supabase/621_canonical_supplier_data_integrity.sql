-- 621_canonical_supplier_data_integrity.sql
-- Phase E integrity closure: a supplier catalog item can resolve to at most one
-- canonical product as same_product, and an explicit different_product decision
-- can never back an approved supplier offer.

CREATE UNIQUE INDEX IF NOT EXISTS catalog_dedup_one_same_product_unique
  ON private.catalog_dedup_candidates(supplier_catalog_item_id)
  WHERE decision = 'same_product';

CREATE OR REPLACE FUNCTION private.guard_supplier_offer_dedup_conflict_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NEW.status = 'approved' AND EXISTS (
    SELECT 1
      FROM private.catalog_dedup_candidates d
     WHERE d.supplier_catalog_item_id = NEW.supplier_catalog_item_id
       AND d.candidate_canonical_product_id = NEW.canonical_product_id
       AND d.decision = 'different_product'
  ) THEN
    RAISE EXCEPTION 'different-product dedup resolution blocks supplier offer approval';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_offer_dedup_conflict_v1 ON private.supplier_offers;
CREATE TRIGGER trg_guard_supplier_offer_dedup_conflict_v1
BEFORE INSERT OR UPDATE ON private.supplier_offers
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_offer_dedup_conflict_v1();

CREATE OR REPLACE FUNCTION private.guard_supplier_catalog_identifier_namespace_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NULLIF(BTRIM(NEW.identifier_namespace), '') IS NULL THEN
    RAISE EXCEPTION 'supplier catalog identifier namespace is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_catalog_identifier_namespace_v1 ON private.supplier_catalog_identifiers;
CREATE TRIGGER trg_guard_supplier_catalog_identifier_namespace_v1
BEFORE INSERT OR UPDATE ON private.supplier_catalog_identifiers
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_catalog_identifier_namespace_v1();

-- Phase E remains source-only and fail-closed. No control is enabled here.
