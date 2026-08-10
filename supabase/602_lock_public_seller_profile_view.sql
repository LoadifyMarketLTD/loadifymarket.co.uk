-- 602_lock_public_seller_profile_view.sql
-- seller_profiles_public is intentionally an owner-rights view over a private
-- sanitized cache so anonymous visitors can read public seller storefront data.
-- CREATE OR REPLACE VIEW preserves existing direct grants; migration 598 only
-- revoked PUBLIC, so legacy INSERT/UPDATE/DELETE grants on anon/authenticated
-- remained and made the automatically-updatable view writable.
--
-- Public clients need read-only access. All seller profile writes must go
-- through the canonical seller_profiles table and its protected server flows.

REVOKE ALL ON public.seller_profiles_public
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.seller_profiles_public
TO anon, authenticated, service_role;
