-- Marketplace Seller direct publication: retire per-product owner pre-approval.
--
-- Safety model after this migration:
--   * drafts remain private because products.isActive = false
--   * publication still passes seller/payment/tax/shipping gates in server code
--   * public catalogue RLS may continue to require isApproved = true because
--     this compatibility column is now server-enforced true
--   * operator moderation remains available through listing deactivation,
--     account suspension and retained-history deletion controls

BEGIN;

ALTER TABLE public.products
  ALTER COLUMN "isApproved" SET DEFAULT true;

-- Close the historical backlog so previously published/draft listings do not
-- remain stuck behind a manual owner-approval state after the workflow is retired.
UPDATE public.products
SET "isApproved" = true
WHERE "isApproved" IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION private.enforce_marketplace_product_auto_approval_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW."isApproved" := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_auto_approval_v1 ON public.products;
CREATE TRIGGER trg_products_auto_approval_v1
BEFORE INSERT OR UPDATE OF "isApproved"
ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.enforce_marketplace_product_auto_approval_v1();

COMMENT ON FUNCTION private.enforce_marketplace_product_auto_approval_v1() IS
  'Compatibility boundary: Marketplace Seller products no longer require manual owner pre-approval. Moderation uses isActive/account controls instead.';

REVOKE ALL ON FUNCTION private.enforce_marketplace_product_auto_approval_v1() FROM PUBLIC;

COMMIT;
