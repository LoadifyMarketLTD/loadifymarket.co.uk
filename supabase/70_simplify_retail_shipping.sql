-- =========================================================
-- LOADIFY MARKET - SIMPLIFIED RETAIL SHIPPING STRUCTURE
-- Migration: 70_simplify_retail_shipping.sql
-- Run this in the Supabase SQL Editor.
--
-- Business rule:
--   Retail products  → Royal Mail only
--   Bulk/pallet      → XDrive Logistics (separate system)
--
-- This migration deactivates non-Royal-Mail shipping methods
-- (Collection in Person, Evri) so they no longer appear in
-- the product form or at checkout for retail products.
-- =========================================================

-- Deactivate local collection and Evri methods.
-- Royal Mail Tracked 24 / 48 remain active.
UPDATE public.shipping_methods
SET    active = FALSE
WHERE  courier IN ('Local Collection', 'Evri');

-- Remove any product_shipping associations that now point to
-- inactive methods, so existing retail products are cleaned up.
DELETE FROM public.product_shipping
WHERE method_id IN (
  SELECT id FROM public.shipping_methods WHERE active = FALSE
);
