REVOKE ALL ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB) FROM anon;

REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_email_verified_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_role_to_auth_metadata() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_seller_onboarding_completed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_seller_service_capability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_seller_service_capability_from_services() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.release_stale_unpaid_listing_locks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_unpaid_listing_locks() TO service_role;
ALTER FUNCTION public.release_stale_unpaid_listing_locks() SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.track_product_view(
  p_product_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE public.products
  SET views = COALESCE(views, 0) + 1,
      "lastViewedAt" = NOW()
  WHERE id = p_product_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.recently_viewed ("userId", "productId", "viewedAt")
    VALUES (v_user_id, p_product_id, NOW())
    ON CONFLICT ("userId", "productId") DO UPDATE SET "viewedAt" = NOW();
  ELSIF p_session_id IS NOT NULL AND length(p_session_id) BETWEEN 1 AND 200 THEN
    INSERT INTO public.recently_viewed ("sessionId", "productId", "viewedAt")
    VALUES (p_session_id, p_product_id, NOW())
    ON CONFLICT ("sessionId", "productId") DO UPDATE SET "viewedAt" = NOW();
  END IF;

  INSERT INTO public.product_analytics ("productId", date, views, "uniqueVisitors")
  VALUES (p_product_id, CURRENT_DATE, 1, 1)
  ON CONFLICT ("productId", date) DO UPDATE SET
    views = public.product_analytics.views + 1,
    "uniqueVisitors" = public.product_analytics."uniqueVisitors" + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.track_product_view(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_product_view(UUID, UUID, TEXT) TO anon, authenticated, service_role;;
