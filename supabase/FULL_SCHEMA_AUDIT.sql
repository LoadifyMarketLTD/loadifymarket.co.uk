-- ============================================================
-- Loadify Market — FULL SCHEMA AUDIT
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
-- Scope: every table, column, index, trigger, function, view,
--        RLS policy, storage bucket, and data seed that the
--        TypeScript front-end and Netlify functions actually use.
--
-- Each row returns:
--   category  – grouping
--   check_name – human-readable description
--   status    – ✅ OK | ❌ MISSING | ℹ️  INFO
--
-- Run order does NOT matter — every statement is a SELECT only.
-- ============================================================

SELECT category, check_name, status
FROM (

-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — CORE TABLES
-- ═══════════════════════════════════════════════════════════

  SELECT '1. Core Tables' AS category,
         'table: users' AS check_name,
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users')
              THEN '✅ OK' ELSE '❌ MISSING' END AS status

  UNION ALL SELECT '1. Core Tables', 'table: buyer_profiles',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='buyer_profiles')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: seller_profiles',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_profiles')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: seller_stores',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_stores')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: seller_verifications',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_verifications')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: categories',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: products',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: product_analytics',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_analytics')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: recently_viewed',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recently_viewed')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: featured_listings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='featured_listings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: banners',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='banners')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: carts',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='carts')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: cart_items',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart_items')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: orders',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: order_items',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: payment_sessions',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_sessions')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: payouts',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payouts')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: coupons',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: coupon_usage',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupon_usage')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: reviews',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: product_questions',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_questions')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: product_offers',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_offers')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: returns',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='returns')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: disputes',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='disputes')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: dispute_messages',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dispute_messages')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: conversations',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: messages',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: wishlists',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='wishlists')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: saved_searches',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_searches')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: notifications',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: notification_settings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_settings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: delivery_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='delivery_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: transport_quotes',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transport_quotes')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: shipments',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipments')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: shipment_events',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipment_events')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: rfq_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: rfq_responses',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_responses')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: reported_listings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reported_listings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: admin_actions',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_actions')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: audit_logs',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: support_tickets',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_tickets')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: support_ticket_messages',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_ticket_messages')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: platform_settings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='platform_settings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: promoted_listings',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='promoted_listings')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: seller_balance',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_balance')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: payout_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payout_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: checkout_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checkout_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: stripe_events',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stripe_events')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: shipping_methods',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_methods')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: shipping_rates',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_rates')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: product_shipping',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_shipping')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: shipping_zones',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_zones')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── Service marketplace tables ────────────────────────────────
  UNION ALL SELECT '1. Core Tables', 'table: services',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: service_attributes',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_attributes')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: service_media',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_media')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: service_requests',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_requests')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: service_quotes',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_quotes')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: order_messages',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_messages')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: category_filter_definitions',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='category_filter_definitions')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── Rate-limit + monitoring tables ───────────────────────────
  UNION ALL SELECT '1. Core Tables', 'table: csp_reports',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='csp_reports')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: error_reports',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_reports')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: email_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: resend_verification_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resend_verification_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: connect_onboard_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='connect_onboard_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: error_report_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_report_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: register_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='register_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '1. Core Tables', 'table: track_shipment_rate_limits',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='track_shipment_rate_limits')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — VIEWS
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '2. Views', 'view: seller_profiles_public',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='seller_profiles_public')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 3 — COLUMNS (users)
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '3. Columns: users', 'users.role (buyer|seller|admin)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='role')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '3. Columns: users', 'users.isEmailVerified',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='isEmailVerified')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '3. Columns: users', 'users.isActive',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='isActive')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '3. Columns: users', 'users.onboardingCompleted (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='onboardingCompleted')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '3. Columns: users', 'users.onboardingStep (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='onboardingStep')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── seller_profiles columns ───────────────────────────────────
  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.sellerStatus',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='sellerStatus')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.isApproved',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='isApproved')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.activatedAt',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='activatedAt')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.stripeConnectStatus',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='stripeConnectStatus')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.stripeConnectAccountId (mig 443)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='stripeConnectAccountId')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.stripeChargesEnabled (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='stripeChargesEnabled')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.stripePayoutsEnabled (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='stripePayoutsEnabled')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.stripeDetailsSubmitted (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='stripeDetailsSubmitted')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.profileCompleted (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='profileCompleted')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.storeCreated (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='storeCreated')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.shippingSetupCompleted (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='shippingSetupCompleted')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.firstProductCreated (mig 446)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='firstProductCreated')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.hasServiceCapability (mig 447)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='hasServiceCapability')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.isPaused (mig 270)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='isPaused')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '4. Columns: seller_profiles', 'seller_profiles.shippingDefaults (mig 260)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_profiles' AND column_name='shippingDefaults')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── buyer_profiles columns ────────────────────────────────────
  UNION ALL SELECT '5. Columns: buyer_profiles', 'buyer_profiles.accountType (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='buyer_profiles' AND column_name='accountType')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '5. Columns: buyer_profiles', 'buyer_profiles.companyName (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='buyer_profiles' AND column_name='companyName')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '5. Columns: buyer_profiles', 'buyer_profiles.vatNumber (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='buyer_profiles' AND column_name='vatNumber')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '5. Columns: buyer_profiles', 'buyer_profiles.businessAddress (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='buyer_profiles' AND column_name='businessAddress')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '5. Columns: buyer_profiles', 'buyer_profiles.isVatVerified (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='buyer_profiles' AND column_name='isVatVerified')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '5. Columns: buyer_profiles', 'buyer_profiles.preferInvoice (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='buyer_profiles' AND column_name='preferInvoice')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── products columns ──────────────────────────────────────────
  UNION ALL SELECT '6. Columns: products', 'products.priceExVat',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='priceExVat')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '6. Columns: products', 'products.vatRate',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='vatRate')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '6. Columns: products', 'products.listingContext (mig 449)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='listingContext')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '6. Columns: products', 'products.isApproved',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='isApproved')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '6. Columns: products', 'products.isFeatured',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='isFeatured')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── orders columns ────────────────────────────────────────────
  UNION ALL SELECT '7. Columns: orders', 'orders.productId is nullable (mig 452)',
         CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='orders'
             AND column_name='productId' AND is_nullable='YES'
         ) THEN '✅ OK' ELSE '❌ MISSING — productId still NOT NULL' END

  UNION ALL SELECT '7. Columns: orders', 'orders.rfqId (mig 452)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='rfqId')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '7. Columns: orders', 'orders.rfqResponseId (mig 452)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='rfqResponseId')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '7. Columns: orders', 'orders.serviceCompletedAt (mig 448)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='serviceCompletedAt')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '7. Columns: orders', 'orders.isB2B (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='isB2B')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '7. Columns: orders', 'orders.vatAmount',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='vatAmount')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '7. Columns: orders', 'orders.service_id (mig 200)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='service_id')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '7. Columns: orders', 'orders.escrowStatus',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='escrowStatus')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ── categories columns ────────────────────────────────────────
  UNION ALL SELECT '8. Columns: categories', 'categories.parent_id (mig 400)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='parent_id')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '8. Columns: categories', 'categories.level (mig 400)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='level')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 9 — CHECK CONSTRAINTS (critical for status fields)
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '9. Constraints', 'orders.status includes ''completed'' (mig 448)',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname='public' AND t.relname='orders'
             AND c.conname='orders_status_check'
             AND pg_get_constraintdef(c.oid) LIKE '%completed%'
         ) THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '9. Constraints', 'orders.status includes ''invoice_requested'' (mig 450)',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname='public' AND t.relname='orders'
             AND c.conname='orders_status_check'
             AND pg_get_constraintdef(c.oid) LIKE '%invoice_requested%'
         ) THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '9. Constraints', 'users.role CHECK: only buyer|seller|admin (mig 280)',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname='public' AND t.relname='users'
             AND c.conname='users_role_check'
             AND pg_get_constraintdef(c.oid) NOT LIKE '%owner%'
             AND pg_get_constraintdef(c.oid) NOT LIKE '%guest%'
         ) THEN '✅ OK' ELSE '❌ MISSING / outdated (still has owner|guest)' END

  UNION ALL SELECT '9. Constraints', 'rfq_responses.status includes ''withdrawn'' (mig 06)',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           WHERE n.nspname='public' AND t.relname='rfq_responses'
             AND pg_get_constraintdef(c.oid) LIKE '%withdrawn%'
         ) THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 10 — FUNCTIONS
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '10. Functions', 'function: is_admin()',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_admin')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: is_seller()',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_seller')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: is_owner() [backward compat alias]',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_owner')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: owns_product(UUID)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='owns_product')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: handle_new_auth_user() [auth trigger]',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='handle_new_auth_user')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: handle_new_user_profile() [role trigger]',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='handle_new_user_profile')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: sync_seller_onboarding_completed()',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_seller_onboarding_completed')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: sync_seller_onboarding_completed — Stripe gate removed (mig 453)',
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname='sync_seller_onboarding_completed'
             AND pg_get_functiondef(p.oid)     LIKE '%hasServiceCapability%'
             AND pg_get_functiondef(p.oid) NOT LIKE '%stripeConnectStatus%'
         ) THEN '✅ OK' ELSE '❌ MISSING — re-run 453_stripe_free_onboarding.sql' END

  UNION ALL SELECT '10. Functions', 'function: set_seller_service_capability() (mig 447)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_seller_service_capability')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: set_seller_service_capability_from_services() (mig 447)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_seller_service_capability_from_services')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: sync_email_verified_on_insert() (mig 442)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_email_verified_on_insert')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: sync_role_to_auth_metadata() (mig 340)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_role_to_auth_metadata')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: decrement_product_stock(UUID, INTEGER)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='decrement_product_stock')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: track_product_view(UUID, UUID, TEXT)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='track_product_view')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: refresh_product_rating()',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='refresh_product_rating')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: credit_seller_balance(UUID, UUID)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='credit_seller_balance')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: request_payout(DECIMAL)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='request_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: approve_payout(UUID)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='approve_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: complete_payout(UUID)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='complete_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: reject_payout(UUID, TEXT)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reject_payout')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='log_admin_action')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: update_updated_at_column() [camelCase trigger helper]',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='update_updated_at_column')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: update_updated_at_column_snake() [snake_case trigger helper]',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='update_updated_at_column_snake')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: validate_product_category_assignment() (mig 400)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='validate_product_category_assignment')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '10. Functions', 'function: sync_category_parent_columns() (mig 400)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_category_parent_columns')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 11 — TRIGGERS
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '11. Triggers', 'trigger: on_auth_user_created (on auth.users)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name='on_auth_user_created')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_new_user_profile (on public.users)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_new_user_profile' AND event_object_table='users')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_sync_email_verified (on public.users)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_sync_email_verified' AND event_object_table='users')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_sync_seller_onboarding (on seller_profiles)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_sync_seller_onboarding')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_products_service_capability (mig 447)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_products_service_capability')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_services_service_capability (mig 447)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_services_service_capability')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_seller_status_sync (mig 210)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_seller_status_sync')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_sync_role_to_auth_metadata (mig 340)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_sync_role_to_auth_metadata')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_reviews_refresh_rating (on reviews)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_reviews_refresh_rating')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_shipping_zones_updated_at (mig 441)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_shipping_zones_updated_at')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_categories_parent_sync (mig 400)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_categories_parent_sync')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '11. Triggers', 'trigger: trg_products_validate_category_assignment (mig 400)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name='trg_products_validate_category_assignment')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 12 — INDEXES (critical for performance)
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '12. Indexes', 'index: idx_products_listing_context (mig 449)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='products' AND indexname='idx_products_listing_context')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '12. Indexes', 'index: idx_orders_rfq (mig 452)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='orders' AND indexname='idx_orders_rfq')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '12. Indexes', 'index: idx_orders_is_b2b (mig 450)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='orders' AND indexname='idx_orders_is_b2b')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '12. Indexes', 'index: idx_products_fts (full-text search)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='products' AND indexname='idx_products_fts')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '12. Indexes', 'index: idx_stripe_events_event_id (unique)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='stripe_events' AND indexname='idx_stripe_events_event_id')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '12. Indexes', 'index: idx_notifications_unread',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='notifications' AND indexname='idx_notifications_unread')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '12. Indexes', 'index: idx_messages_unread',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='messages' AND indexname='idx_messages_unread')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 13 — RLS POLICIES (critical security checks)
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '13. RLS Policies', 'products RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='products' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING — products table has no RLS!' END

  UNION ALL SELECT '13. RLS Policies', 'orders RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='orders' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING — orders table has no RLS!' END

  UNION ALL SELECT '13. RLS Policies', 'users RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='users' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING — users table has no RLS!' END

  UNION ALL SELECT '13. RLS Policies', 'seller_profiles RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='seller_profiles' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'stripe_events RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='stripe_events' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'seller_balance RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='seller_balance' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'payout_requests RLS enabled',
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='payout_requests' AND c.relrowsecurity=TRUE)
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'policy: products_select exists',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_select')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'policy: products_insert exists',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='products_insert')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'policy: seller_profiles_select exists',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seller_profiles' AND policyname='seller_profiles_select')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'policy: users_update exists (mig 410 anti-escalation)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_update')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'policy: reviews_insert exists',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='reviews_insert')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'policy: disputes_update exists',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='disputes' AND policyname='disputes_update')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'storage policy: avatars_select',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_select')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'storage policy: documents_select',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='documents_select')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '13. RLS Policies', 'storage policy: pod_select (proof-of-delivery)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='pod_select')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 14 — STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '14. Storage Buckets', 'bucket: product-images',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='product-images')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '14. Storage Buckets', 'bucket: avatars (mig 440)',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='avatars')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '14. Storage Buckets', 'bucket: documents (mig 440)',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='documents')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '14. Storage Buckets', 'bucket: proof-of-delivery (mig 444)',
         CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id='proof-of-delivery')
              THEN '✅ OK' ELSE '❌ MISSING' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 15 — PLATFORM_SETTINGS DATA SEEDS
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '15. Data Seeds', 'platform_settings: key=''commission_rate'' exists',
         CASE WHEN EXISTS (SELECT 1 FROM public.platform_settings WHERE key='commission_rate')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'platform_settings: key=''maintenance_mode'' exists',
         CASE WHEN EXISTS (SELECT 1 FROM public.platform_settings WHERE key='maintenance_mode')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'platform_settings: key=''feature_flags'' exists',
         CASE WHEN EXISTS (SELECT 1 FROM public.platform_settings WHERE key='feature_flags')
              THEN '✅ OK' ELSE '❌ MISSING — run: INSERT INTO platform_settings (key, value) VALUES (''feature_flags'', ''{"sellerRegistration":true,"buyerRegistration":true,"rfqSystem":true,"reviewSystem":true,"autoApproveProducts":false}'')' END

  UNION ALL SELECT '15. Data Seeds', 'platform_settings: key=''escrow_release_days'' exists',
         CASE WHEN EXISTS (SELECT 1 FROM public.platform_settings WHERE key='escrow_release_days')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'platform_settings: key=''vat_rate'' exists',
         CASE WHEN EXISTS (SELECT 1 FROM public.platform_settings WHERE key='vat_rate')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'shipping_methods: Royal Mail Tracked 48 seeded',
         CASE WHEN EXISTS (SELECT 1 FROM public.shipping_methods WHERE name='Royal Mail Tracked 48')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'shipping_methods: Evri Standard Delivery seeded',
         CASE WHEN EXISTS (SELECT 1 FROM public.shipping_methods WHERE name='Evri Standard Delivery')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'shipping_zones: United Kingdom seeded (mig 441)',
         CASE WHEN EXISTS (SELECT 1 FROM public.shipping_zones WHERE name='United Kingdom')
              THEN '✅ OK' ELSE '❌ MISSING' END

  UNION ALL SELECT '15. Data Seeds', 'categories: 17 wholesale slugs seeded (mig 420)',
         CASE WHEN (
           SELECT COUNT(*) FROM public.categories
           WHERE slug IN (
             'large-letter-items','garden','diy','cleaning','party-gift',
             'wholesale-pound-lines','toys','leisure-hobbies','baby-supplies',
             'kitchenware','health-beauty','homeware','electrical',
             'pet-supplies','stationery','seasonal','wholesale-clothing'
           )
         ) = 17
         THEN '✅ OK'
         ELSE '❌ MISSING — only ' || (
           SELECT COUNT(*)::text FROM public.categories
           WHERE slug IN (
             'large-letter-items','garden','diy','cleaning','party-gift',
             'wholesale-pound-lines','toys','leisure-hobbies','baby-supplies',
             'kitchenware','health-beauty','homeware','electrical',
             'pet-supplies','stationery','seasonal','wholesale-clothing'
           )
         ) || '/17 found' END

  UNION ALL SELECT '15. Data Seeds', 'categories: 10 global root categories seeded (mig 400)',
         CASE WHEN (
           SELECT COUNT(*) FROM public.categories
           WHERE slug IN (
             'electronics','home-garden','clothing-fashion','toys-games',
             'sports-fitness','automotive','health-beauty','pets',
             'food-drink','office-business'
           )
         ) = 10
         THEN '✅ OK'
         ELSE '❌ MISSING — only ' || (
           SELECT COUNT(*)::text FROM public.categories
           WHERE slug IN (
             'electronics','home-garden','clothing-fashion','toys-games',
             'sports-fitness','automotive','health-beauty','pets',
             'food-drink','office-business'
           )
         ) || '/10 found' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 16 — CRITICAL ADMIN ACCOUNT
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '16. ⚠️ CRITICAL', 'owner account has role=admin in public.users',
         CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email='loadifymarket.co.uk@gmail.com' AND role='admin')
              THEN '✅ OK'
              ELSE '❌ MISSING — run: UPDATE public.users SET role=''admin'' WHERE email=''loadifymarket.co.uk@gmail.com'';' END

