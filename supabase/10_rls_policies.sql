-- ================================================================
-- 10_rls_policies.sql
-- Loadify Market — Helper Functions + Row Level Security
-- ================================================================
-- Run this AFTER all other migration files (01-09).
--
-- NAMING CONVENTION:
--   Most tables: camelCase quoted identifiers ("sellerId", "isActive").
--   EXCEPTION: shipments & shipment_events use snake_case
--   (seller_id, buyer_id, shipment_id) to match Netlify functions.
--
-- Owner email: loadifymarket.co.uk@gmail.com
-- Owner role:  'owner' in users.role
-- ================================================================

-- ── HELPER FUNCTIONS ─────────────────────────────────────────────
-- Use LANGUAGE plpgsql (not sql) so table references are validated
-- at call time, not at function creation time.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column_snake()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('admin','owner')
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'owner'
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('seller','admin','owner')
      AND "isActive" = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── ENABLE RLS ───────────────────────────────────────────────────
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_stores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed         ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists               ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_quotes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_listings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoted_listings       ENABLE ROW LEVEL SECURITY;

-- ── USERS ────────────────────────────────────────────────────────
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() = id OR is_admin_or_owner());
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = id OR is_admin_or_owner());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "users_delete" ON users FOR DELETE USING (is_admin_or_owner());

-- ── BUYER PROFILES ───────────────────────────────────────────────
CREATE POLICY "buyer_profiles_all" ON buyer_profiles FOR ALL
  USING (auth.uid() = "userId" OR is_admin_or_owner())
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

