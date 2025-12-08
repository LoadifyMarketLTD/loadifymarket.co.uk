-- Loadify Market - Test Data Seed
-- Run this after database-schema.sql and database-seed-categories.sql
-- Creates test users, sellers, and sample products for development

-- Note: In production, users are created through Supabase Auth
-- This seed creates corresponding user profile records

-- Test User 1 (Buyer)
INSERT INTO users (id, email, role, "firstName", "lastName", phone, "isEmailVerified", "createdAt")
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'buyer@test.com', 'buyer', 'John', 'Smith', '+44 7700 900001', true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO buyer_profiles ("userId", "shippingAddress", "billingAddress", "createdAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '{"line1": "10 Test Street", "city": "London", "postcode": "SW1A 1AA", "country": "United Kingdom"}',
  '{"line1": "10 Test Street", "city": "London", "postcode": "SW1A 1AA", "country": "United Kingdom"}',
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Test User 2 (Seller)
INSERT INTO users (id, email, role, "firstName", "lastName", phone, "isEmailVerified", "createdAt")
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'seller@test.com', 'seller', 'Jane', 'Doe', '+44 7700 900002', true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO seller_profiles (
  "userId", 
  "businessName", 
  "vatNumber", 
  "isApproved", 
  rating, 
  "totalSales", 
  commission,
  "createdAt"
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Jane''s Wholesale Emporium',
  'GB123456789',
  true,
  4.8,
  156,
  7.00,
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO seller_stores (
  "userId",
  "storeName",
  "storeSlug",
  "storeDescription",
  "isActive",
  "createdAt"
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Jane''s Wholesale Emporium',
  'janes-wholesale',
  'Quality wholesale products at competitive prices. Specializing in electronics, clothing, and mixed lots.',
  true,
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Admin User
INSERT INTO users (id, email, role, "firstName", "lastName", "isEmailVerified", "createdAt")
VALUES 
  ('99999999-9999-9999-9999-999999999999', 'admin@loadifymarket.co.uk', 'admin', 'Admin', 'User', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Sample Products

-- Product 1: Electronics Pallet
INSERT INTO products (
  id,
  "sellerId",
  title,
  description,
  type,
  condition,
  "categoryId",
  price,
  "priceExVat",
  "vatRate",
  "stockQuantity",
  "stockStatus",
  images,
  weight,
  "palletInfo",
  "isActive",
  "isApproved",
  views,
  rating,
  "reviewCount",
  "createdAt"
)
VALUES (
  'prod-11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Mixed Electronics Pallet - Grade A Returns',
  'High-quality electronics pallet containing a mix of returned items from major retailers. All items are tested and working. Includes smartphones, tablets, headphones, and small electronics. Perfect for resellers looking for quality stock at wholesale prices.',
  'pallet',
  'used',
  'cat-electronics',
  1200.00,
  1000.00,
  0.20,
  5,
  'in_stock',
  ARRAY['https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
  500.0,
  '{"palletCount": 1, "itemsPerPallet": 50, "palletType": "Standard 1200x1000mm"}',
  true,
  true,
  245,
  4.5,
  12,
  NOW() - INTERVAL '15 days'
)
ON CONFLICT (id) DO NOTHING;

-- Product 2: Clothing Job Lot
INSERT INTO products (
  id,
  "sellerId",
  title,
  description,
  type,
  condition,
  "categoryId",
  "subcategoryId",
  price,
  "priceExVat",
  "vatRate",
  "stockQuantity",
  "stockStatus",
  images,
  weight,
  "isActive",
  "isApproved",
  views,
  rating,
  "reviewCount",
  "createdAt"
)
VALUES (
  'prod-22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  'Men''s Designer Clothing Mixed Lot - 100 Pieces',
  'Excellent mixed lot of men''s designer clothing including shirts, t-shirts, jeans, and jackets. All branded items from well-known high street brands. Sizes range from S to XXL. Perfect for boutique stores or online retailers.',
  'lot',
  'new',
  'cat-clothing',
  'cat-clothing-mens',
  850.00,
  708.33,
  0.20,
  3,
  'low_stock',
  ARRAY['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800'],
  45.0,
  true,
  true,
  178,
  4.7,
  8,
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- Product 3: Single Product - Smartphone
INSERT INTO products (
  id,
  "sellerId",
  title,
  description,
  type,
  condition,
  "categoryId",
  "subcategoryId",
  price,
  "priceExVat",
  "vatRate",
  "stockQuantity",
  "stockStatus",
  images,
  specifications,
  weight,
  dimensions,
  "isActive",
  "isApproved",
  views,
  rating,
  "reviewCount",
  "createdAt"
)
VALUES (
  'prod-33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Refurbished iPhone 13 - 128GB - Unlocked',
  'Professionally refurbished iPhone 13 in excellent condition. Fully tested and certified. Comes with 12-month warranty. Unlocked for all networks. Grade A cosmetic condition with minimal signs of use.',
  'product',
  'refurbished',
  'cat-electronics',
  'cat-electronics-phones',
  449.99,
  374.99,
  0.20,
  12,
  'in_stock',
  ARRAY['https://images.unsplash.com/photo-1592286927505-2c7e370d2a3e?w=800'],
  '{"Brand": "Apple", "Model": "iPhone 13", "Storage": "128GB", "Color": "Midnight", "Condition": "Grade A", "Warranty": "12 months"}',
  0.174,
  '{"length": 14.67, "width": 7.15, "height": 0.765}',
  true,
  true,
  532,
  4.9,
  23,
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- Product 4: Clearance Toys Pallet
INSERT INTO products (
  id,
  "sellerId",
  title,
  description,
  type,
  condition,
  "categoryId",
  price,
  "priceExVat",
  "vatRate",
  "stockQuantity",
  "stockStatus",
  images,
  weight,
  "palletInfo",
  "isActive",
  "isApproved",
  views,
  rating,
  "reviewCount",
  "createdAt"
)
VALUES (
  'prod-44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'CLEARANCE: Mixed Toys Pallet - End of Line Stock',
  'Clearance pallet of mixed toys from major retailers. End of line and overstocked items. Includes action figures, board games, puzzles, and educational toys. Great for discount stores and market traders. Selling as seen - contents may vary.',
  'clearance',
  'new',
  'cat-toys',
  399.99,
  333.33,
  0.20,
  8,
  'in_stock',
  ARRAY['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800'],
  350.0,
  '{"palletCount": 1, "itemsPerPallet": 200, "palletType": "Standard 1200x1000mm"}',
  true,
  true,
  89,
  4.2,
  5,
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- Product 5: Health & Beauty Job Lot
INSERT INTO products (
  id,
  "sellerId",
  title,
  description,
  type,
  condition,
  "categoryId",
  "subcategoryId",
  price,
  "priceExVat",
  "vatRate",
  "stockQuantity",
  "stockStatus",
  images,
  weight,
  "isActive",
  "isApproved",
  views,
  rating,
  "reviewCount",
  "createdAt"
)
VALUES (
  'prod-55555555-5555-5555-5555-555555555555',
  '22222222-2222-2222-2222-222222222222',
  'Premium Skincare Products Mixed Lot - 50 Units',
  'High-end skincare products from leading brands. Includes moisturizers, serums, cleansers, and masks. All products are sealed and in date. Perfect for beauty retailers and online sellers. RRP value over £2000.',
  'lot',
  'new',
  'cat-health-beauty',
  'cat-beauty-skincare',
  599.99,
  499.99,
  0.20,
  4,
  'low_stock',
  ARRAY['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800'],
  12.5,
  true,
  true,
  156,
  4.6,
  9,
  NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Initialize wishlist for test buyer
INSERT INTO wishlists ("userId", "productIds", "createdAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  ARRAY['prod-33333333-3333-3333-3333-333333333333'::UUID, 'prod-22222222-2222-2222-2222-222222222222'::UUID],
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Sample banner
INSERT INTO banners (title, subtitle, "imageUrl", "linkUrl", "isActive", "order", "createdAt")
VALUES (
  'Wholesale Deals on Electronics',
  'Save up to 60% on mixed pallets and job lots',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
  '/catalog?category=cat-electronics',
  true,
  1,
  NOW()
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE users IS 'Test seed data created. Use these credentials: buyer@test.com, seller@test.com, admin@loadifymarket.co.uk (passwords set through Supabase Auth)';
