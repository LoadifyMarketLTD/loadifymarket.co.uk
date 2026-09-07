-- Enforce one verified review per buyer and product.
-- The previous UNIQUE(orderId, userId) constraint incorrectly blocked reviews
-- for a second product purchased in the same multi-item order, while allowing a
-- repeat review of the same product through a different order.
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS "reviews_orderId_userId_key";

ALTER TABLE public.reviews
  ADD CONSTRAINT "reviews_userId_productId_key"
  UNIQUE ("userId", "productId");
