-- ════════════════════════════════════════════════════════════════════════════
-- Loadify Market — FULL Database Verification Script
-- Generated: 2026-04-25  |  Run in: Supabase Dashboard → SQL Editor
--
-- Checks EVERY table, function (RPC), view, and trigger defined across ALL
-- SQL migration files in the repository.
--
-- Output columns:
--   category  — TABLE | FUNCTION | VIEW | TRIGGER
--   object    — fully-qualified name (or trigger: name ON table)
--   status    — ✅ EXISTS  |  ❌ MISSING
--
-- Nothing is created, modified, or dropped. Read-only.
-- ════════════════════════════════════════════════════════════════════════════

SELECT
  category,
  object,
  status
FROM (

  -- ══════════════════════════════════════════════════════════════════════════
  --  ① TABLES  (68 total)
  -- ══════════════════════════════════════════════════════════════════════════

  SELECT 'TABLE' AS category, 'admin_actions'                  AS object,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='admin_actions')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status

  UNION ALL SELECT 'TABLE', 'audit_logs',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'banners',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='banners')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'buyer_profiles',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='buyer_profiles')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'cart_items',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart_items')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'carts',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='carts')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'categories',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'category_filter_definitions',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='category_filter_definitions')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'checkout_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checkout_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'connect_onboard_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='connect_onboard_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'conversations',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conversations')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'coupon_usage',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupon_usage')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'coupons',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'csp_reports',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='csp_reports')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'delivery_requests',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='delivery_requests')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'dispute_messages',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dispute_messages')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'disputes',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='disputes')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'email_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'error_report_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_report_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'error_reports',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_reports')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'featured_listings',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='featured_listings')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'messages',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'notification_settings',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_settings')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'notifications',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'order_items',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'order_messages',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_messages')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'orders',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'payment_sessions',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_sessions')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'payout_requests',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payout_requests')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'payouts',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payouts')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'platform_settings',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='platform_settings')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'product_analytics',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_analytics')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'product_offers',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_offers')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'product_questions',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_questions')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'product_shipping',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_shipping')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'products',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'promoted_listings',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='promoted_listings')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'recently_viewed',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recently_viewed')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'register_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='register_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'reported_listings',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reported_listings')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'resend_verification_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='resend_verification_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'returns',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='returns')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'reviews',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'rfq_requests',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_requests')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'rfq_responses',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_responses')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'saved_searches',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='saved_searches')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'seller_balance',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_balance')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'seller_profiles',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_profiles')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'seller_stores',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_stores')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'seller_verifications',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='seller_verifications')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'service_attributes',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_attributes')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'service_media',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_media')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'service_quotes',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_quotes')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'service_requests',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_requests')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'services',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'shipment_events',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipment_events')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'shipments',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipments')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'shipping_methods',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_methods')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'shipping_rates',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_rates')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'shipping_zones',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shipping_zones')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'stripe_events',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stripe_events')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'support_ticket_messages',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_ticket_messages')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'support_tickets',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_tickets')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'track_shipment_rate_limits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='track_shipment_rate_limits')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'transport_quotes',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transport_quotes')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'users',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TABLE', 'wishlists',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='wishlists')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  -- ══════════════════════════════════════════════════════════════════════════
  --  ② FUNCTIONS / RPCs  (28 total)
  -- ══════════════════════════════════════════════════════════════════════════

  UNION ALL SELECT 'FUNCTION', 'approve_payout(uuid)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='approve_payout')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'complete_payout(uuid)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='complete_payout')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'credit_seller_balance(uuid, uuid)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='credit_seller_balance')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'decrement_product_stock(uuid, integer)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='decrement_product_stock')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'handle_new_auth_user()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='handle_new_auth_user')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'handle_new_user_profile()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='handle_new_user_profile')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'handle_seller_verification_upgrade()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='handle_seller_verification_upgrade')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'is_admin()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='is_admin')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'is_owner()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='is_owner')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'is_seller()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='is_seller')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'log_admin_action(text, text, uuid, jsonb, jsonb)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='log_admin_action')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'owns_product(uuid)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='owns_product')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'refresh_product_rating()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='refresh_product_rating')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'reject_payout(uuid, text)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='reject_payout')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'request_payout(numeric)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='request_payout')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'set_seller_service_capability()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='set_seller_service_capability')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'set_seller_service_capability_from_services()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='set_seller_service_capability_from_services')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'set_updated_at()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='set_updated_at')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'sync_category_parent_columns()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='sync_category_parent_columns')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'sync_email_verified_on_insert()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='sync_email_verified_on_insert')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'sync_role_to_auth_metadata()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='sync_role_to_auth_metadata')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'sync_seller_approval_from_status()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='sync_seller_approval_from_status')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'sync_seller_onboarding_completed()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='sync_seller_onboarding_completed')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'track_product_view(uuid)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='track_product_view')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'update_conversation_last_message()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='update_conversation_last_message')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'update_updated_at_column()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='update_updated_at_column')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'update_updated_at_column_snake()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='update_updated_at_column_snake')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'FUNCTION', 'validate_product_category_assignment()',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name='validate_product_category_assignment')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  -- ══════════════════════════════════════════════════════════════════════════
  --  ③ VIEWS  (1 total)
  -- ══════════════════════════════════════════════════════════════════════════

  UNION ALL SELECT 'VIEW', 'seller_profiles_public',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='seller_profiles_public')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END

  -- ══════════════════════════════════════════════════════════════════════════
  --  ④ TRIGGERS  (49 total — includes auth.users trigger checked via pg_trigger)
  -- ══════════════════════════════════════════════════════════════════════════

  -- auth schema trigger (on auth.users)
  UNION ALL SELECT 'TRIGGER', 'on_auth_user_created  ON auth.users',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  -- public schema triggers
  UNION ALL SELECT 'TRIGGER', 'trg_banners_updatedAt  ON public.banners',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'banners' AND t.tgname = 'trg_banners_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_buyer_profiles_updatedAt  ON public.buyer_profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'buyer_profiles' AND t.tgname = 'trg_buyer_profiles_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_cart_items_updatedAt  ON public.cart_items',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'cart_items' AND t.tgname = 'trg_cart_items_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_carts_updatedAt  ON public.carts',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'carts' AND t.tgname = 'trg_carts_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_categories_parent_sync  ON public.categories',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'categories' AND t.tgname = 'trg_categories_parent_sync'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_categories_updatedAt  ON public.categories',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'categories' AND t.tgname = 'trg_categories_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_category_filter_definitions_updatedAt  ON public.category_filter_definitions',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'category_filter_definitions' AND t.tgname = 'trg_category_filter_definitions_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_checkout_rate_limits_updatedAt  ON public.checkout_rate_limits',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'checkout_rate_limits' AND t.tgname = 'trg_checkout_rate_limits_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_coupons_updatedAt  ON public.coupons',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'coupons' AND t.tgname = 'trg_coupons_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_delivery_requests_updatedAt  ON public.delivery_requests',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'delivery_requests' AND t.tgname = 'trg_delivery_requests_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_disputes_updatedAt  ON public.disputes',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'disputes' AND t.tgname = 'trg_disputes_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_featured_listings_updatedAt  ON public.featured_listings',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'featured_listings' AND t.tgname = 'trg_featured_listings_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_messages_update_conversation  ON public.messages',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'messages' AND t.tgname = 'trg_messages_update_conversation'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_messages_updatedAt  ON public.messages',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'messages' AND t.tgname = 'trg_messages_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_new_user_profile  ON public.users',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'users' AND t.tgname = 'trg_new_user_profile'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_notification_settings_updatedAt  ON public.notification_settings',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'notification_settings' AND t.tgname = 'trg_notification_settings_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_orders_updatedAt  ON public.orders',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'orders' AND t.tgname = 'trg_orders_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_payment_sessions_updatedAt  ON public.payment_sessions',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'payment_sessions' AND t.tgname = 'trg_payment_sessions_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_payout_requests_updatedAt  ON public.payout_requests',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'payout_requests' AND t.tgname = 'trg_payout_requests_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_payouts_updatedAt  ON public.payouts',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'payouts' AND t.tgname = 'trg_payouts_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_product_offers_updatedAt  ON public.product_offers',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'product_offers' AND t.tgname = 'trg_product_offers_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_product_questions_updatedAt  ON public.product_questions',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'product_questions' AND t.tgname = 'trg_product_questions_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_products_service_capability  ON public.products',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'products' AND t.tgname = 'trg_products_service_capability'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_products_updatedAt  ON public.products',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'products' AND t.tgname = 'trg_products_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_products_validate_category_assignment  ON public.products',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'products' AND t.tgname = 'trg_products_validate_category_assignment'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_promoted_listings_updatedAt  ON public.promoted_listings',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'promoted_listings' AND t.tgname = 'trg_promoted_listings_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_reported_listings_updatedAt  ON public.reported_listings',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'reported_listings' AND t.tgname = 'trg_reported_listings_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_returns_updatedAt  ON public.returns',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'returns' AND t.tgname = 'trg_returns_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_reviews_refresh_rating  ON public.reviews',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'reviews' AND t.tgname = 'trg_reviews_refresh_rating'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_reviews_updatedAt  ON public.reviews',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'reviews' AND t.tgname = 'trg_reviews_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_rfq_requests_updatedAt  ON public.rfq_requests',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'rfq_requests' AND t.tgname = 'trg_rfq_requests_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_rfq_responses_updatedAt  ON public.rfq_responses',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'rfq_responses' AND t.tgname = 'trg_rfq_responses_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_saved_searches_updatedAt  ON public.saved_searches',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'saved_searches' AND t.tgname = 'trg_saved_searches_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_seller_profiles_updatedAt  ON public.seller_profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'seller_profiles' AND t.tgname = 'trg_seller_profiles_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_seller_status_sync  ON public.seller_profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'seller_profiles' AND t.tgname = 'trg_seller_status_sync'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_seller_stores_updatedAt  ON public.seller_stores',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'seller_stores' AND t.tgname = 'trg_seller_stores_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_seller_verification_upgrade  ON public.seller_profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'seller_profiles' AND t.tgname = 'trg_seller_verification_upgrade'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_seller_verifications_updatedAt  ON public.seller_verifications',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'seller_verifications' AND t.tgname = 'trg_seller_verifications_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_services_service_capability  ON public.services',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'services' AND t.tgname = 'trg_services_service_capability'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_shipments_updated_at  ON public.shipments',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'shipments' AND t.tgname = 'trg_shipments_updated_at'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_shipping_zones_updated_at  ON public.shipping_zones',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'shipping_zones' AND t.tgname = 'trg_shipping_zones_updated_at'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_support_tickets_updatedAt  ON public.support_tickets',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'support_tickets' AND t.tgname = 'trg_support_tickets_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_sync_email_verified  ON public.users',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'users' AND t.tgname = 'trg_sync_email_verified'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_sync_role_to_auth_metadata  ON public.users',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'users' AND t.tgname = 'trg_sync_role_to_auth_metadata'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_sync_seller_onboarding  ON public.seller_profiles',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'seller_profiles' AND t.tgname = 'trg_sync_seller_onboarding'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_transport_quotes_updatedAt  ON public.transport_quotes',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'transport_quotes' AND t.tgname = 'trg_transport_quotes_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_users_updatedAt  ON public.users',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'users' AND t.tgname = 'trg_users_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

  UNION ALL SELECT 'TRIGGER', 'trg_wishlists_updatedAt  ON public.wishlists',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'wishlists' AND t.tgname = 'trg_wishlists_updatedAt'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END

) results

