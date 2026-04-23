-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 420: Seed 17 wholesale marketplace categories.
--
-- These are the B2B wholesale categories used by the UI (category-config.ts,
-- HeroSection, header, sitemap) and by product listings.  They are inserted
-- alongside the consumer categories already seeded by migration 400.
--
-- Uses ON CONFLICT (slug) DO NOTHING so the migration is idempotent and will
-- not overwrite any existing admin edits.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, description, "order", "isActive")
VALUES
  ('Large Letter Items', 'large-letter-items',
   'Small, lightweight items ideal for postal and large-letter format shipping',
   101, TRUE),
  ('Garden', 'garden',
   'Garden tools, outdoor furniture, planters, BBQ and garden décor',
   102, TRUE),
  ('DIY', 'diy',
   'Power tools, hand tools, fixings, paint and home improvement supplies',
   103, TRUE),
  ('Cleaning', 'cleaning',
   'Cleaning products, mops, cloths, bin liners, disinfectants and laundry',
   104, TRUE),
  ('Party & Gift', 'party-gift',
   'Party supplies, balloons, decorations, gifting and tableware',
   105, TRUE),
  ('Wholesale Pound Lines', 'wholesale-pound-lines',
   'High-volume pound-line products across all categories',
   106, TRUE),
  ('Toys', 'toys',
   'Action figures, educational toys, outdoor toys, board games and arts & crafts',
   107, TRUE),
  ('Leisure & Hobbies', 'leisure-hobbies',
   'Arts & crafts, sports, camping, puzzles and hobby equipment',
   108, TRUE),
  ('Baby Supplies', 'baby-supplies',
   'Baby clothing, feeding, nappies, nursery essentials and baby monitors',
   109, TRUE),
  ('Kitchenware', 'kitchenware',
   'Cookware, bakeware, kitchen tools, storage and small appliances',
   110, TRUE),
  ('Health & Beauty', 'health-beauty',
   'Skincare, haircare, makeup, personal care, vitamins and fragrances',
   111, TRUE),
  ('Homeware', 'homeware',
   'Bedding, curtains, rugs, bathroom accessories and home décor',
   112, TRUE),
  ('Electrical', 'electrical',
   'LED lighting, phone accessories, cables, smart home and audio',
   113, TRUE),
  ('Pet Supplies', 'pet-supplies',
   'Dog, cat, small animal, bird and fish supplies, food, toys and grooming',
   114, TRUE),
  ('Stationery', 'stationery',
   'Pens, notebooks, office supplies, art materials and greeting cards',
   115, TRUE),
  ('Seasonal', 'seasonal',
   'Christmas, Easter, Halloween, Valentine''s and all seasonal ranges',
   116, TRUE),
  ('Wholesale Clothing', 'wholesale-clothing',
   'Women''s, men''s and children''s clothing, sportswear and underwear',
   117, TRUE)
ON CONFLICT (slug) DO NOTHING;
