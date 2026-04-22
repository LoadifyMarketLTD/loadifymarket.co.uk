-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 400: Global category system (10 roots, level metadata, dynamic filters)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1) Schema alignment: parent_id + level
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

-- Keep camelCase + snake_case parent columns aligned for compatibility.
CREATE OR REPLACE FUNCTION sync_category_parent_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NEW."parentId" IS NULL THEN
    NEW."parentId" := NEW.parent_id;
  ELSIF NEW."parentId" IS NOT NULL AND NEW.parent_id IS NULL THEN
    NEW.parent_id := NEW."parentId";
  ELSIF NEW.parent_id IS NOT NULL AND NEW."parentId" IS NOT NULL AND NEW.parent_id <> NEW."parentId" THEN
    NEW.parent_id := NEW."parentId";
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_categories_parent_sync ON categories;
CREATE TRIGGER trg_categories_parent_sync
  BEFORE INSERT OR UPDATE OF "parentId", parent_id
  ON categories
  FOR EACH ROW
  EXECUTE FUNCTION sync_category_parent_columns();

-- Backfill parent column parity.
UPDATE categories
SET parent_id = "parentId"
WHERE parent_id IS DISTINCT FROM "parentId"
  AND "parentId" IS NOT NULL;

UPDATE categories
SET "parentId" = parent_id
WHERE "parentId" IS NULL
  AND parent_id IS NOT NULL;

