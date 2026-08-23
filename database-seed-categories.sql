-- Loadify Market - Complete Category Tree Seed Data
-- Run this after database-schema.sql to populate all marketplace categories

-- Clear existing categories (if re-seeding)
-- TRUNCATE TABLE categories CASCADE;

-- Insert main categories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  -- Main Categories
  ('cat-mixed-lots', 'Mixed Job Lots', 'mixed-job-lots', 'Mixed pallets and job lots of various products', NULL, 1),
  ('cat-clothing', 'Clothing', 'clothing', 'Apparel and fashion items', NULL, 2),
  ('cat-shoes', 'Shoes', 'shoes', 'Footwear for all ages and occasions', NULL, 3),
  ('cat-jewellery', 'Jewellery', 'jewellery', 'Jewelry and accessories', NULL, 4),
  ('cat-electronics', 'Media & Electronics', 'media-electronics', 'Electronics, gadgets, and media products', NULL, 5),
  ('cat-accessories', 'Accessories', 'accessories', 'Fashion and lifestyle accessories', NULL, 6),
  ('cat-toys', 'Toys', 'toys', 'Toys and games for children', NULL, 7),
  ('cat-health-beauty', 'Health & Beauty', 'health-beauty', 'Health, beauty, and personal care products', NULL, 8),
  ('cat-pets', 'Pets', 'pets', 'Pet supplies and accessories', NULL, 9),
  ('cat-memorabilia', 'Memorabilia', 'memorabilia', 'Collectibles and memorabilia', NULL, 10),
  ('cat-adult', 'Adult', 'adult', 'Adult-oriented products', NULL, 11),
  ('cat-food-drink', 'Food & Drink', 'food-drink', 'Food, beverages, and related products', NULL, 12),
  ('cat-office', 'Office Supplies', 'office-supplies', 'Office and business supplies', NULL, 13),
  ('cat-home-garden', 'Home & Garden', 'home-garden', 'Home improvement and garden supplies', NULL, 14),
  ('cat-sports', 'Sports & Outdoors', 'sports-outdoors', 'Sports equipment and outdoor gear', NULL, 15)
ON CONFLICT (slug) DO NOTHING;

-- Clothing Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-clothing-mens', 'Men''s Clothing', 'mens-clothing', 'Men''s apparel', 'cat-clothing', 1),
  ('cat-clothing-womens', 'Women''s Clothing', 'womens-clothing', 'Women''s apparel', 'cat-clothing', 2),
  ('cat-clothing-kids', 'Kids Clothing', 'kids-clothing', 'Children''s apparel', 'cat-clothing', 3),
  ('cat-clothing-vintage', 'Vintage Clothing', 'vintage-clothing', 'Vintage and retro fashion', 'cat-clothing', 4),
  ('cat-clothing-activewear', 'Activewear', 'activewear', 'Sports and fitness clothing', 'cat-clothing', 5)
ON CONFLICT (slug) DO NOTHING;

-- Shoes Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-shoes-mens', 'Men''s Shoes', 'mens-shoes', 'Men''s footwear', 'cat-shoes', 1),
  ('cat-shoes-womens', 'Women''s Shoes', 'womens-shoes', 'Women''s footwear', 'cat-shoes', 2),
  ('cat-shoes-kids', 'Kids Shoes', 'kids-shoes', 'Children''s footwear', 'cat-shoes', 3),
  ('cat-shoes-trainers', 'Trainers & Sneakers', 'trainers-sneakers', 'Athletic and casual sneakers', 'cat-shoes', 4),
  ('cat-shoes-boots', 'Boots', 'boots', 'All types of boots', 'cat-shoes', 5)
ON CONFLICT (slug) DO NOTHING;

