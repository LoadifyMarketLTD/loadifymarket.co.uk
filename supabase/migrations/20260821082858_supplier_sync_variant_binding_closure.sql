-- 633_supplier_sync_variant_binding_closure.sql
-- Branch Guard closure: supplier stock/price observations must belong to the exact
-- supplier catalog variant already linked to the offer. Raw provider data may not
-- smuggle an unrelated external variant into canonical stock/price truth.

CREATE OR REPLACE FUNCTION private.guard_supplier_sync_variant_binding_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_catalog_variant text;
BEGIN
  SELECT BTRIM(COALESCE(i.external_variant_ref, ''))
    INTO v_catalog_variant
    FROM private.supplier_catalog_items i
   WHERE i.id = NEW.supplier_catalog_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'supplier catalog item required for sync observation';
  END IF;

  IF BTRIM(COALESCE(NEW.external_variant_ref, '')) <> v_catalog_variant THEN
    RAISE EXCEPTION 'supplier sync variant must match the offer catalog variant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_supplier_stock_variant_binding_v1
  ON private.supplier_stock_observations;
CREATE TRIGGER trg_guard_supplier_stock_variant_binding_v1
BEFORE INSERT ON private.supplier_stock_observations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_sync_variant_binding_v1();

DROP TRIGGER IF EXISTS trg_guard_supplier_price_variant_binding_v1
  ON private.supplier_price_observations;
CREATE TRIGGER trg_guard_supplier_price_variant_binding_v1
BEFORE INSERT ON private.supplier_price_observations
FOR EACH ROW EXECUTE FUNCTION private.guard_supplier_sync_variant_binding_v1();

COMMENT ON FUNCTION private.guard_supplier_sync_variant_binding_v1() IS
  'Phase H identity guard: stock/price observations are accepted only for the exact external variant represented by the supplier catalog item linked to the offer.';
;