-- 2) Canonical 3-level global taxonomy
WITH taxonomy(name, slug, parent_slug, lvl, sort_order) AS (
  VALUES
  ('Electronics','electronics',NULL,1,1),
  ('Home & Garden','home-garden',NULL,1,2),
  ('Clothing & Fashion','clothing-fashion',NULL,1,3),
  ('Toys & Games','toys-games',NULL,1,4),
  ('Sports & Fitness','sports-fitness',NULL,1,5),
  ('Automotive','automotive',NULL,1,6),
  ('Health & Beauty','health-beauty',NULL,1,7),
  ('Pets','pets',NULL,1,8),
  ('Food & Drink','food-drink',NULL,1,9),
  ('Office & Business','office-business',NULL,1,10),

  ('Mobile Phones','mobile-phones','electronics',2,1),
  ('Phone Accessories','phone-accessories','electronics',2,2),
  ('TVs & Home Entertainment','tvs-home-entertainment','electronics',2,3),
  ('Audio','audio','electronics',2,4),
  ('Computers & Tablets','computers-tablets','electronics',2,5),
  ('Gaming','gaming','electronics',2,6),

  ('Furniture','furniture','home-garden',2,1),
  ('Kitchen & Dining','kitchen-dining','home-garden',2,2),
  ('Garden & Outdoor','garden-outdoor','home-garden',2,3),

  ('Men''s Clothing','mens-clothing','clothing-fashion',2,1),
  ('Women''s Clothing','womens-clothing','clothing-fashion',2,2),
  ('Footwear','footwear','clothing-fashion',2,3),

  ('Action Toys','action-toys','toys-games',2,1),
  ('Educational Toys','educational-toys','toys-games',2,2),
  ('Board Games','board-games','toys-games',2,3),

  ('Gym & Training','gym-training','sports-fitness',2,1),
  ('Team Sports','team-sports','sports-fitness',2,2),
  ('Skating','skating','sports-fitness',2,3),

  ('Car Parts','car-parts','automotive',2,1),
  ('Car Care','car-care','automotive',2,2),
  ('Tyres & Wheels','tyres-wheels','automotive',2,3),

  ('Skincare','skincare','health-beauty',2,1),
  ('Haircare','haircare','health-beauty',2,2),
  ('Personal Care','personal-care','health-beauty',2,3),

  ('Dog Supplies','dog-supplies','pets',2,1),
  ('Cat Supplies','cat-supplies','pets',2,2),
  ('Aquatics','aquatics','pets',2,3),

  ('Pantry','pantry','food-drink',2,1),
  ('Snacks','snacks','food-drink',2,2),
  ('Beverages','beverages','food-drink',2,3),

  ('Office Supplies','office-supplies','office-business',2,1),
  ('Office Furniture','office-furniture','office-business',2,2),
  ('Tech & Printing','tech-printing','office-business',2,3),

  ('Smartphones','smartphones','mobile-phones',3,1),
  ('Feature Phones','feature-phones','mobile-phones',3,2),
  ('Refurbished Phones','refurbished-phones','mobile-phones',3,3),

  ('Cases','cases','phone-accessories',3,1),
  ('Chargers','chargers','phone-accessories',3,2),
  ('Screen Protectors','screen-protectors','phone-accessories',3,3),
  ('Power Banks','power-banks','phone-accessories',3,4),

  ('Televisions','televisions','tvs-home-entertainment',3,1),
  ('Smart TVs','smart-tvs','tvs-home-entertainment',3,2),
  ('TV Accessories','tv-accessories','tvs-home-entertainment',3,3),
  ('Soundbars','soundbars','tvs-home-entertainment',3,4),

  ('Headphones','headphones','audio',3,1),
  ('Earbuds','earbuds','audio',3,2),
  ('Speakers','speakers','audio',3,3),

  ('Laptops','laptops','computers-tablets',3,1),
  ('Desktop PCs','desktop-pcs','computers-tablets',3,2),
  ('Tablets','tablets','computers-tablets',3,3),
  ('Monitors','monitors','computers-tablets',3,4),

  ('Consoles','consoles','gaming',3,1),
  ('Games','games','gaming',3,2),
  ('Controllers','controllers','gaming',3,3),

  ('Living Room Furniture','living-room-furniture','furniture',3,1),
  ('Bedroom Furniture','bedroom-furniture','furniture',3,2),
  ('Office Furniture (Home)','home-office-furniture','furniture',3,3),

  ('Cookware','cookware','kitchen-dining',3,1),
  ('Tableware','tableware','kitchen-dining',3,2),
  ('Small Appliances','small-appliances','kitchen-dining',3,3),

  ('Garden Tools','garden-tools','garden-outdoor',3,1),
  ('Outdoor Furniture','outdoor-furniture','garden-outdoor',3,2),
  ('Plants & Seeds','plants-seeds','garden-outdoor',3,3),

  ('Men''s Tops','mens-tops','mens-clothing',3,1),
  ('Men''s Bottoms','mens-bottoms','mens-clothing',3,2),
  ('Men''s Outerwear','mens-outerwear','mens-clothing',3,3),

  ('Dresses','dresses','womens-clothing',3,1),
  ('Women''s Tops','womens-tops','womens-clothing',3,2),
  ('Women''s Outerwear','womens-outerwear','womens-clothing',3,3),

  ('Trainers','trainers','footwear',3,1),
  ('Boots','boots','footwear',3,2),
  ('Sandals','sandals','footwear',3,3),

  ('Action Figures','action-figures','action-toys',3,1),
  ('RC Toys','rc-toys','action-toys',3,2),

  ('STEM Toys','stem-toys','educational-toys',3,1),
  ('Puzzles','puzzles','educational-toys',3,2),

  ('Family Games','family-games','board-games',3,1),
  ('Strategy Games','strategy-games','board-games',3,2),

  ('Cardio Equipment','cardio-equipment','gym-training',3,1),
  ('Weights','weights','gym-training',3,2),

  ('Football','football','team-sports',3,1),
  ('Basketball','basketball','team-sports',3,2),

  ('Skates','skates','skating',3,1),
  ('Protective Gear','protective-gear','skating',3,2),

  ('Engine Parts','engine-parts','car-parts',3,1),
  ('Brakes & Suspension','brakes-suspension','car-parts',3,2),

  ('Cleaning Kits','cleaning-kits','car-care',3,1),
  ('Oils & Fluids','oils-fluids','car-care',3,2),

  ('Tyres','tyres','tyres-wheels',3,1),
  ('Alloy Wheels','alloy-wheels','tyres-wheels',3,2),

  ('Cleansers','cleansers','skincare',3,1),
  ('Moisturisers','moisturisers','skincare',3,2),

  ('Shampoo & Conditioner','shampoo-conditioner','haircare',3,1),
  ('Styling','styling','haircare',3,2),

  ('Oral Care','oral-care','personal-care',3,1),
  ('Fragrances','fragrances','personal-care',3,2),

  ('Dog Food','dog-food','dog-supplies',3,1),
  ('Leads & Collars','leads-collars','dog-supplies',3,2),

  ('Cat Food','cat-food','cat-supplies',3,1),
  ('Litter','litter','cat-supplies',3,2),

  ('Aquariums','aquariums','aquatics',3,1),
  ('Aquarium Filters','aquarium-filters','aquatics',3,2),

  ('Pasta & Rice','pasta-rice','pantry',3,1),
  ('Canned Food','canned-food','pantry',3,2),

  ('Crisps','crisps','snacks',3,1),
  ('Chocolate','chocolate','snacks',3,2),

  ('Soft Drinks','soft-drinks','beverages',3,1),
  ('Tea & Coffee','tea-coffee','beverages',3,2),

  ('Paper','paper','office-supplies',3,1),
  ('Writing','writing','office-supplies',3,2),

  ('Desks','desks','office-furniture',3,1),
  ('Office Chairs','office-chairs','office-furniture',3,2),

  ('Printers','printers','tech-printing',3,1),
  ('Ink & Toner','ink-toner','tech-printing',3,2)
)
INSERT INTO categories (name, slug, description, "parentId", parent_id, level, "order", "isActive")
SELECT
  t.name,
  t.slug,
  t.name || ' category',
  p.id,
  p.id,
  t.lvl,
  t.sort_order,
  TRUE
