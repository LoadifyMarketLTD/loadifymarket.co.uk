-- 596_disable_rfq_for_fixed_price_launch.sql
-- Launch posture: Loadify Market is fixed-price checkout first.
-- RFQ remains in the codebase for a future B2B/custom-quotes release, but it
-- must not create unpaid "paid" orders during the fixed-price marketplace launch.

INSERT INTO public.platform_settings (key, value)
VALUES (
  'feature_flags',
  jsonb_build_object(
    'sellerRegistration', true,
    'buyerRegistration', true,
    'rfqSystem', false,
    'reviewSystem', true,
    'autoApproveProducts', false
  )
)
ON CONFLICT (key) DO UPDATE
SET value = COALESCE(public.platform_settings.value, '{}'::jsonb)
  || jsonb_build_object('rfqSystem', false);

DO $$
BEGIN
  RAISE NOTICE '596_disable_rfq_for_fixed_price_launch: rfqSystem=false applied.';
END $$;
