-- Migration 160: Expand product condition values
-- Adds: returns_stock, mixed, other to the condition CHECK constraint
-- This allows sellers to properly describe the condition of bulk/clearance stock

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_condition_check;

ALTER TABLE products
  ADD CONSTRAINT products_condition_check
    CHECK (condition IN ('new', 'used', 'refurbished', 'returns_stock', 'mixed', 'other'));