FROM taxonomy t
LEFT JOIN categories p ON p.slug = t.parent_slug
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "parentId" = EXCLUDED."parentId",
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  "order" = EXCLUDED."order",
  "isActive" = TRUE;

-- 3) Cleanup: keep legacy categories inactive (taxonomy-only browsing)
WITH canonical AS (
  SELECT slug
  FROM (
    VALUES
      ('electronics'),('home-garden'),('clothing-fashion'),('toys-games'),('sports-fitness'),
      ('automotive'),('health-beauty'),('pets'),('food-drink'),('office-business'),
      ('mobile-phones'),('phone-accessories'),('tvs-home-entertainment'),('audio'),('computers-tablets'),('gaming'),
      ('furniture'),('kitchen-dining'),('garden-outdoor'),('mens-clothing'),('womens-clothing'),('footwear'),
      ('action-toys'),('educational-toys'),('board-games'),('gym-training'),('team-sports'),('skating'),
      ('car-parts'),('car-care'),('tyres-wheels'),('skincare'),('haircare'),('personal-care'),
      ('dog-supplies'),('cat-supplies'),('aquatics'),('pantry'),('snacks'),('beverages'),
      ('office-supplies'),('office-furniture'),('tech-printing'),('smartphones'),('feature-phones'),('refurbished-phones'),
      ('cases'),('chargers'),('screen-protectors'),('power-banks'),('televisions'),('smart-tvs'),('tv-accessories'),('soundbars'),
      ('headphones'),('earbuds'),('speakers'),('laptops'),('desktop-pcs'),('tablets'),('monitors'),('consoles'),('games'),('controllers'),
      ('living-room-furniture'),('bedroom-furniture'),('home-office-furniture'),('cookware'),('tableware'),('small-appliances'),
      ('garden-tools'),('outdoor-furniture'),('plants-seeds'),('mens-tops'),('mens-bottoms'),('mens-outerwear'),
      ('dresses'),('womens-tops'),('womens-outerwear'),('trainers'),('boots'),('sandals'),('action-figures'),('rc-toys'),('stem-toys'),
      ('puzzles'),('family-games'),('strategy-games'),('cardio-equipment'),('weights'),('football'),('basketball'),('skates'),('protective-gear'),
      ('engine-parts'),('brakes-suspension'),('cleaning-kits'),('oils-fluids'),('tyres'),('alloy-wheels'),('cleansers'),('moisturisers'),
      ('shampoo-conditioner'),('styling'),('oral-care'),('fragrances'),('dog-food'),('leads-collars'),('cat-food'),('litter'),('aquariums'),
      ('aquarium-filters'),('pasta-rice'),('canned-food'),('crisps'),('chocolate'),('soft-drinks'),('tea-coffee'),('paper'),('writing'),
      ('desks'),('office-chairs'),('printers'),('ink-toner')
  ) AS c(slug)
)
UPDATE categories
SET "isActive" = FALSE
WHERE slug NOT IN (SELECT slug FROM canonical)
  AND id NOT IN (
    SELECT DISTINCT "categoryId" FROM products
    UNION
    SELECT DISTINCT "subcategoryId" FROM products WHERE "subcategoryId" IS NOT NULL
  );