-- Jewellery Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-jewellery-necklaces', 'Necklaces', 'necklaces', 'Necklaces and pendants', 'cat-jewellery', 1),
  ('cat-jewellery-rings', 'Rings', 'rings', 'Rings and bands', 'cat-jewellery', 2),
  ('cat-jewellery-earrings', 'Earrings', 'earrings', 'Earrings and ear accessories', 'cat-jewellery', 3),
  ('cat-jewellery-bracelets', 'Bracelets', 'bracelets', 'Bracelets and bangles', 'cat-jewellery', 4),
  ('cat-jewellery-watches', 'Watches', 'watches', 'Wristwatches and timepieces', 'cat-jewellery', 5)
ON CONFLICT (slug) DO NOTHING;

-- Media & Electronics Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-electronics-phones', 'Mobile Phones', 'mobile-phones', 'Smartphones and mobile devices', 'cat-electronics', 1),
  ('cat-electronics-computers', 'Computers & Laptops', 'computers-laptops', 'Desktop and laptop computers', 'cat-electronics', 2),
  ('cat-electronics-tablets', 'Tablets', 'tablets', 'Tablet computers', 'cat-electronics', 3),
  ('cat-electronics-gaming', 'Gaming', 'gaming', 'Video games and consoles', 'cat-electronics', 4),
  ('cat-electronics-audio', 'Audio Equipment', 'audio-equipment', 'Speakers, headphones, and audio gear', 'cat-electronics', 5),
  ('cat-electronics-cameras', 'Cameras', 'cameras', 'Digital cameras and accessories', 'cat-electronics', 6),
  ('cat-electronics-tv', 'TVs & Video', 'tvs-video', 'Televisions and video equipment', 'cat-electronics', 7)
ON CONFLICT (slug) DO NOTHING;

-- Accessories Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-accessories-bags', 'Bags & Luggage', 'bags-luggage', 'Handbags, backpacks, and luggage', 'cat-accessories', 1),
  ('cat-accessories-belts', 'Belts', 'belts', 'Belts and waist accessories', 'cat-accessories', 2),
  ('cat-accessories-hats', 'Hats & Caps', 'hats-caps', 'Headwear', 'cat-accessories', 3),
  ('cat-accessories-scarves', 'Scarves & Gloves', 'scarves-gloves', 'Winter accessories', 'cat-accessories', 4),
  ('cat-accessories-sunglasses', 'Sunglasses', 'sunglasses', 'Sunglasses and eyewear', 'cat-accessories', 5)
ON CONFLICT (slug) DO NOTHING;

-- Toys Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-toys-action', 'Action Figures', 'action-figures', 'Action figures and collectibles', 'cat-toys', 1),
  ('cat-toys-dolls', 'Dolls', 'dolls', 'Dolls and doll accessories', 'cat-toys', 2),
  ('cat-toys-educational', 'Educational Toys', 'educational-toys', 'Learning and development toys', 'cat-toys', 3),
  ('cat-toys-outdoor', 'Outdoor Toys', 'outdoor-toys', 'Outdoor play equipment', 'cat-toys', 4),
  ('cat-toys-board-games', 'Board Games', 'board-games', 'Board games and puzzles', 'cat-toys', 5)
ON CONFLICT (slug) DO NOTHING;

-- Health & Beauty Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-beauty-skincare', 'Skincare', 'skincare', 'Skincare products', 'cat-health-beauty', 1),
  ('cat-beauty-makeup', 'Makeup', 'makeup', 'Cosmetics and makeup', 'cat-health-beauty', 2),
  ('cat-beauty-haircare', 'Hair Care', 'haircare', 'Hair care products', 'cat-health-beauty', 3),
  ('cat-beauty-fragrance', 'Fragrances', 'fragrances', 'Perfumes and colognes', 'cat-health-beauty', 4),
  ('cat-beauty-vitamins', 'Vitamins & Supplements', 'vitamins-supplements', 'Health supplements', 'cat-health-beauty', 5)
ON CONFLICT (slug) DO NOTHING;