-- ── SELLER PROFILES ──────────────────────────────────────────────
CREATE POLICY "seller_profiles_select" ON seller_profiles FOR SELECT USING (TRUE);
CREATE POLICY "seller_profiles_update" ON seller_profiles FOR UPDATE
  USING (auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "seller_profiles_insert" ON seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "seller_profiles_delete" ON seller_profiles FOR DELETE USING (is_admin_or_owner());

-- ── SELLER STORES ────────────────────────────────────────────────
CREATE POLICY "seller_stores_select" ON seller_stores FOR SELECT
  USING ("isActive" = TRUE OR auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "seller_stores_manage" ON seller_stores FOR ALL
  USING (auth.uid() = "userId" OR is_admin_or_owner())
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

-- ── SELLER VERIFICATIONS ─────────────────────────────────────────
CREATE POLICY "seller_verifications_select" ON seller_verifications FOR SELECT
  USING (auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "seller_verifications_insert" ON seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "seller_verifications_update" ON seller_verifications FOR UPDATE
  USING (is_admin_or_owner());

-- ── CATEGORIES ───────────────────────────────────────────────────
CREATE POLICY "categories_select" ON categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_manage" ON categories FOR ALL
  USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ── PRODUCTS ─────────────────────────────────────────────────────
-- (select auth.uid()) is used instead of bare auth.uid() so the planner
-- treats it as a stable InitPlan — evaluated once per query, not per row.
CREATE POLICY "products_select" ON products FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (select auth.uid()) = "sellerId"
    OR is_admin_or_owner()
  );
CREATE POLICY "products_insert" ON products FOR INSERT
  WITH CHECK ((select auth.uid()) = "sellerId" AND is_seller());
CREATE POLICY "products_update" ON products FOR UPDATE
  USING ((select auth.uid()) = "sellerId" OR is_admin_or_owner());
CREATE POLICY "products_delete" ON products FOR DELETE
  USING ((select auth.uid()) = "sellerId" OR is_admin_or_owner());

-- ── PRODUCT ANALYTICS ────────────────────────────────────────────
CREATE POLICY "product_analytics_select" ON product_analytics FOR SELECT USING (TRUE);
CREATE POLICY "product_analytics_write"  ON product_analytics FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ── RECENTLY VIEWED ──────────────────────────────────────────────
CREATE POLICY "recently_viewed_select" ON recently_viewed FOR SELECT
  USING (auth.uid() = "userId" OR "sessionId" IS NOT NULL);
CREATE POLICY "recently_viewed_insert" ON recently_viewed FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "recently_viewed_delete" ON recently_viewed FOR DELETE
  USING (auth.uid() = "userId");

-- ── FEATURED LISTINGS ────────────────────────────────────────────
CREATE POLICY "featured_listings_select" ON featured_listings FOR SELECT
  USING ("isActive" = TRUE OR is_admin_or_owner());
CREATE POLICY "featured_listings_manage" ON featured_listings FOR ALL
  USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ── BANNERS ──────────────────────────────────────────────────────
CREATE POLICY "banners_select" ON banners FOR SELECT
  USING ("isActive" = TRUE OR is_admin_or_owner());
CREATE POLICY "banners_manage" ON banners FOR ALL
  USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ── WISHLISTS ────────────────────────────────────────────────────
CREATE POLICY "wishlists_all" ON wishlists FOR ALL
  USING (auth.uid() = "userId" OR is_admin_or_owner())
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

-- ── SAVED SEARCHES ───────────────────────────────────────────────
CREATE POLICY "saved_searches_all" ON saved_searches FOR ALL
  USING (auth.uid() = "userId" OR is_admin_or_owner())
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

-- ── NOTIFICATIONS ────────────────────────────────────────────────
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (auth.uid() = "userId");
CREATE POLICY "notifications_delete" ON notifications FOR DELETE
  USING (auth.uid() = "userId" OR is_admin_or_owner());

-- ── NOTIFICATION SETTINGS ────────────────────────────────────────
CREATE POLICY "notification_settings_all" ON notification_settings FOR ALL
  USING (auth.uid() = "userId" OR is_admin_or_owner())
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

-- ── PRODUCT QUESTIONS ────────────────────────────────────────────
CREATE POLICY "product_questions_select" ON product_questions FOR SELECT USING (TRUE);
CREATE POLICY "product_questions_insert" ON product_questions FOR INSERT
  WITH CHECK (auth.uid() = "userId");
CREATE POLICY "product_questions_update" ON product_questions FOR UPDATE
  USING (auth.uid() = "userId"
    OR EXISTS (SELECT 1 FROM products p WHERE p.id = "productId" AND p."sellerId" = auth.uid())
    OR is_admin_or_owner());
CREATE POLICY "product_questions_delete" ON product_questions FOR DELETE
  USING (auth.uid() = "userId" OR is_admin_or_owner());

-- ── PRODUCT OFFERS ───────────────────────────────────────────────
CREATE POLICY "product_offers_select" ON product_offers FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "product_offers_insert" ON product_offers FOR INSERT
  WITH CHECK (auth.uid() = "buyerId");
CREATE POLICY "product_offers_update" ON product_offers FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());

-- ── CARTS ────────────────────────────────────────────────────────
CREATE POLICY "carts_own" ON carts FOR ALL
  USING (auth.uid() = "userId" OR is_admin_or_owner())
  WITH CHECK (auth.uid() = "userId" OR is_admin_or_owner());

-- ── CART ITEMS ───────────────────────────────────────────────────
CREATE POLICY "cart_items_own" ON cart_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = "cartId" AND c."userId" = auth.uid())
    OR is_admin_or_owner()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM carts c WHERE c.id = "cartId" AND c."userId" = auth.uid())
    OR is_admin_or_owner()
  );

-- ── ORDERS ───────────────────────────────────────────────────────
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (auth.uid() = "buyerId" OR is_admin_or_owner());
CREATE POLICY "orders_update" ON orders FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "orders_delete" ON orders FOR DELETE USING (is_admin_or_owner());

-- ── ORDER ITEMS ──────────────────────────────────────────────────
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders o
            WHERE o.id = "orderId"
              AND (o."buyerId" = auth.uid() OR o."sellerId" = auth.uid()))
    OR is_admin_or_owner()
  );
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (TRUE);

