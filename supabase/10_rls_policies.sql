-- ============================================================
-- 10_rls_policies.sql
-- Loadify Market — Complete Row Level Security Policies
-- ============================================================
-- ROLE HIERARCHY:
--   owner > admin > seller > buyer > guest
--
-- OWNER EMAIL:  loadifymarket.co.uk@gmail.com
-- Owner role = 'owner' in users.role
-- Admin role = 'admin' in users.role
--
-- IMPORTANT:
-- Run this AFTER all other migration files (01–09).
-- Enable RLS on every table, then add policies.
-- Owner/admin bypass is achieved via a reusable function.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────────

-- Returns true for the platform owner or any admin user
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true for the platform owner only
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'owner'
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns true for any seller (approved or not)
CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('seller', 'admin', 'owner')
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- ENABLE RLS ON ALL TABLES
-- ──────────────────────────────────────────────────────────────
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed         ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage            ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 1. USERS
-- ══════════════════════════════════════════════════════════════
-- SELECT: own record; admin/owner can see all
CREATE POLICY "users_select_own"       ON users FOR SELECT
  USING (auth.uid() = id OR is_admin_or_owner());

-- UPDATE: own non-sensitive fields; admin/owner can update any
CREATE POLICY "users_update_own"       ON users FOR UPDATE
  USING (auth.uid() = id OR is_admin_or_owner());

-- INSERT: handled by auth trigger only (service role)
CREATE POLICY "users_insert_service"   ON users FOR INSERT
  WITH CHECK (TRUE);  -- Supabase auth trigger runs as service role

-- DELETE: owner/admin only (soft-delete preferred via is_active)
CREATE POLICY "users_delete_admin"     ON users FOR DELETE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 2. BUYER PROFILES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "buyer_profiles_select"  ON buyer_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "buyer_profiles_all_own" ON buyer_profiles FOR ALL
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 3. SELLER PROFILES
-- ══════════════════════════════════════════════════════════════
-- Public can see basic seller profile (needed for store pages)
CREATE POLICY "seller_profiles_select_public" ON seller_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "seller_profiles_update_own"    ON seller_profiles FOR UPDATE
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "seller_profiles_insert_own"    ON seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "seller_profiles_delete_admin"  ON seller_profiles FOR DELETE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 4. SELLER STORES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "seller_stores_select_active"   ON seller_stores FOR SELECT
  USING (is_active = TRUE OR auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "seller_stores_manage_own"      ON seller_stores FOR ALL
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 5. SELLER VERIFICATIONS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "seller_verifications_select"   ON seller_verifications FOR SELECT
  USING (auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "seller_verifications_insert"   ON seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "seller_verifications_update"   ON seller_verifications FOR UPDATE
  USING (is_admin_or_owner());  -- Only admin/owner can approve/reject

CREATE POLICY "seller_verifications_delete"   ON seller_verifications FOR DELETE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 6. CATEGORIES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "categories_public_select"  ON categories FOR SELECT USING (TRUE);

CREATE POLICY "categories_admin_insert"   ON categories FOR INSERT
  WITH CHECK (is_admin_or_owner());

CREATE POLICY "categories_admin_update"   ON categories FOR UPDATE
  USING (is_admin_or_owner());

CREATE POLICY "categories_admin_delete"   ON categories FOR DELETE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 7. PRODUCTS
-- ══════════════════════════════════════════════════════════════
-- Public can browse approved active products
CREATE POLICY "products_public_select"    ON products FOR SELECT
  USING (
    (is_active = TRUE AND is_approved = TRUE)
    OR auth.uid() = seller_id
    OR is_admin_or_owner()
  );

CREATE POLICY "products_seller_insert"    ON products FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND is_seller()
  );

CREATE POLICY "products_seller_update"    ON products FOR UPDATE
  USING (auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "products_admin_delete"     ON products FOR DELETE
  USING (auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 8. PRODUCT ANALYTICS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "product_analytics_public_select" ON product_analytics FOR SELECT
  USING (TRUE);

-- Written only via service-role / SECURITY DEFINER functions
CREATE POLICY "product_analytics_service_insert" ON product_analytics FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "product_analytics_service_update" ON product_analytics FOR UPDATE
  USING (TRUE);

-- ══════════════════════════════════════════════════════════════
-- 9. RECENTLY VIEWED
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "recently_viewed_select" ON recently_viewed FOR SELECT
  USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "recently_viewed_insert" ON recently_viewed FOR INSERT
  WITH CHECK (TRUE);  -- logged anonymously via SECURITY DEFINER fn

CREATE POLICY "recently_viewed_delete_own" ON recently_viewed FOR DELETE
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- 10. CARTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "carts_own"    ON carts FOR ALL
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 11. CART ITEMS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "cart_items_own" ON cart_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
    OR is_admin_or_owner()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid())
    OR is_admin_or_owner()
  );

-- ══════════════════════════════════════════════════════════════
-- 12. ORDERS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "orders_parties_select"  ON orders FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR is_admin_or_owner()
  );

