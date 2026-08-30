REVOKE ALL PRIVILEGES ON public.seller_profiles_public FROM anon, authenticated;
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated;

REVOKE ALL PRIVILEGES ON public.user_display_names FROM anon, authenticated;
GRANT SELECT ON public.user_display_names TO authenticated;

REVOKE ALL PRIVILEGES ON public.orphan_pending_offers FROM anon, authenticated;;