-- ── PAYMENT SESSIONS ─────────────────────────────────────────────
CREATE POLICY "payment_sessions_select" ON payment_sessions FOR SELECT
  USING (auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "payment_sessions_write"  ON payment_sessions FOR ALL
  USING (TRUE) WITH CHECK (TRUE);

-- ── PAYOUTS ──────────────────────────────────────────────────────
CREATE POLICY "payouts_seller_select" ON payouts FOR SELECT
  USING (auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "payouts_admin_manage"  ON payouts FOR ALL
  USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ── COUPONS ──────────────────────────────────────────────────────
CREATE POLICY "coupons_select" ON coupons FOR SELECT
  USING ("isActive" = TRUE OR auth.uid() = "createdBy" OR is_admin_or_owner());
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (is_seller());
CREATE POLICY "coupons_update" ON coupons FOR UPDATE
  USING (auth.uid() = "createdBy" OR is_admin_or_owner());
CREATE POLICY "coupons_delete" ON coupons FOR DELETE
  USING (auth.uid() = "createdBy" OR is_admin_or_owner());

-- ── COUPON USAGE ─────────────────────────────────────────────────
CREATE POLICY "coupon_usage_select" ON coupon_usage FOR SELECT
  USING (auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "coupon_usage_insert" ON coupon_usage FOR INSERT WITH CHECK (TRUE);

-- ── REVIEWS ──────────────────────────────────────────────────────
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  USING (status = 'published' OR auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "reviews_insert" ON reviews FOR INSERT
  WITH CHECK (auth.uid() = "userId");
CREATE POLICY "reviews_update" ON reviews FOR UPDATE
  USING (auth.uid() = "userId"
    OR EXISTS (SELECT 1 FROM products p WHERE p.id = "productId" AND p."sellerId" = auth.uid())
    OR is_admin_or_owner());
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (is_admin_or_owner());

-- ── RETURNS ──────────────────────────────────────────────────────
CREATE POLICY "returns_select" ON returns FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "returns_insert" ON returns FOR INSERT
  WITH CHECK (auth.uid() = "buyerId");
CREATE POLICY "returns_update" ON returns FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());

-- ── DISPUTES ─────────────────────────────────────────────────────
CREATE POLICY "disputes_select" ON disputes FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "disputes_insert" ON disputes FOR INSERT
  WITH CHECK (auth.uid() = "buyerId");
CREATE POLICY "disputes_update" ON disputes FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());

-- ── DISPUTE MESSAGES ─────────────────────────────────────────────
CREATE POLICY "dispute_messages_select" ON dispute_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM disputes d
            WHERE d.id = "disputeId"
              AND (d."buyerId" = auth.uid() OR d."sellerId" = auth.uid()))
    OR is_admin_or_owner()
  );
CREATE POLICY "dispute_messages_insert" ON dispute_messages FOR INSERT
  WITH CHECK (
    auth.uid() = "userId" AND (
      EXISTS (SELECT 1 FROM disputes d
              WHERE d.id = "disputeId"
                AND (d."buyerId" = auth.uid() OR d."sellerId" = auth.uid()))
      OR is_admin_or_owner()
    )
  );

-- ── CONVERSATIONS ────────────────────────────────────────────────
CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (auth.uid() = "user1Id" OR auth.uid() = "user2Id" OR is_admin_or_owner());
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = "user1Id" OR auth.uid() = "user2Id");
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (auth.uid() = "user1Id" OR auth.uid() = "user2Id" OR is_admin_or_owner());

-- ── MESSAGES ─────────────────────────────────────────────────────
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (auth.uid() = "senderId" OR auth.uid() = "receiverId" OR is_admin_or_owner());
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (auth.uid() = "senderId");
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (auth.uid() = "receiverId" OR is_admin_or_owner());

-- ── DELIVERY REQUESTS ────────────────────────────────────────────
CREATE POLICY "delivery_requests_select" ON delivery_requests FOR SELECT
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "delivery_requests_insert" ON delivery_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "delivery_requests_update" ON delivery_requests FOR UPDATE
  USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR is_admin_or_owner());

