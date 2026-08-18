-- Remove stale shipping links left behind by deleted products, then enforce
-- referential integrity so future product deletions clean up automatically.
DELETE FROM public.product_shipping ps
WHERE NOT EXISTS (
  SELECT 1
  FROM public.products p
  WHERE p.id = ps.product_id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_shipping_product_id_fkey'
      AND conrelid = 'public.product_shipping'::regclass
  ) THEN
    ALTER TABLE public.product_shipping
      ADD CONSTRAINT product_shipping_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.products(id)
      ON DELETE CASCADE;
  END IF;
END $$;