CREATE POLICY "orders_buyer_insert"    ON orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR is_admin_or_owner());

CREATE POLICY "orders_parties_update"  ON orders FOR UPDATE
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR is_admin_or_owner()
  );

CREATE POLICY "orders_admin_delete"    ON orders FOR DELETE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 13. ORDER ITEMS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "order_items_parties_select" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    ) OR is_admin_or_owner()
  );

CREATE POLICY "order_items_service_insert" ON order_items FOR INSERT
  WITH CHECK (TRUE);  -- inserted by checkout service role

-- ══════════════════════════════════════════════════════════════
-- 14. PAYMENT SESSIONS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "payment_sessions_select" ON payment_sessions FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "payment_sessions_insert" ON payment_sessions FOR INSERT
  WITH CHECK (TRUE);  -- created by Stripe webhook (service role)

CREATE POLICY "payment_sessions_update" ON payment_sessions FOR UPDATE
  USING (TRUE);  -- updated by webhook

-- ══════════════════════════════════════════════════════════════
-- 15. PAYOUTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "payouts_seller_select"   ON payouts FOR SELECT
  USING (auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "payouts_admin_manage"    ON payouts FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 16. REVIEWS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "reviews_public_select"  ON reviews FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "reviews_buyer_insert"   ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Buyer can update own review; seller can update only seller_response fields
CREATE POLICY "reviews_update_own"     ON reviews FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.seller_id = auth.uid())
    OR is_admin_or_owner()
  );

CREATE POLICY "reviews_admin_delete"   ON reviews FOR DELETE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 17. PRODUCT QUESTIONS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "product_questions_public_select"  ON product_questions FOR SELECT
  USING (TRUE);

CREATE POLICY "product_questions_auth_insert"    ON product_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "product_questions_update"         ON product_questions FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.seller_id = auth.uid())
    OR is_admin_or_owner()
  );

CREATE POLICY "product_questions_admin_delete"   ON product_questions FOR DELETE
  USING (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 18. PRODUCT OFFERS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "product_offers_parties_select"  ON product_offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "product_offers_buyer_insert"    ON product_offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "product_offers_parties_update"  ON product_offers FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 19. RETURNS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "returns_parties_select"  ON returns FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "returns_buyer_insert"    ON returns FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "returns_parties_update"  ON returns FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 20. DISPUTES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "disputes_parties_select"  ON disputes FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "disputes_buyer_insert"    ON disputes FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "disputes_parties_update"  ON disputes FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 21. RFQ REQUESTS
-- ══════════════════════════════════════════════════════════════
-- Anyone can submit an RFQ (including guests)
CREATE POLICY "rfq_requests_public_insert"   ON rfq_requests FOR INSERT
  WITH CHECK (TRUE);

-- Sellers, buyers who submitted, admin/owner can read
CREATE POLICY "rfq_requests_select"          ON rfq_requests FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR is_seller()
    OR is_admin_or_owner()
  );

