-- Additional tables for Loadify Market
-- Run this after database-schema.sql to add missing entities

-- Messages table for buyer-seller communication
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversationId" UUID NOT NULL,
  "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "receiverId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId" UUID REFERENCES products(id) ON DELETE SET NULL,
  "orderId" UUID REFERENCES orders(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation tracking
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user1Id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "user2Id" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId" UUID REFERENCES products(id) ON DELETE SET NULL,
  "lastMessageAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user1Id", "user2Id", "productId")
);

-- Cart table for persistent shopping carts
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
  "sessionId" TEXT, -- For guest users
  items JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("userId"),
  UNIQUE("sessionId")
);

-- Payment sessions table for tracking checkout sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "stripeSessionId" TEXT UNIQUE NOT NULL,
  "orderId" UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store information for sellers
CREATE TABLE IF NOT EXISTS seller_stores (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "storeName" TEXT,
  "storeSlug" TEXT UNIQUE,
  "storeLogo" TEXT,
  "storeDescription" TEXT,
  "storeBanner" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin reported listings
CREATE TABLE IF NOT EXISTS reported_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "reportedBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  "reviewedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages("receiverId");
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations("user1Id", "user2Id");
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts("userId");
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts("sessionId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_stripe ON payment_sessions("stripeSessionId");
CREATE INDEX IF NOT EXISTS idx_payment_sessions_order ON payment_sessions("orderId");
CREATE INDEX IF NOT EXISTS idx_reported_listings_product ON reported_listings("productId");
CREATE INDEX IF NOT EXISTS idx_reported_listings_status ON reported_listings(status);

-- Row Level Security (RLS) Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_listings ENABLE ROW LEVEL SECURITY;

-- Messages: Users can view their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = "senderId" OR auth.uid() = "receiverId");

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = "senderId");

-- Conversations: Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = "user1Id" OR auth.uid() = "user2Id");

-- Carts: Users can manage their own cart
CREATE POLICY "Users can manage own cart" ON carts
  FOR ALL USING (auth.uid() = "userId");

-- Payment sessions: Users can view their own sessions
CREATE POLICY "Users can view own payment sessions" ON payment_sessions
  FOR SELECT USING (auth.uid() = "userId");

-- Seller stores: Public can view active stores
CREATE POLICY "Stores are viewable by everyone" ON seller_stores
  FOR SELECT USING ("isActive" = true);

CREATE POLICY "Sellers can manage own store" ON seller_stores
  FOR ALL USING (auth.uid() = "userId");

-- Reported listings: Admins and reporters can view
CREATE POLICY "Users can view own reports" ON reported_listings
  FOR SELECT USING (auth.uid() = "reportedBy" OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can create reports" ON reported_listings
  FOR INSERT WITH CHECK (auth.uid() = "reportedBy");

-- Triggers for updated_at
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_sessions_updated_at BEFORE UPDATE ON payment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_stores_updated_at BEFORE UPDATE ON seller_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reported_listings_updated_at BEFORE UPDATE ON reported_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
