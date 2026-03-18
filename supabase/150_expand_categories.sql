-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 150: Expand category catalogue to full marketplace breadth.
--
-- Adds new top-level categories that match the frontend CATEGORY_CONFIG slugs,
-- then seeds subcategories so the CategorySelector in the add-product flow
-- shows proper child options for each main category.
--
-- All inserts use ON CONFLICT (slug) DO NOTHING so this migration is safe to
-- re-run against a database that already has some of these slugs.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. New top-level categories ──────────────────────────────────────────────

INSERT INTO categories (name, slug, description, "order", "isActive") VALUES
  ('Sports & Outdoors', 'sports-outdoors', 'Fitness, cycling, camping, outdoor gear and team sports', 21, TRUE),
  ('Health & Beauty',   'health-beauty',   'Skincare, haircare, vitamins, fragrances and wellness',   22, TRUE),
  ('Baby & Kids',       'baby-kids',       'Clothing, nursery, feeding, pushchairs and toys for children', 23, TRUE),
  ('Food & Drink',      'food-drink',      'Grocery, snacks, beverages, health foods and catering',   24, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Subcategories for Electronics ─────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'electronics' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Mobile Phones',    'electronics-mobile-phones',    'Smartphones and mobile handsets',           parent_id, 1, TRUE),
      ('Laptops',          'electronics-laptops',          'Portable computers and notebooks',          parent_id, 2, TRUE),
      ('Tablets',          'electronics-tablets',          'Tablet computers and e-readers',            parent_id, 3, TRUE),
      ('TVs & Displays',   'electronics-tvs-displays',     'Televisions, monitors and screens',         parent_id, 4, TRUE),
      ('Audio',            'electronics-audio',            'Headphones, speakers and hi-fi',            parent_id, 5, TRUE),
      ('Cameras',          'electronics-cameras',          'Digital cameras and photography gear',      parent_id, 6, TRUE),
      ('Gaming',           'electronics-gaming',           'Consoles, games and controllers',           parent_id, 7, TRUE),
      ('Smart Home',       'electronics-smart-home',       'Smart speakers, hubs and home automation',  parent_id, 8, TRUE),
      ('Networking',       'electronics-networking',       'Routers, switches and network accessories', parent_id, 9, TRUE),
      ('Accessories',      'electronics-accessories',      'Cables, chargers, cases and peripherals',   parent_id, 10, TRUE),
      ('Printers',         'electronics-printers',         'Printers, scanners and ink',                parent_id, 11, TRUE),
      ('Small Gadgets',    'electronics-small-gadgets',    'Wearables, drones and small devices',       parent_id, 12, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 3. Subcategories for Home & Garden ───────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'home-garden' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Furniture',           'home-furniture',           'Sofas, chairs, tables, beds and storage',    parent_id, 1, TRUE),
      ('Kitchen & Dining',    'home-kitchen-dining',      'Cookware, tableware and kitchen accessories', parent_id, 2, TRUE),
      ('Bedding',             'home-bedding',             'Duvets, pillows, mattresses and bedlinen',   parent_id, 3, TRUE),
      ('Bathroom',            'home-bathroom',            'Towels, accessories and bathroom essentials', parent_id, 4, TRUE),
      ('Lighting',            'home-lighting',            'Lamps, ceiling lights and smart lighting',   parent_id, 5, TRUE),
      ('Storage & Organisation','home-storage',           'Boxes, shelves, baskets and organisers',     parent_id, 6, TRUE),
      ('Cleaning',            'home-cleaning',            'Vacuum cleaners, mops and cleaning products', parent_id, 7, TRUE),
      ('Garden Tools',        'garden-tools',             'Lawn mowers, spades, forks and garden tools', parent_id, 8, TRUE),
      ('Outdoor Living',      'garden-outdoor-living',    'Garden furniture, barbecues and patio',       parent_id, 9, TRUE),
      ('Home Decor',          'home-decor',               'Candles, cushions, rugs and decorative items', parent_id, 10, TRUE),
      ('Small Appliances',    'home-small-appliances',    'Toasters, kettles, microwaves and more',     parent_id, 11, TRUE),
      ('Laundry',             'home-laundry',             'Washing machines, dryers and laundry accessories', parent_id, 12, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 4. Subcategories for Fashion ─────────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'fashion' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Men''s Clothing',    'fashion-mens',          'Shirts, trousers, jackets and menswear',         parent_id, 1, TRUE),
      ('Women''s Clothing',  'fashion-womens',        'Dresses, tops, trousers and ladieswear',         parent_id, 2, TRUE),
      ('Kids'' Clothing',    'fashion-kids',          'Boys, girls and baby clothing',                  parent_id, 3, TRUE),
      ('Shoes',              'fashion-shoes',         'Trainers, boots, heels, sandals and footwear',   parent_id, 4, TRUE),
      ('Bags & Accessories', 'fashion-bags',          'Handbags, belts, scarves and accessories',       parent_id, 5, TRUE),
      ('Jewellery',          'fashion-jewellery',     'Necklaces, rings, bracelets and earrings',       parent_id, 6, TRUE),
      ('Watches',            'fashion-watches',       'Wristwatches and timepieces',                    parent_id, 7, TRUE),
      ('Workwear',           'fashion-workwear',      'Uniforms, hi-vis and work clothing',             parent_id, 8, TRUE),
      ('Mixed Fashion Lots', 'fashion-mixed-lots',    'Wholesale and mixed clothing bundles',           parent_id, 9, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 5. Subcategories for Automotive ──────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'vehicles' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Car Parts',                'automotive-car-parts',      'Engine, exhaust, brakes and suspension', parent_id, 1, TRUE),
      ('Van Parts',                'automotive-van-parts',      'Commercial vehicle and van components',   parent_id, 2, TRUE),
      ('Car Care',                 'automotive-car-care',       'Polish, wax, cleaning and valeting',      parent_id, 3, TRUE),
      ('Tyres & Wheels',           'automotive-tyres',          'Tyres, alloy wheels and accessories',     parent_id, 4, TRUE),
      ('Batteries',                'automotive-batteries',      'Car batteries, starters and jump leads',  parent_id, 5, TRUE),
      ('Car Accessories',          'automotive-accessories',    'Interior, exterior and dash accessories',  parent_id, 6, TRUE),
      ('Diagnostics & Tools',      'automotive-diagnostics',    'OBD scanners and garage tools',           parent_id, 7, TRUE),
      ('Commercial Vehicles',      'automotive-commercial',     'HGV, fleet and commercial vehicle parts', parent_id, 8, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 6. Subcategories for Tools & DIY ─────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'tools' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Power Tools',       'tools-power',       'Drills, saws, grinders and sanders',            parent_id, 1, TRUE),
      ('Hand Tools',        'tools-hand',        'Spanners, screwdrivers, hammers and wrenches',   parent_id, 2, TRUE),
      ('Tool Storage',      'tools-storage',     'Toolboxes, chests and bags',                     parent_id, 3, TRUE),
      ('Hardware',          'tools-hardware',    'Fixings, bolts, nuts and brackets',              parent_id, 4, TRUE),
      ('Building Materials','tools-building',    'Timber, bricks and construction materials',      parent_id, 5, TRUE),
      ('Safety & PPE',      'tools-safety',      'Gloves, helmets, hi-vis and PPE',               parent_id, 6, TRUE),
      ('Electrical',        'tools-electrical',  'Cables, wiring, sockets and testers',            parent_id, 7, TRUE),
      ('Plumbing',          'tools-plumbing',    'Pipes, fittings, valves and plumbing tools',     parent_id, 8, TRUE),
      ('Workshop',          'tools-workshop',    'Workbenches, vices and workshop equipment',      parent_id, 9, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 7. Subcategories for Sports & Outdoors ───────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'sports-outdoors' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Gym & Fitness',     'sports-gym',        'Weights, benches, treadmills and gym gear',      parent_id, 1, TRUE),
      ('Cycling',           'sports-cycling',    'Bikes, helmets, clothing and accessories',        parent_id, 2, TRUE),
      ('Football',          'sports-football',   'Boots, balls, goals and football gear',           parent_id, 3, TRUE),
      ('Running',           'sports-running',    'Trainers, clothing and running accessories',      parent_id, 4, TRUE),
      ('Camping & Hiking',  'sports-camping',    'Tents, sleeping bags and hiking gear',            parent_id, 5, TRUE),
      ('Outdoor Clothing',  'sports-clothing',   'Waterproofs, fleeces and outdoor apparel',        parent_id, 6, TRUE),
      ('Water Sports',      'sports-water',      'Kayaking, surfing and paddleboarding',            parent_id, 7, TRUE),
      ('Golf',              'sports-golf',       'Clubs, bags, balls and golf accessories',         parent_id, 8, TRUE),
      ('Racket Sports',     'sports-racket',     'Tennis, badminton and squash equipment',          parent_id, 9, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 8. Subcategories for Health & Beauty ─────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'health-beauty' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Skincare',          'beauty-skincare',     'Moisturisers, serums, cleansers and face care',  parent_id, 1, TRUE),
      ('Haircare',          'beauty-haircare',     'Shampoo, conditioner and hair treatments',       parent_id, 2, TRUE),
      ('Fragrances',        'beauty-fragrance',    'Perfume, aftershave and body sprays',            parent_id, 3, TRUE),
      ('Make-up',           'beauty-makeup',       'Foundation, lipstick, eyeshadow and cosmetics',  parent_id, 4, TRUE),
      ('Vitamins & Supps',  'health-vitamins',     'Supplements, protein and health products',       parent_id, 5, TRUE),
      ('Personal Care',     'health-personal',     'Deodorant, body wash and hygiene essentials',    parent_id, 6, TRUE),
      ('Hair Tools',        'beauty-hair-tools',   'Hair dryers, straighteners and curlers',         parent_id, 7, TRUE),
      ('Oral Care',         'health-oral',         'Toothbrushes, toothpaste and whitening',         parent_id, 8, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 9. Subcategories for Baby & Kids ─────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'baby-kids' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Baby Clothing',     'baby-clothing',     'Babygrows, sleepsuits, vests and baby outfits',   parent_id, 1, TRUE),
      ('Nursery',           'baby-nursery',      'Cots, moses baskets and nursery furniture',       parent_id, 2, TRUE),
      ('Feeding',           'baby-feeding',      'Bottles, breast pumps and weaning products',      parent_id, 3, TRUE),
      ('Pushchairs',        'baby-pushchairs',   'Prams, pushchairs, buggies and car seats',        parent_id, 4, TRUE),
      ('Kids Clothing',     'kids-clothing',     'Boys, girls and school clothing',                 parent_id, 5, TRUE),
      ('Baby Toys',         'baby-toys',         'Rattles, teethers, playmats and baby toys',       parent_id, 6, TRUE),
      ('Safety',            'baby-safety',       'Stairgates, monitors and baby safety products',   parent_id, 7, TRUE),
      ('Bathing',           'baby-bathing',      'Baby baths, towels and skincare',                 parent_id, 8, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 10. Subcategories for Food & Drink ───────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'food-drink' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Snacks',            'food-snacks',         'Crisps, chocolate, sweets and confectionery',   parent_id, 1, TRUE),
      ('Beverages',         'food-beverages',      'Coffee, tea, juice, water and energy drinks',    parent_id, 2, TRUE),
      ('Grocery',           'food-grocery',        'Tinned goods, pasta, rice and dry staples',      parent_id, 3, TRUE),
      ('Health Foods',      'food-health',         'Protein, organic, vegan and free-from products', parent_id, 4, TRUE),
      ('Alcohol',           'food-alcohol',        'Wine, beer, spirits and mixers',                 parent_id, 5, TRUE),
      ('Wholesale Food',    'food-wholesale',      'Bulk catering and trade food supplies',          parent_id, 6, TRUE),
      ('Condiments',        'food-condiments',     'Sauces, spices, oils and seasonings',            parent_id, 7, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 11. Subcategories for Wholesale ──────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  -- Wholesale slug varies; try 'wholesale-pallets' first then 'wholesale'
  SELECT id INTO parent_id FROM categories
    WHERE slug IN ('wholesale-pallets','wholesale')
    ORDER BY "order" LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Pallet Stock',      'wholesale-pallets-stock',  'Full pallets of mixed or single-category stock', parent_id, 1, TRUE),
      ('Bulk Lots',         'wholesale-bulk-lots',       'Large quantity job lots and bulk bundles',        parent_id, 2, TRUE),
      ('Returns Stock',     'wholesale-returns',         'Customer and retail returns for resale',          parent_id, 3, TRUE),
      ('Clearance Loads',   'wholesale-clearance-loads', 'Full clearance loads from retailers',             parent_id, 4, TRUE),
      ('Mixed Lots',        'wholesale-mixed-lots',      'Mixed product job lots',                          parent_id, 5, TRUE),
      ('Liquidation',       'wholesale-liquidation',     'Liquidation and administration stock',            parent_id, 6, TRUE),
      ('Overstock',         'wholesale-overstock',       'Excess and overstock inventory',                  parent_id, 7, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 12. Subcategories for Toys ───────────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'toys' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Baby Toys',         'toys-baby',        'Rattles, teethers and infant toys',            parent_id, 1, TRUE),
      ('Educational',       'toys-educational', 'Learning toys, STEM and educational games',   parent_id, 2, TRUE),
      ('Outdoor Toys',      'toys-outdoor',     'Trampolines, scooters and outdoor play',       parent_id, 3, TRUE),
      ('Action Figures',    'toys-action',      'Action figures, superheroes and characters',   parent_id, 4, TRUE),
      ('Games & Puzzles',   'toys-games',       'Board games, card games and jigsaws',          parent_id, 5, TRUE),
      ('Arts & Crafts',     'toys-arts',        'Art supplies, craft kits and creative toys',   parent_id, 6, TRUE),
      ('Collectibles',      'toys-collectibles','Hobby models, trains and collectibles',         parent_id, 7, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 13. Subcategories for Pets ───────────────────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'pets' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Dog Supplies',      'pets-dogs',       'Leads, collars, beds and dog accessories',      parent_id, 1, TRUE),
      ('Cat Supplies',      'pets-cats',       'Litter, scratching posts and cat accessories',  parent_id, 2, TRUE),
      ('Pet Food',          'pets-food',       'Wet food, dry food and pet treats',             parent_id, 3, TRUE),
      ('Small Animals',     'pets-small',      'Hamsters, rabbits and small pet supplies',      parent_id, 4, TRUE),
      ('Aquarium',          'pets-aquarium',   'Fish tanks, filters and aquarium supplies',     parent_id, 5, TRUE),
      ('Bird Supplies',     'pets-birds',      'Cages, perches and bird accessories',           parent_id, 6, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ── 14. Subcategories for Business Supplies ──────────────────────────────────

DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM categories WHERE slug = 'business' LIMIT 1;
  IF parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, description, "parentId", "order", "isActive") VALUES
      ('Office Supplies',   'business-office',    'Stationery, printers and office essentials',  parent_id, 1, TRUE),
      ('Packaging',         'business-packaging', 'Boxes, bags, tape and bubble wrap',            parent_id, 2, TRUE),
      ('Storage',           'business-storage',   'Shelving, racking and storage solutions',      parent_id, 3, TRUE),
      ('Cleaning',          'business-cleaning',  'Janitorial, hygiene and cleaning supplies',    parent_id, 4, TRUE),
      ('Catering',          'business-catering',  'Commercial catering and food service',          parent_id, 5, TRUE),
      ('Workwear & PPE',    'business-workwear',  'Safety wear, uniforms and PPE',                parent_id, 6, TRUE),
      ('Warehouse',         'business-warehouse', 'Pallet trucks, forklifts and warehouse tools', parent_id, 7, TRUE)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;