-- ── TRANSPORT QUOTES ─────────────────────────────────────────────
CREATE POLICY "transport_quotes_select" ON transport_quotes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM delivery_requests dr
            WHERE dr.id = "deliveryRequestId"
              AND (dr."buyerId" = auth.uid() OR dr."sellerId" = auth.uid()))
    OR auth.uid() = "carrierId"
    OR is_admin_or_owner()
  );
CREATE POLICY "transport_quotes_insert" ON transport_quotes FOR INSERT
  WITH CHECK (auth.uid() = "carrierId" OR is_admin_or_owner());
CREATE POLICY "transport_quotes_update" ON transport_quotes FOR UPDATE
  USING (auth.uid() = "carrierId" OR is_admin_or_owner());

-- ── SHIPMENTS — snake_case column names ──────────────────────────
-- NOTE: shipments & shipment_events use snake_case because they are
-- written by Netlify serverless functions, not the React frontend.
-- All other RLS policies in this file use camelCase quoted identifiers.
CREATE POLICY "shipments_select" ON shipments FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR is_admin_or_owner());
CREATE POLICY "shipments_insert" ON shipments FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR is_admin_or_owner());
CREATE POLICY "shipments_update" ON shipments FOR UPDATE
  USING (auth.uid() = seller_id OR is_admin_or_owner());

-- ── SHIPMENT EVENTS — snake_case column names ────────────────────
-- NOTE: snake_case to match Netlify serverless functions (see above).
CREATE POLICY "shipment_events_select" ON shipment_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM shipments s
            WHERE s.id = shipment_id
              AND (s.buyer_id = auth.uid() OR s.seller_id = auth.uid()))
    OR is_admin_or_owner()
  );
CREATE POLICY "shipment_events_insert" ON shipment_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM shipments s
            WHERE s.id = shipment_id AND s.seller_id = auth.uid())
    OR is_admin_or_owner()
  );

-- ── RFQ REQUESTS ─────────────────────────────────────────────────
CREATE POLICY "rfq_requests_insert" ON rfq_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "rfq_requests_select" ON rfq_requests FOR SELECT
  USING (auth.uid() = "buyerId" OR is_seller() OR is_admin_or_owner());
CREATE POLICY "rfq_requests_update" ON rfq_requests FOR UPDATE
  USING (is_seller() OR is_admin_or_owner());

-- ── RFQ RESPONSES ────────────────────────────────────────────────
CREATE POLICY "rfq_responses_select" ON rfq_responses FOR SELECT
  USING (
    auth.uid() = "sellerId"
    OR EXISTS (SELECT 1 FROM rfq_requests r WHERE r.id = "rfqId" AND r."buyerId" = auth.uid())
    OR is_admin_or_owner()
  );
CREATE POLICY "rfq_responses_insert" ON rfq_responses FOR INSERT
  WITH CHECK (auth.uid() = "sellerId" AND is_seller());
CREATE POLICY "rfq_responses_update" ON rfq_responses FOR UPDATE
  USING (auth.uid() = "sellerId" OR is_admin_or_owner());

-- ── REPORTED LISTINGS ────────────────────────────────────────────
CREATE POLICY "reported_listings_select" ON reported_listings FOR SELECT
  USING (auth.uid() = "reportedBy" OR is_admin_or_owner());
CREATE POLICY "reported_listings_insert" ON reported_listings FOR INSERT
  WITH CHECK (auth.uid() = "reportedBy");
CREATE POLICY "reported_listings_update" ON reported_listings FOR UPDATE
  USING (is_admin_or_owner());

-- ── ADMIN ACTIONS ────────────────────────────────────────────────
CREATE POLICY "admin_actions_select" ON admin_actions FOR SELECT USING (is_admin_or_owner());
CREATE POLICY "admin_actions_insert" ON admin_actions FOR INSERT WITH CHECK (is_admin_or_owner());

-- ── AUDIT LOGS ───────────────────────────────────────────────────
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (is_admin_or_owner());

