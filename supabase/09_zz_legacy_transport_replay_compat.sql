-- 09_zz_legacy_transport_replay_compat.sql
--
-- Fresh-rebuild compatibility only.
--
-- The original numeric bootstrap chain contains historical RLS/grant/trigger
-- statements for delivery_requests and transport_quotes in migrations 10, 20,
-- 100 and 455. Those transport-request surfaces were later removed from the
-- product by 20260818102000_remove_unused_transport_surfaces_20260818.sql and
-- MUST NOT be restored as runtime architecture.
--
-- A fresh numeric replay reaches those historical statements before the later
-- removal migration. Create the smallest possible compatibility relations so
-- the historical statements can be replayed deterministically. Migration
-- 456_00_remove_legacy_transport_replay_compat.sql removes these relations
-- immediately after the last legacy reference (455).
--
-- No application runtime is allowed to depend on these compatibility tables.

CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id uuid PRIMARY KEY,
  "buyerId" uuid,
  "sellerId" uuid,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transport_quotes (
  id uuid PRIMARY KEY,
  "deliveryRequestId" uuid REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  "carrierId" uuid,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delivery_requests IS
  'LEGACY FRESH-REPLAY COMPATIBILITY ONLY; removed again by migration 456_00.';
COMMENT ON TABLE public.transport_quotes IS
  'LEGACY FRESH-REPLAY COMPATIBILITY ONLY; removed again by migration 456_00.';