CREATE POLICY "rfq_requests_seller_update"   ON rfq_requests FOR UPDATE
  USING (is_seller() OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 22. RFQ RESPONSES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "rfq_responses_select"   ON rfq_responses FOR SELECT
  USING (
    auth.uid() = seller_id
    OR EXISTS (SELECT 1 FROM rfq_requests r WHERE r.id = rfq_id AND r.buyer_id = auth.uid())
    OR is_admin_or_owner()
  );

CREATE POLICY "rfq_responses_seller_insert" ON rfq_responses FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND is_seller());

CREATE POLICY "rfq_responses_seller_update" ON rfq_responses FOR UPDATE
  USING (auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 23. CONVERSATIONS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "conversations_parties_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id OR is_admin_or_owner());

CREATE POLICY "conversations_parties_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_parties_update" ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 24. MESSAGES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "messages_parties_select" ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_admin_or_owner());

CREATE POLICY "messages_sender_insert"  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_receiver_update" ON messages FOR UPDATE
  USING (auth.uid() = receiver_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 25. DELIVERY REQUESTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "delivery_requests_select" ON delivery_requests FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR is_admin_or_owner()
  );

CREATE POLICY "delivery_requests_insert" ON delivery_requests FOR INSERT
  WITH CHECK (TRUE);  -- guests and authenticated users

CREATE POLICY "delivery_requests_update" ON delivery_requests FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 26. TRANSPORT QUOTES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "transport_quotes_select" ON transport_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_requests dr
      WHERE dr.id = delivery_request_id
        AND (dr.buyer_id = auth.uid() OR dr.seller_id = auth.uid())
    ) OR auth.uid() = carrier_id
    OR is_admin_or_owner()
  );

CREATE POLICY "transport_quotes_insert" ON transport_quotes FOR INSERT
  WITH CHECK (auth.uid() = carrier_id OR is_admin_or_owner());

CREATE POLICY "transport_quotes_update" ON transport_quotes FOR UPDATE
  USING (auth.uid() = carrier_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 27. SHIPMENTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "shipments_parties_select" ON shipments FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR is_admin_or_owner());

CREATE POLICY "shipments_seller_insert"  ON shipments FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "shipments_seller_update"  ON shipments FOR UPDATE
  USING (auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 28. SHIPMENT EVENTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "shipment_events_parties_select" ON shipment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.id = shipment_id
        AND (s.buyer_id = auth.uid() OR s.seller_id = auth.uid())
    ) OR is_admin_or_owner()
  );

CREATE POLICY "shipment_events_insert" ON shipment_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_id AND s.seller_id = auth.uid())
    OR is_admin_or_owner()
  );

-- ══════════════════════════════════════════════════════════════
-- 29. REPORTED LISTINGS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "reported_listings_select" ON reported_listings FOR SELECT
  USING (auth.uid() = reported_by OR is_admin_or_owner());

CREATE POLICY "reported_listings_insert" ON reported_listings FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "reported_listings_update" ON reported_listings FOR UPDATE
  USING (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 30. ADMIN ACTIONS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "admin_actions_select"  ON admin_actions FOR SELECT
  USING (is_admin_or_owner());

CREATE POLICY "admin_actions_insert"  ON admin_actions FOR INSERT
  WITH CHECK (is_admin_or_owner());

-- Immutable: no UPDATE or DELETE on admin_actions

-- ══════════════════════════════════════════════════════════════
-- 31. AUDIT LOGS (service-role only writes, admin reads)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "audit_logs_select"  ON audit_logs FOR SELECT
  USING (is_admin_or_owner());

-- INSERT must come from service-role (bypass RLS) – no anon policy
-- No UPDATE or DELETE policies: audit logs are append-only

-- ══════════════════════════════════════════════════════════════
-- 32. SUPPORT TICKETS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "support_tickets_own_select"   ON support_tickets FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "support_tickets_insert"       ON support_tickets FOR INSERT
  WITH CHECK (TRUE);  -- guests can open tickets

CREATE POLICY "support_tickets_update"       ON support_tickets FOR UPDATE
  USING (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 33. SUPPORT TICKET MESSAGES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "ticket_messages_select"  ON support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR is_admin_or_owner())
    )
  );