ORDER BY
  -- Sort order: TABLE first, then FUNCTION, VIEW, TRIGGER
  CASE category
    WHEN 'TABLE'    THEN 1
    WHEN 'FUNCTION' THEN 2
    WHEN 'VIEW'     THEN 3
    WHEN 'TRIGGER'  THEN 4
  END,
  object;

-- ════════════════════════════════════════════════════════════════════════════
-- Summary counts
-- ════════════════════════════════════════════════════════════════════════════
SELECT
  category,
  COUNT(*) FILTER (WHERE status = '✅ EXISTS')  AS exists_count,
  COUNT(*) FILTER (WHERE status = '❌ MISSING') AS missing_count,
  COUNT(*)                                       AS total
FROM (

  SELECT 'TABLE' AS category,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t.tbl)
         THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
  FROM (VALUES
    ('admin_actions'),('audit_logs'),('banners'),('buyer_profiles'),('cart_items'),
    ('carts'),('categories'),('category_filter_definitions'),('checkout_rate_limits'),
    ('connect_onboard_rate_limits'),('conversations'),('coupon_usage'),('coupons'),
    ('csp_reports'),('delivery_requests'),('dispute_messages'),('disputes'),
    ('email_rate_limits'),('error_report_rate_limits'),('error_reports'),
    ('featured_listings'),('messages'),('notification_settings'),('notifications'),
    ('order_items'),('order_messages'),('orders'),('payment_sessions'),
    ('payout_requests'),('payouts'),('platform_settings'),('product_analytics'),
    ('product_offers'),('product_questions'),('product_shipping'),('products'),
    ('promoted_listings'),('recently_viewed'),('register_rate_limits'),
    ('reported_listings'),('resend_verification_rate_limits'),('returns'),
    ('reviews'),('rfq_requests'),('rfq_responses'),('saved_searches'),
    ('seller_balance'),('seller_profiles'),('seller_stores'),('seller_verifications'),
    ('service_attributes'),('service_media'),('service_quotes'),('service_requests'),
    ('services'),('shipment_events'),('shipments'),('shipping_methods'),
    ('shipping_rates'),('shipping_zones'),('stripe_events'),('support_ticket_messages'),
    ('support_tickets'),('track_shipment_rate_limits'),('transport_quotes'),
    ('users'),('wishlists')
  ) AS t(tbl)

  UNION ALL

  SELECT 'FUNCTION' AS category,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema='public' AND routine_name=f.fn)
         THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
  FROM (VALUES
    ('approve_payout'),('complete_payout'),('credit_seller_balance'),
    ('decrement_product_stock'),('handle_new_auth_user'),('handle_new_user_profile'),
    ('handle_seller_verification_upgrade'),('is_admin'),('is_owner'),('is_seller'),
    ('log_admin_action'),('owns_product'),('refresh_product_rating'),('reject_payout'),
    ('request_payout'),('set_seller_service_capability'),
    ('set_seller_service_capability_from_services'),('set_updated_at'),
    ('sync_category_parent_columns'),('sync_email_verified_on_insert'),
    ('sync_role_to_auth_metadata'),('sync_seller_approval_from_status'),
    ('sync_seller_onboarding_completed'),('track_product_view'),
    ('update_conversation_last_message'),('update_updated_at_column'),
    ('update_updated_at_column_snake'),('validate_product_category_assignment')
  ) AS f(fn)

  UNION ALL

  SELECT 'VIEW' AS category,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='seller_profiles_public')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
  FROM (VALUES (1)) AS dummy

  UNION ALL

  SELECT 'TRIGGER' AS category,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = v.schema AND c.relname = v.tbl AND tg.tgname = v.trg
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
  FROM (VALUES
    ('auth',   'users',                      'on_auth_user_created'),
    ('public', 'banners',                    'trg_banners_updatedAt'),
    ('public', 'buyer_profiles',             'trg_buyer_profiles_updatedAt'),
    ('public', 'cart_items',                 'trg_cart_items_updatedAt'),
    ('public', 'carts',                      'trg_carts_updatedAt'),
    ('public', 'categories',                 'trg_categories_parent_sync'),
    ('public', 'categories',                 'trg_categories_updatedAt'),
    ('public', 'category_filter_definitions','trg_category_filter_definitions_updatedAt'),
    ('public', 'checkout_rate_limits',       'trg_checkout_rate_limits_updatedAt'),
    ('public', 'coupons',                    'trg_coupons_updatedAt'),
    ('public', 'delivery_requests',          'trg_delivery_requests_updatedAt'),
    ('public', 'disputes',                   'trg_disputes_updatedAt'),
    ('public', 'featured_listings',          'trg_featured_listings_updatedAt'),
    ('public', 'messages',                   'trg_messages_update_conversation'),
    ('public', 'messages',                   'trg_messages_updatedAt'),
    ('public', 'users',                      'trg_new_user_profile'),
    ('public', 'notification_settings',      'trg_notification_settings_updatedAt'),
    ('public', 'orders',                     'trg_orders_updatedAt'),
    ('public', 'payment_sessions',           'trg_payment_sessions_updatedAt'),
    ('public', 'payout_requests',            'trg_payout_requests_updatedAt'),
    ('public', 'payouts',                    'trg_payouts_updatedAt'),
    ('public', 'product_offers',             'trg_product_offers_updatedAt'),
    ('public', 'product_questions',          'trg_product_questions_updatedAt'),
    ('public', 'products',                   'trg_products_service_capability'),
    ('public', 'products',                   'trg_products_updatedAt'),
    ('public', 'products',                   'trg_products_validate_category_assignment'),
    ('public', 'promoted_listings',          'trg_promoted_listings_updatedAt'),
    ('public', 'reported_listings',          'trg_reported_listings_updatedAt'),
    ('public', 'returns',                    'trg_returns_updatedAt'),
    ('public', 'reviews',                    'trg_reviews_refresh_rating'),
    ('public', 'reviews',                    'trg_reviews_updatedAt'),
    ('public', 'rfq_requests',               'trg_rfq_requests_updatedAt'),
    ('public', 'rfq_responses',              'trg_rfq_responses_updatedAt'),
    ('public', 'saved_searches',             'trg_saved_searches_updatedAt'),
    ('public', 'seller_profiles',            'trg_seller_profiles_updatedAt'),
    ('public', 'seller_profiles',            'trg_seller_status_sync'),
    ('public', 'seller_stores',              'trg_seller_stores_updatedAt'),
    ('public', 'seller_profiles',            'trg_seller_verification_upgrade'),
    ('public', 'seller_verifications',       'trg_seller_verifications_updatedAt'),
    ('public', 'services',                   'trg_services_service_capability'),
    ('public', 'shipments',                  'trg_shipments_updated_at'),
    ('public', 'shipping_zones',             'trg_shipping_zones_updated_at'),
    ('public', 'support_tickets',            'trg_support_tickets_updatedAt'),
    ('public', 'users',                      'trg_sync_email_verified'),
    ('public', 'users',                      'trg_sync_role_to_auth_metadata'),
    ('public', 'seller_profiles',            'trg_sync_seller_onboarding'),
    ('public', 'transport_quotes',           'trg_transport_quotes_updatedAt'),
    ('public', 'users',                      'trg_users_updatedAt'),
    ('public', 'wishlists',                  'trg_wishlists_updatedAt')
  ) AS v(schema, tbl, trg)

) summary_data
GROUP BY category
ORDER BY CASE category WHEN 'TABLE' THEN 1 WHEN 'FUNCTION' THEN 2 WHEN 'VIEW' THEN 3 WHEN 'TRIGGER' THEN 4 END;