-- 4) Recalculate level values from parent links
WITH RECURSIVE tree AS (
  SELECT id, 1::INTEGER AS lvl
  FROM categories
  WHERE "parentId" IS NULL

  UNION ALL

  SELECT c.id, t.lvl + 1
  FROM categories c
  JOIN tree t ON c."parentId" = t.id
)
UPDATE categories c
SET level = t.lvl
FROM tree t
WHERE c.id = t.id;

UPDATE categories
SET level = 1
WHERE (level IS NULL OR level < 1)
  AND "parentId" IS NULL;

UPDATE categories
SET level = 2
WHERE (level IS NULL OR level < 1)
  AND "parentId" IS NOT NULL;

-- 5) Product assignment validation: category must exist and be active
CREATE OR REPLACE FUNCTION validate_product_category_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  category_active BOOLEAN;
BEGIN
  SELECT "isActive" INTO category_active
  FROM categories
  WHERE id = NEW."categoryId";

  IF category_active IS NULL THEN
    RAISE EXCEPTION 'Invalid category assignment: category does not exist.';
  END IF;

  IF category_active = FALSE THEN
    RAISE EXCEPTION 'Invalid category assignment: category is inactive.';
  END IF;

  IF NEW."subcategoryId" IS NOT NULL THEN
    PERFORM 1 FROM categories WHERE id = NEW."subcategoryId";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid subcategory assignment: subcategory does not exist.';
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_products_validate_category_assignment ON products;
CREATE TRIGGER trg_products_validate_category_assignment
  BEFORE INSERT OR UPDATE OF "categoryId", "subcategoryId"
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_category_assignment();

-- 6) Dynamic filter metadata per category
CREATE TABLE IF NOT EXISTS category_filter_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_slug TEXT NOT NULL,
  filter_key TEXT NOT NULL,
  filter_label TEXT NOT NULL,
  filter_type TEXT NOT NULL DEFAULT 'select' CHECK (filter_type IN ('select', 'range')),
  filter_options TEXT[] NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_slug, filter_key)
);

CREATE INDEX IF NOT EXISTS idx_category_filter_definitions_slug
  ON category_filter_definitions (category_slug, "order");

DROP TRIGGER IF EXISTS trg_category_filter_definitions_updatedAt ON category_filter_definitions;
CREATE TRIGGER trg_category_filter_definitions_updatedAt
  BEFORE UPDATE ON category_filter_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO category_filter_definitions (category_slug, filter_key, filter_label, filter_type, filter_options, "order") VALUES
  ('mobile-phones', 'brand', 'Brand', 'select', ARRAY['Apple','Samsung','Google','Xiaomi','Other'], 1),
  ('mobile-phones', 'storage', 'Storage', 'select', ARRAY['64GB','128GB','256GB','512GB','1TB'], 2),
  ('mobile-phones', 'condition', 'Condition', 'select', ARRAY['new','used','refurbished'], 3),
  ('mobile-phones', 'price', 'Price', 'range', ARRAY[]::TEXT[], 4),

  ('skates', 'size', 'Size', 'select', ARRAY['UK 3','UK 4','UK 5','UK 6','UK 7','UK 8','UK 9'], 1),
  ('skates', 'type', 'Type', 'select', ARRAY['Inline','Quad','Ice'], 2),
  ('skates', 'condition', 'Condition', 'select', ARRAY['new','used','refurbished'], 3),

  ('televisions', 'brand', 'Brand', 'select', ARRAY['Samsung','LG','Sony','TCL','Hisense','Other'], 1),
  ('televisions', 'size', 'Size', 'select', ARRAY['32"','43"','50"','55"','65"','75"+'], 2),
  ('televisions', 'smart_type', 'Smart Type', 'select', ARRAY['Android TV','Tizen','webOS','Roku','Non-Smart'], 3)
ON CONFLICT (category_slug, filter_key) DO UPDATE
SET
  filter_label = EXCLUDED.filter_label,
  filter_type = EXCLUDED.filter_type,
  filter_options = EXCLUDED.filter_options,
  "order" = EXCLUDED."order";