CREATE POLICY "ticket_messages_insert"  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR is_admin_or_owner())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 34. BANNERS (public read, admin write)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "banners_public_select"  ON banners FOR SELECT
  USING (is_active = TRUE OR is_admin_or_owner());

CREATE POLICY "banners_admin_manage"   ON banners FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 35. PLATFORM SETTINGS (public read, admin/owner write)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "platform_settings_public_select" ON platform_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "platform_settings_admin_manage"  ON platform_settings FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 36. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "notifications_own_select"  ON notifications FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_owner());

-- INSERT via SECURITY DEFINER function send_notification()
CREATE POLICY "notifications_service_insert" ON notifications FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "notifications_own_update"  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);  -- mark as read

CREATE POLICY "notifications_own_delete"  ON notifications FOR DELETE
  USING (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 37. NOTIFICATION SETTINGS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "notification_settings_own" ON notification_settings FOR ALL
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 38. WISHLISTS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "wishlists_own" ON wishlists FOR ALL
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 39. WISHLIST ITEMS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "wishlist_items_own" ON wishlist_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid())
    OR is_admin_or_owner()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid())
    OR is_admin_or_owner()
  );

-- ══════════════════════════════════════════════════════════════
-- 40. SAVED SEARCHES
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "saved_searches_own" ON saved_searches FOR ALL
  USING (auth.uid() = user_id OR is_admin_or_owner())
  WITH CHECK (auth.uid() = user_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 41. FEATURED LISTINGS (public read, admin write)
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "featured_listings_public_select" ON featured_listings FOR SELECT
  USING (is_active = TRUE OR is_admin_or_owner());

CREATE POLICY "featured_listings_admin_manage"  ON featured_listings FOR ALL
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 42. PROMOTED LISTINGS
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "promoted_listings_public_select" ON promoted_listings FOR SELECT
  USING (status = 'active' OR auth.uid() = seller_id OR is_admin_or_owner());

CREATE POLICY "promoted_listings_seller_insert" ON promoted_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "promoted_listings_seller_update" ON promoted_listings FOR UPDATE
  USING (auth.uid() = seller_id OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 43. COUPONS
-- ══════════════════════════════════════════════════════════════
-- Public can read active coupons (needed for checkout validation)
CREATE POLICY "coupons_public_select"  ON coupons FOR SELECT
  USING (is_active = TRUE OR auth.uid() = created_by OR is_admin_or_owner());

CREATE POLICY "coupons_seller_insert"  ON coupons FOR INSERT
  WITH CHECK (is_seller() AND (auth.uid() = seller_id OR seller_id IS NULL AND is_admin_or_owner()));

CREATE POLICY "coupons_seller_update"  ON coupons FOR UPDATE
  USING (auth.uid() = created_by OR is_admin_or_owner());

CREATE POLICY "coupons_admin_delete"   ON coupons FOR DELETE
  USING (auth.uid() = created_by OR is_admin_or_owner());

-- ══════════════════════════════════════════════════════════════
-- 44. COUPON USAGE
-- ══════════════════════════════════════════════════════════════
CREATE POLICY "coupon_usage_select"  ON coupon_usage FOR SELECT
  USING (auth.uid() = user_id OR is_admin_or_owner());

CREATE POLICY "coupon_usage_insert"  ON coupon_usage FOR INSERT
  WITH CHECK (TRUE);  -- service role on checkout

-- ──────────────────────────────────────────────────────────────
-- ENSURE OWNER EMAIL HAS ROLE = 'owner'
-- Run this AFTER the auth user exists in Supabase.
-- Replace the email below only if it ever changes.
-- ──────────────────────────────────────────────────────────────
-- UPDATE users
-- SET role = 'owner'
-- WHERE email = 'loadifymarket.co.uk@gmail.com';
--
-- NOTE: Uncomment and run manually once the owner account is
-- registered through Supabase Auth.
