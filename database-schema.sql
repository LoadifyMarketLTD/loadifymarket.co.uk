-- Loadify Market Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('guest', 'buyer', 'seller', 'admin')),
  "firstName" TEXT,
  "lastName" TEXT,
  phone TEXT,
  "avatarUrl" TEXT,
  "isEmailVerified" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buyer profiles
CREATE TABLE buyer_profiles (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "shippingAddress" JSONB,
  "billingAddress" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller profiles
CREATE TABLE seller_profiles (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "businessName" TEXT,
  "vatNumber" TEXT,
  "stripeAccountId" TEXT,
  "isApproved" BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  "totalSales" INTEGER DEFAULT 0,
  commission DECIMAL(5,2) DEFAULT 7.00,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  "parentId" UUID REFERENCES categories(id) ON DELETE SET NULL,
  "imageUrl" TEXT,
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('product', 'pallet', 'lot', 'clearance')),
  condition TEXT NOT NULL CHECK (condition IN ('new', 'used', 'refurbished')),
  "categoryId" UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  "subcategoryId" UUID REFERENCES categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2) NOT NULL,
  "priceExVat" DECIMAL(10,2),
  "vatRate" DECIMAL(5,2) DEFAULT 0.20,
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "stockStatus" TEXT DEFAULT 'in_stock' CHECK ("stockStatus" IN ('in_stock', 'low_stock', 'out_of_stock', 'clearance')),
  images TEXT[] DEFAULT '{}',
  specifications JSONB,
  weight DECIMAL(10,2),
  dimensions JSONB,
  "palletInfo" JSONB,
  "isActive" BOOLEAN DEFAULT TRUE,
  "isApproved" BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  "reviewCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderNumber" TEXT UNIQUE NOT NULL,
  "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  "vatAmount" DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  "shippingAddress" JSONB NOT NULL,
  "billingAddress" JSONB NOT NULL,
  "trackingNumber" TEXT,
  "deliveryMethod" TEXT NOT NULL CHECK ("deliveryMethod" IN ('pickup', 'delivery')),
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "invoiceUrl" TEXT,
  "proofOfDelivery" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  "isVerifiedPurchase" BOOLEAN DEFAULT TRUE,
  "sellerRating" INTEGER CHECK ("sellerRating" >= 1 AND "sellerRating" <= 5),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("orderId", "userId")
);

-- Returns
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other')),
  description TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  "refundAmount" DECIMAL(10,2),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "buyerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  resolution TEXT,
  "refundAmount" DECIMAL(10,2),
  "resolvedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sellerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  "stripePayoutId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "paidAt" TIMESTAMP WITH TIME ZONE
);

-- Wishlists
CREATE TABLE wishlists (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "productIds" UUID[] DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_seller ON products("sellerId");
CREATE INDEX idx_products_category ON products("categoryId");
CREATE INDEX idx_products_active ON products("isActive", "isApproved");
CREATE INDEX idx_orders_buyer ON orders("buyerId");
CREATE INDEX idx_orders_seller ON orders("sellerId");
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_reviews_product ON reviews("productId");
CREATE INDEX idx_returns_order ON returns("orderId");
CREATE INDEX idx_disputes_order ON disputes("orderId");

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Products are public for reading
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Sellers can insert products" ON products
  FOR INSERT WITH CHECK (auth.uid() = "sellerId");

CREATE POLICY "Sellers can update own products" ON products
  FOR UPDATE USING (auth.uid() = "sellerId");

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId");

-- Reviews are public
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Buyers can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = "userId");

-- Returns and Disputes
CREATE POLICY "Users can view own returns" ON returns
  FOR SELECT USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId");

CREATE POLICY "Buyers can create returns" ON returns
  FOR INSERT WITH CHECK (auth.uid() = "buyerId");

CREATE POLICY "Users can view own disputes" ON disputes
  FOR SELECT USING (auth.uid() = "buyerId" OR auth.uid() = "sellerId");

CREATE POLICY "Buyers can create disputes" ON disputes
  FOR INSERT WITH CHECK (auth.uid() = "buyerId");

-- Wishlists
CREATE POLICY "Users can manage own wishlist" ON wishlists
  FOR ALL USING (auth.uid() = "userId");

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