-- Pets Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-pets-dog', 'Dog Supplies', 'dog-supplies', 'Products for dogs', 'cat-pets', 1),
  ('cat-pets-cat', 'Cat Supplies', 'cat-supplies', 'Products for cats', 'cat-pets', 2),
  ('cat-pets-fish', 'Fish & Aquarium', 'fish-aquarium', 'Aquarium supplies', 'cat-pets', 3),
  ('cat-pets-birds', 'Bird Supplies', 'bird-supplies', 'Products for birds', 'cat-pets', 4),
  ('cat-pets-small', 'Small Pets', 'small-pets', 'Supplies for small animals', 'cat-pets', 5)
ON CONFLICT (slug) DO NOTHING;

-- Memorabilia Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-memo-sports', 'Sports Memorabilia', 'sports-memorabilia', 'Sports collectibles', 'cat-memorabilia', 1),
  ('cat-memo-music', 'Music Memorabilia', 'music-memorabilia', 'Music collectibles', 'cat-memorabilia', 2),
  ('cat-memo-film', 'Film & TV Memorabilia', 'film-tv-memorabilia', 'Movie and TV collectibles', 'cat-memorabilia', 3),
  ('cat-memo-vintage', 'Vintage Items', 'vintage-items', 'Vintage and antique items', 'cat-memorabilia', 4)
ON CONFLICT (slug) DO NOTHING;

-- Food & Drink Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-food-snacks', 'Snacks & Confectionery', 'snacks-confectionery', 'Snacks, candy, and sweets', 'cat-food-drink', 1),
  ('cat-food-beverages', 'Beverages', 'beverages', 'Drinks and beverages', 'cat-food-drink', 2),
  ('cat-food-pantry', 'Pantry Items', 'pantry-items', 'Non-perishable food items', 'cat-food-drink', 3),
  ('cat-food-specialty', 'Specialty Foods', 'specialty-foods', 'Gourmet and specialty items', 'cat-food-drink', 4)
ON CONFLICT (slug) DO NOTHING;

-- Office Supplies Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-office-stationery', 'Stationery', 'stationery', 'Pens, paper, and writing supplies', 'cat-office', 1),
  ('cat-office-furniture', 'Office Furniture', 'office-furniture', 'Desks, chairs, and furniture', 'cat-office', 2),
  ('cat-office-technology', 'Office Technology', 'office-technology', 'Printers, scanners, and tech', 'cat-office', 3),
  ('cat-office-organization', 'Organization', 'organization', 'Filing and storage solutions', 'cat-office', 4)
ON CONFLICT (slug) DO NOTHING;

-- Home & Garden Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-home-furniture', 'Furniture', 'furniture', 'Home furniture', 'cat-home-garden', 1),
  ('cat-home-decor', 'Home Decor', 'home-decor', 'Decorative items', 'cat-home-garden', 2),
  ('cat-home-kitchen', 'Kitchen & Dining', 'kitchen-dining', 'Kitchen equipment and dining', 'cat-home-garden', 3),
  ('cat-home-bedding', 'Bedding & Bath', 'bedding-bath', 'Bedroom and bathroom items', 'cat-home-garden', 4),
  ('cat-home-garden-tools', 'Garden Tools', 'garden-tools', 'Gardening equipment', 'cat-home-garden', 5),
  ('cat-home-plants', 'Plants & Seeds', 'plants-seeds', 'Plants and gardening supplies', 'cat-home-garden', 6)
ON CONFLICT (slug) DO NOTHING;

-- Sports & Outdoors Subcategories
INSERT INTO categories (id, name, slug, description, "parentId", "order") VALUES
  ('cat-sports-fitness', 'Fitness Equipment', 'fitness-equipment', 'Exercise and fitness gear', 'cat-sports', 1),
  ('cat-sports-cycling', 'Cycling', 'cycling', 'Bikes and cycling accessories', 'cat-sports', 2),
  ('cat-sports-camping', 'Camping & Hiking', 'camping-hiking', 'Outdoor adventure gear', 'cat-sports', 3),
  ('cat-sports-water', 'Water Sports', 'water-sports', 'Swimming and water activities', 'cat-sports', 4),
  ('cat-sports-team', 'Team Sports', 'team-sports', 'Equipment for team sports', 'cat-sports', 5)
ON CONFLICT (slug) DO NOTHING;