-- ═══════════════════════════════════════════════════════════
-- SECTION 17 — INFO: ROW COUNTS (health snapshot)
-- ═══════════════════════════════════════════════════════════

  UNION ALL SELECT '17. ℹ️ Info', 'total users',
         (SELECT COUNT(*)::text || ' rows' FROM public.users)

  UNION ALL SELECT '17. ℹ️ Info', 'total seller_profiles',
         (SELECT COUNT(*)::text || ' rows' FROM public.seller_profiles)

  UNION ALL SELECT '17. ℹ️ Info', 'active sellers (sellerStatus=active)',
         (SELECT COUNT(*)::text || ' rows' FROM public.seller_profiles WHERE "sellerStatus"='active')

  UNION ALL SELECT '17. ℹ️ Info', 'total products',
         (SELECT COUNT(*)::text || ' rows' FROM public.products)

  UNION ALL SELECT '17. ℹ️ Info', 'active + approved products',
         (SELECT COUNT(*)::text || ' rows' FROM public.products WHERE "isActive"=TRUE AND "isApproved"=TRUE)

  UNION ALL SELECT '17. ℹ️ Info', 'total orders',
         (SELECT COUNT(*)::text || ' rows' FROM public.orders)

  UNION ALL SELECT '17. ℹ️ Info', 'total categories (active)',
         (SELECT COUNT(*)::text || ' rows' FROM public.categories WHERE "isActive"=TRUE)

  UNION ALL SELECT '17. ℹ️ Info', 'total rfq_requests',
         (SELECT COUNT(*)::text || ' rows' FROM public.rfq_requests)

  UNION ALL SELECT '17. ℹ️ Info', 'total rfq_responses',
         (SELECT COUNT(*)::text || ' rows' FROM public.rfq_responses)

  UNION ALL SELECT '17. ℹ️ Info', 'total stripe_events processed',
         (SELECT COUNT(*)::text || ' rows' FROM public.stripe_events)

  UNION ALL SELECT '17. ℹ️ Info', 'unprocessed notifications (unread)',
         (SELECT COUNT(*)::text || ' rows' FROM public.notifications WHERE "isRead"=FALSE)

  UNION ALL SELECT '17. ℹ️ Info', 'open disputes',
         (SELECT COUNT(*)::text || ' rows' FROM public.disputes WHERE status='open')

  UNION ALL SELECT '17. ℹ️ Info', 'platform_settings rows',
         (SELECT COUNT(*)::text || ' rows' FROM public.platform_settings)

) audit
ORDER BY category, check_name;
