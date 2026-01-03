-- Database Enhancements for Loadify Market
-- Adds support for Product Q&A, Saved Searches, Notifications, and other competitive features
-- Run this after database-complete.sql

-- Order Items table (for tracking multiple items per order)
-- This extends the existing orders table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  "pricePerUnit" DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Questions & Answers table
CREATE TABLE IF NOT EXISTS product_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userName" TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  "answerUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "answerUserName" TEXT,
  upvotes INTEGER DEFAULT 0,
  "isAnswered" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "answeredAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "searchQuery" TEXT NOT NULL,
  filters JSONB,
  "emailNotifications" BOOLEAN DEFAULT TRUE,
  "notificationFrequency" TEXT DEFAULT 'daily' CHECK ("notificationFrequency" IN ('instant', 'daily', 'weekly')),
  "lastNotified" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order', 'product_question', 'message', 'review', 'shipment', 'return', 'dispute', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recently Viewed Products table
CREATE TABLE IF NOT EXISTS recently_viewed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
  "sessionId" TEXT, -- For guest users
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "viewedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("userId", "productId"),
  UNIQUE("sessionId", "productId")
);

-- Product Offers (Make an Offer feature)
CREATE TABLE IF NOT EXISTS product_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "offerPrice" DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired')),
  "counterPrice" DECIMAL(10,2),
  "counterMessage" TEXT,
  "expiresAt" TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trending Products tracking
CREATE TABLE IF NOT EXISTS product_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  "addToCartCount" INTEGER DEFAULT 0,
  "purchaseCount" INTEGER DEFAULT 0,
  "uniqueVisitors" INTEGER DEFAULT 0,
  UNIQUE("productId", date)
);

-- Alter reviews table to add verified purchase
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "isVerifiedPurchase" BOOLEAN DEFAULT FALSE;

-- Alter seller_profiles to add performance metrics
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "responseTimeHours" DECIMAL(5,2) DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "onTimeShipmentRate" DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT FALSE;

-- Alter products to track trending metrics
ALTER TABLE products ADD COLUMN IF NOT EXISTS "addToCartCount" INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_questions_product ON product_questions("productId");
CREATE INDEX IF NOT EXISTS idx_product_questions_user ON product_questions("userId");
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications("userId", "isRead") WHERE "isRead" = FALSE;
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed("userId", "viewedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_session ON recently_viewed("sessionId", "viewedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_product_offers_product ON product_offers("productId");
CREATE INDEX IF NOT EXISTS idx_product_offers_buyer ON product_offers("buyerId");
CREATE INDEX IF NOT EXISTS idx_product_offers_seller ON product_offers("sellerId");
CREATE INDEX IF NOT EXISTS idx_product_analytics_date ON product_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_products_trending ON products("addToCartCount" DESC, views DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items("orderId");
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items("productId");

-- Row Level Security Policies

-- Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    "orderId" IN (
      SELECT id FROM orders WHERE "buyerId" = auth.uid() OR "sellerId" = auth.uid()
    )
  );

-- Product Questions
ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product questions are viewable by everyone" ON product_questions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create questions" ON product_questions
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Sellers can answer questions on their products" ON product_questions
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT "sellerId" FROM products WHERE id = "productId"
    )
  );

-- Saved Searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = "userId");

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = "userId");

-- Recently Viewed
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recently viewed" ON recently_viewed
  FOR SELECT USING (auth.uid() = "userId" OR "sessionId" IS NOT NULL);

CREATE POLICY "Anyone can insert recently viewed" ON recently_viewed
  FOR INSERT WITH CHECK (true);

-- Product Offers
ALTER TABLE product_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own offers" ON product_offers
  FOR SELECT USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId");

CREATE POLICY "Buyers can create offers" ON product_offers
  FOR INSERT WITH CHECK (auth.uid() = "buyerId");

CREATE POLICY "Sellers can update offers on their products" ON product_offers
  FOR UPDATE USING (auth.uid() = "sellerId");

-- Product Analytics (admin only)
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product analytics viewable by everyone" ON product_analytics
  FOR SELECT USING (true);

-- Functions

-- Function to automatically mark offer as expired
CREATE OR REPLACE FUNCTION check_expired_offers()
RETURNS void AS $$
BEGIN
  UPDATE product_offers
  SET status = 'expired'
  WHERE status = 'pending' AND "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to track product views
CREATE OR REPLACE FUNCTION track_product_view(p_product_id UUID, p_user_id UUID DEFAULT NULL, p_session_id TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Increment product views
  UPDATE products SET views = COALESCE(views, 0) + 1, "lastViewedAt" = NOW()
  WHERE id = p_product_id;
  
  -- Track in recently viewed
  IF p_user_id IS NOT NULL THEN
    INSERT INTO recently_viewed ("userId", "productId", "viewedAt")
    VALUES (p_user_id, p_product_id, NOW())
    ON CONFLICT ("userId", "productId") DO UPDATE SET "viewedAt" = NOW();
  ELSIF p_session_id IS NOT NULL THEN
    INSERT INTO recently_viewed ("sessionId", "productId", "viewedAt")
    VALUES (p_session_id, p_product_id, NOW())
    ON CONFLICT ("sessionId", "productId") DO UPDATE SET "viewedAt" = NOW();
  END IF;
  
  -- Update daily analytics
  INSERT INTO product_analytics ("productId", date, views, "uniqueVisitors")
  VALUES (p_product_id, CURRENT_DATE, 1, 1)
  ON CONFLICT ("productId", date) DO UPDATE SET
    views = product_analytics.views + 1,
    "uniqueVisitors" = product_analytics."uniqueVisitors" + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to track add to cart
CREATE OR REPLACE FUNCTION track_add_to_cart(p_product_id UUID)
RETURNS void AS $$
BEGIN
  -- Increment product add to cart count
  UPDATE products SET "addToCartCount" = COALESCE("addToCartCount", 0) + 1
  WHERE id = p_product_id;
  
  -- Update daily analytics
  INSERT INTO product_analytics ("productId", date, "addToCartCount")
  VALUES (p_product_id, CURRENT_DATE, 1)
  ON CONFLICT ("productId", date) DO UPDATE SET
    "addToCartCount" = product_analytics."addToCartCount" + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to mark review as verified purchase
CREATE OR REPLACE FUNCTION mark_verified_purchase_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has purchased this product
  IF EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON o.id = oi."orderId"
    WHERE o."buyerId" = NEW."userId"
    AND oi."productId" = NEW."productId"
    AND o.status IN ('delivered', 'completed')
  ) THEN
    NEW."isVerifiedPurchase" = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verify_purchase_on_review_insert
BEFORE INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION mark_verified_purchase_reviews();

-- Trigger for updating timestamps
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON saved_searches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_offers_updated_at
BEFORE UPDATE ON product_offers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE product_questions IS 'Stores customer questions and seller answers for products';
COMMENT ON TABLE saved_searches IS 'Allows users to save searches and get notifications for new matches';
COMMENT ON TABLE notifications IS 'In-app notification system for users';
COMMENT ON TABLE recently_viewed IS 'Tracks recently viewed products for personalization';
COMMENT ON TABLE product_offers IS 'Enable Make an Offer feature for negotiable pricing';
COMMENT ON TABLE product_analytics IS 'Daily aggregated analytics for products';
