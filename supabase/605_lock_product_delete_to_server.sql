-- 605_lock_product_delete_to_server.sql
-- Product creation/update already use canonical server functions. Hard deletion
-- must do the same so retained marketplace history and owned media cleanup cannot
-- be bypassed by a direct authenticated Supabase client call.

DROP POLICY IF EXISTS products_delete ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete their own products" ON public.products;
DROP POLICY IF EXISTS "products_delete_owner" ON public.products;

REVOKE DELETE ON TABLE public.products FROM anon, authenticated;
GRANT DELETE ON TABLE public.products TO service_role;
