-- 607_lock_shipment_writes_to_server.sql
--
-- Canonical shipment contract:
--   * buyers/sellers/admin clients may read shipments only through RLS;
--   * shipment creation, mutation, POD confirmation and lifecycle transitions are
--     server-managed through authenticated Netlify functions using service_role;
--   * direct client INSERT/UPDATE/DELETE must not bypass order ownership,
--     payment-backed transition guards, rate limits, notifications or audit events.

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipments_insert" ON public.shipments;
DROP POLICY IF EXISTS "shipments_update" ON public.shipments;
DROP POLICY IF EXISTS "shipments_delete" ON public.shipments;
DROP POLICY IF EXISTS "Sellers can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Sellers can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Sellers can delete shipments" ON public.shipments;

-- Preserve the participant/admin SELECT contract exactly as-is. Remove the
-- underlying write privileges as defense in depth so an accidentally permissive
-- future RLS policy cannot silently reopen the bypass.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.shipments FROM anon, authenticated;

GRANT SELECT ON TABLE public.shipments TO authenticated;
REVOKE SELECT ON TABLE public.shipments FROM anon;

-- Canonical server handlers operate with service_role and retain full access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipments TO service_role;

COMMENT ON TABLE public.shipments IS
  'Shipment records. Client roles are read-only under participant/admin RLS; all writes are server-managed through canonical shipment functions.';
