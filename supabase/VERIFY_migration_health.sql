-- ============================================================
-- Loadify Market — Complete Migration Verification Script
-- Run in: Supabase Dashboard → SQL Editor
-- Expected: Every check returns '✅ OK'
--
-- CORRECTED from the original draft:
--   • 420_wholesale_categories slugs updated to match the actual
--     seeds in 420_seed_wholesale_categories.sql and the UI config
--     in src/lib/category-config.ts.
--   • trg_sync_email_verified is checked in trigger_schema='public'
--     (trigger fires on public.users, added by migration 442).
-- ============================================================

SELECT check_name, status FROM (

  -- ── BASE SCHEMA: core tables ─────────────────────────────────
  SELECT '00_consolidated_schema | table: users'                    AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users')
              THEN '✅ OK' ELSE '❌ MISSING' END AS status

  UNION ALL SELECT '00_consolidated_schema | table: seller_profiles',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_profiles')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: seller_stores',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_stores')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: categories',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: products',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: cart_items',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart_items')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: orders',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: order_items',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: reviews',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: disputes',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='disputes')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: conversations',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: messages',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: wishlists',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='wishlists')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: notifications',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: saved_searches',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_searches')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: shipments',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipments')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: shipment_events',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipment_events')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: rfq_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: admin_actions',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_actions')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: returns',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='returns')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: featured_listings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='featured_listings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: banners',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='banners')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '00_consolidated_schema | table: promoted_listings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='promoted_listings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 30_storage_buckets: storage buckets ──────────────────────
  UNION ALL SELECT '30_storage_buckets | bucket: product-images',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='product-images')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '30_storage_buckets | bucket: avatars',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='avatars')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '30_storage_buckets | bucket: documents',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='documents')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 40_shipping_methods: shipping tables ─────────────────────
  UNION ALL SELECT '40_shipping_methods | table: shipping_methods',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_methods')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '40_shipping_methods | table: shipping_zones',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_zones')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 90_launch_features: seller_balance, payout_requests ──────
  UNION ALL SELECT '90_launch_features | table: seller_balance',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_balance')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '90_launch_features | table: payout_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payout_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '90_launch_features | table: checkout_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checkout_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 454_payout_rpc_security: payout RPCs ─────────────────────
  UNION ALL SELECT '454_payout_rpc_security | fn: credit_seller_balance',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='credit_seller_balance')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '454_payout_rpc_security | fn: approve_payout',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='approve_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '454_payout_rpc_security | fn: complete_payout',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='complete_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '454_payout_rpc_security | fn: reject_payout',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='reject_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 95_stripe_connect: Stripe Connect columns ────────────────
  UNION ALL SELECT '95_stripe_connect | column: seller_profiles.stripeConnectStatus',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='seller_profiles'
                           AND column_name='stripeConnectStatus')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '95_stripe_connect | column: seller_profiles.stripeConnectAccountId',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='seller_profiles'
                           AND column_name='stripeConnectAccountId')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 120_error_tracking_rate_limits ───────────────────────────
  UNION ALL SELECT '120_error_tracking | table: csp_reports',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='csp_reports')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '120_error_tracking | table: error_reports',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_reports')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '120_error_tracking | table: email_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '120_error_tracking | table: resend_verification_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resend_verification_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '120_error_tracking | table: connect_onboard_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='connect_onboard_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '120_error_tracking | table: error_report_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_report_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 190_extend_seller_profiles_public_view ───────────────────
  UNION ALL SELECT '190_extend | view: seller_profiles_public',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='seller_profiles_public')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 200_services_marketplace ─────────────────────────────────
  UNION ALL SELECT '200_services | table: services',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '200_services | table: service_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '200_services | table: service_quotes',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_quotes')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '200_services | table: order_messages',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_messages')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 210_seller_auto_activation ───────────────────────────────
  UNION ALL SELECT '210_auto_activation | column: seller_profiles.activatedAt',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='seller_profiles'
                           AND column_name='activatedAt')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '210_auto_activation | column: seller_profiles.isApproved',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='seller_profiles'
                           AND column_name='isApproved')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '210_auto_activation | trigger: trg_seller_status_sync',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers
                           WHERE trigger_schema='public' AND trigger_name='trg_seller_status_sync')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 240_track_shipment_rate_limits ───────────────────────────
  UNION ALL SELECT '240_track_rate_limits | table: track_shipment_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='track_shipment_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 250_register_rate_limits ─────────────────────────────────
  UNION ALL SELECT '250_register_rate_limits | table: register_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='register_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 260_seller_shipping_defaults ─────────────────────────────
  UNION ALL SELECT '260_shipping_defaults | column: seller_profiles.shippingDefaults',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='seller_profiles'
                           AND column_name='shippingDefaults')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 270_seller_pause_db_backed ───────────────────────────────
  UNION ALL SELECT '270_seller_pause | column: seller_profiles.isPaused',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='seller_profiles'
                           AND column_name='isPaused')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 320_sync_email_verified + 442_fix_sync_email_verified_trigger
  -- Trigger lives on public.users (added by migration 442).
  UNION ALL SELECT '320_sync_email_verified | trigger: trg_sync_email_verified',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers
                           WHERE trigger_schema='public' AND trigger_name='trg_sync_email_verified')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 340_sync_role_to_auth_metadata ───────────────────────────
  UNION ALL SELECT '340_sync_role_metadata | function: sync_role_to_auth_metadata',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                           WHERE n.nspname='public' AND p.proname='sync_role_to_auth_metadata')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '340_sync_role_metadata | trigger: trg_sync_role_to_auth_metadata',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers
                           WHERE trigger_schema='public' AND trigger_name='trg_sync_role_to_auth_metadata')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 370_user_sync_stripe_events ──────────────────────────────
  UNION ALL SELECT '370_stripe_events | table: stripe_events',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stripe_events')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '370_stripe_events | trigger: on_auth_user_created',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers
                           WHERE trigger_name='on_auth_user_created')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '370_stripe_events | trigger: trg_new_user_profile',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers
                           WHERE trigger_name='trg_new_user_profile')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '370_stripe_events | function: handle_new_auth_user',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                           WHERE n.nspname='public' AND p.proname='handle_new_auth_user')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 380_fix_is_admin_jwt ─────────────────────────────────────
  UNION ALL SELECT '380_fix_is_admin_jwt | function: is_admin (checks JWT)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                           WHERE n.nspname='public' AND p.proname='is_admin')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '380_fix_is_admin_jwt | function: is_seller (checks JWT)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                           WHERE n.nspname='public' AND p.proname='is_seller')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '389_uuid_safe_cast | function: owns_product',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                           WHERE n.nspname='public' AND p.proname='owns_product')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 400_global_category_system ───────────────────────────────
  UNION ALL SELECT '400_global_categories | column: categories.parent_id',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='categories'
                           AND column_name='parent_id')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '400_global_categories | column: categories.level',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='categories'
                           AND column_name='level')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 410_fix_role_escalation ───────────────────────────────────
  UNION ALL SELECT '410_role_escalation_fix | RLS policy: users_update exists',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                           WHERE schemaname='public' AND tablename='users'
                           AND policyname='users_update')
              THEN '✅ OK' ELSE '❌ MISSING' END

  -- ── 420_seed_wholesale_categories: 17 wholesale B2B categories
  --
  -- Slugs match 420_seed_wholesale_categories.sql and src/lib/category-config.ts
  -- exactly.  The earlier draft of this script checked enterprise slugs
  -- (wholesale-food-beverage etc.) which do NOT exist in this project.
  UNION ALL SELECT '420_wholesale_categories | 17 wholesale category slugs seeded',
         CASE WHEN (
           SELECT COUNT(*) FROM public.categories
           WHERE slug IN (
             'large-letter-items',
             'garden',
             'diy',
             'cleaning',
             'party-gift',
             'wholesale-pound-lines',
             'toys',
             'leisure-hobbies',
             'baby-supplies',
             'kitchenware',
             'health-beauty',
             'homeware',
             'electrical',
             'pet-supplies',
             'stationery',
             'seasonal',
             'wholesale-clothing'
           )
         ) = 17
         THEN '✅ OK'
         ELSE '❌ MISSING — only ' || (
           SELECT COUNT(*)::text FROM public.categories
           WHERE slug IN (
             'large-letter-items',
             'garden',
             'diy',
             'cleaning',
             'party-gift',
             'wholesale-pound-lines',
             'toys',
             'leisure-hobbies',
             'baby-supplies',
             'kitchenware',
             'health-beauty',
             'homeware',
             'electrical',
             'pet-supplies',
             'stationery',
             'seasonal',
             'wholesale-clothing'
           )
         ) || '/17 found' END

  -- ── CRITICAL: admin role set for platform owner ──────────────
  UNION ALL SELECT '⚠️ CRITICAL | owner account has role=admin in public.users',
         CASE WHEN EXISTS (SELECT 1 FROM public.users
                           WHERE email='loadifymarket.co.uk@gmail.com' AND role='admin')
              THEN '✅ OK'
              ELSE '❌ MISSING — run: UPDATE public.users SET role=''admin'' WHERE email=''loadifymarket.co.uk@gmail.com'';'
         END

) checks
ORDER BY check_name;
