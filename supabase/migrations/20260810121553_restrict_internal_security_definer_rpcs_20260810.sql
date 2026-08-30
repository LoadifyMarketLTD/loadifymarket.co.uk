REVOKE ALL ON FUNCTION public.decrement_product_stock(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(UUID, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.expire_orphan_offer(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_orphan_offer(UUID) TO service_role;;
