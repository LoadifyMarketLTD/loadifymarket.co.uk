REVOKE ALL ON public.seller_profiles_public FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated, service_role;;