-- ── SUPPORT TICKETS ──────────────────────────────────────────────
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT
  USING (auth.uid() = "userId" OR is_admin_or_owner());
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE
  USING (auth.uid() = "userId" OR is_admin_or_owner());

-- ── SUPPORT TICKET MESSAGES ──────────────────────────────────────
CREATE POLICY "ticket_messages_select" ON support_ticket_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM support_tickets t
            WHERE t.id = "ticketId"
              AND (t."userId" = auth.uid() OR is_admin_or_owner()))
  );
CREATE POLICY "ticket_messages_insert" ON support_ticket_messages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM support_tickets t
            WHERE t.id = "ticketId"
              AND (t."userId" = auth.uid() OR is_admin_or_owner()))
  );

-- ── PLATFORM SETTINGS ────────────────────────────────────────────
CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT USING (TRUE);
CREATE POLICY "platform_settings_manage" ON platform_settings FOR ALL
  USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ── PROMOTED LISTINGS ────────────────────────────────────────────
CREATE POLICY "promoted_listings_select" ON promoted_listings FOR SELECT
  USING (status = 'active' OR auth.uid() = "sellerId" OR is_admin_or_owner());
CREATE POLICY "promoted_listings_insert" ON promoted_listings FOR INSERT
  WITH CHECK (auth.uid() = "sellerId");
CREATE POLICY "promoted_listings_update" ON promoted_listings FOR UPDATE
  USING (auth.uid() = "sellerId" OR is_admin_or_owner());

-- ── SEED: CATEGORIES ─────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, "order", "isActive") VALUES
  (uuid_generate_v4(), 'Mixed Job Lots',      'mixed-job-lots',     'Assorted mixed pallet lots',                1,  TRUE),
  (uuid_generate_v4(), 'Clothing',            'clothing',           'Men''s, women''s and children''s clothing', 2,  TRUE),
  (uuid_generate_v4(), 'Shoes',               'shoes',              'Footwear of all types',                     3,  TRUE),
  (uuid_generate_v4(), 'Jewellery',           'jewellery',          'Fashion and fine jewellery',                4,  TRUE),
  (uuid_generate_v4(), 'Media & Electronics', 'media-electronics',  'Consumer electronics and media',            5,  TRUE),
  (uuid_generate_v4(), 'Accessories',         'accessories',        'Fashion and lifestyle accessories',         6,  TRUE),
  (uuid_generate_v4(), 'Toys',                'toys',               'Children''s toys and games',                7,  TRUE),
  (uuid_generate_v4(), 'Health & Beauty',     'health-beauty',      'Personal care and health products',         8,  TRUE),
  (uuid_generate_v4(), 'Pets',                'pets',               'Pet food, supplies and accessories',        9,  TRUE),
  (uuid_generate_v4(), 'Memorabilia',         'memorabilia',        'Sports and entertainment memorabilia',      10, TRUE),
  (uuid_generate_v4(), 'Food & Drink',        'food-drink',         'Food, beverages and consumables',           11, TRUE),
  (uuid_generate_v4(), 'Office Supplies',     'office-supplies',    'Stationery and office equipment',           12, TRUE),
  (uuid_generate_v4(), 'Home & Garden',       'home-garden',        'Furniture, decor and garden',               13, TRUE),
  (uuid_generate_v4(), 'Wholesale Pallets',   'wholesale-pallets',  'Full and part pallets for resale',          14, TRUE),
  (uuid_generate_v4(), 'Logistics Jobs',      'logistics-jobs',     'Transport and haulage listings',            15, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ── OWNER SETUP ──────────────────────────────────────────────────
-- Run this AFTER the owner has registered via Supabase Auth signup:
--
-- UPDATE users
-- SET role = 'owner'
-- WHERE email = 'loadifymarket.co.uk@gmail.com';
--
-- Verify: SELECT id, email, role FROM users
--         WHERE email = 'loadifymarket.co.uk@gmail.com';
