-- ================================================================
-- 00_reset.sql
-- Loadify Market — Database Reset Script
-- ================================================================
-- WARNING: Drops ALL Loadify Market tables, sequences, and functions.
-- Run this ONLY when you need a clean slate before re-running the
-- full schema. Safe to run on an empty database too.
--
-- CASCADE handles any leftover foreign-key dependencies.
-- ================================================================

DROP TABLE IF EXISTS coupon_usage             CASCADE;
DROP TABLE IF EXISTS shipment_events          CASCADE;
DROP TABLE IF EXISTS shipments                CASCADE;
DROP TABLE IF EXISTS rfq_responses            CASCADE;
DROP TABLE IF EXISTS transport_quotes         CASCADE;
DROP TABLE IF EXISTS delivery_requests        CASCADE;
DROP TABLE IF EXISTS dispute_messages         CASCADE;
DROP TABLE IF EXISTS disputes                 CASCADE;
DROP TABLE IF EXISTS returns                  CASCADE;
DROP TABLE IF EXISTS reviews                  CASCADE;
DROP TABLE IF EXISTS messages                 CASCADE;
DROP TABLE IF EXISTS conversations            CASCADE;
DROP TABLE IF EXISTS support_ticket_messages  CASCADE;
DROP TABLE IF EXISTS support_tickets          CASCADE;
DROP TABLE IF EXISTS admin_actions            CASCADE;
DROP TABLE IF EXISTS audit_logs               CASCADE;
DROP TABLE IF EXISTS reported_listings        CASCADE;
DROP TABLE IF EXISTS promoted_listings        CASCADE;
DROP TABLE IF EXISTS featured_listings        CASCADE;
DROP TABLE IF EXISTS product_offers           CASCADE;
DROP TABLE IF EXISTS product_questions        CASCADE;
DROP TABLE IF EXISTS product_analytics        CASCADE;
DROP TABLE IF EXISTS recently_viewed          CASCADE;
DROP TABLE IF EXISTS notifications            CASCADE;
DROP TABLE IF EXISTS notification_settings    CASCADE;
DROP TABLE IF EXISTS saved_searches           CASCADE;
DROP TABLE IF EXISTS wishlists                CASCADE;
DROP TABLE IF EXISTS payment_sessions         CASCADE;
DROP TABLE IF EXISTS payouts                  CASCADE;
DROP TABLE IF EXISTS coupons                  CASCADE;
DROP TABLE IF EXISTS order_items              CASCADE;
DROP TABLE IF EXISTS cart_items               CASCADE;
DROP TABLE IF EXISTS carts                    CASCADE;
DROP TABLE IF EXISTS rfq_requests             CASCADE;
DROP TABLE IF EXISTS orders                   CASCADE;
DROP TABLE IF EXISTS products                 CASCADE;
DROP TABLE IF EXISTS seller_verifications     CASCADE;
DROP TABLE IF EXISTS seller_stores            CASCADE;
DROP TABLE IF EXISTS seller_profiles          CASCADE;
DROP TABLE IF EXISTS buyer_profiles           CASCADE;
DROP TABLE IF EXISTS categories               CASCADE;
DROP TABLE IF EXISTS banners                  CASCADE;
DROP TABLE IF EXISTS platform_settings        CASCADE;
DROP TABLE IF EXISTS users                    CASCADE;

DROP SEQUENCE IF EXISTS order_number_seq;

DROP FUNCTION IF EXISTS update_updated_at_column()               CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column_snake()         CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_owner()                      CASCADE;
DROP FUNCTION IF EXISTS is_owner()                               CASCADE;
DROP FUNCTION IF EXISTS is_seller()                              CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_profile()                CASCADE;
DROP FUNCTION IF EXISTS handle_seller_verification_upgrade()     CASCADE;
DROP FUNCTION IF EXISTS track_product_view                       CASCADE;
DROP FUNCTION IF EXISTS refresh_product_rating()                 CASCADE;
DROP FUNCTION IF EXISTS update_conversation_last_message()       CASCADE;
DROP FUNCTION IF EXISTS record_shipment_status_change()          CASCADE;
DROP FUNCTION IF EXISTS sync_order_status_from_shipment()        CASCADE;
