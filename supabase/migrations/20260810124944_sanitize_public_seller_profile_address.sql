CREATE OR REPLACE VIEW public.seller_profiles_public AS
SELECT
  "userId",
  "businessName",
  "marketplaceRole",
  "isApproved",
  "verificationStatus",
  rating,
  "salesCount",
  "totalSales",
  "deliverySuccessRate",
  "paymentBehaviour",
  jsonb_strip_nulls(
    jsonb_build_object(
      'city', "businessAddress" ->> 'city',
      'country', "businessAddress" ->> 'country'
    )
  ) AS "businessAddress",
  "contactPhone",
  "createdAt"
FROM public.seller_profiles;

REVOKE ALL ON public.seller_profiles_public FROM PUBLIC;
GRANT SELECT ON public.seller_profiles_public TO anon, authenticated, service_role;;
