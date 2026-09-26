-- ECN/supplier performance hardening.
-- Adds covering indexes only for foreign keys reported by Supabase performance advisor.
-- No launch, routing, seller identity, payment, tax, legal-policy or SEO state is changed.

CREATE INDEX IF NOT EXISTS actor_route_capabilities_dispatch_location_id_idx
  ON private.actor_route_capabilities (dispatch_location_id);

CREATE INDEX IF NOT EXISTS actor_route_capabilities_reviewed_by_idx
  ON private.actor_route_capabilities (reviewed_by);

CREATE INDEX IF NOT EXISTS actor_route_capabilities_seller_id_idx
  ON private.actor_route_capabilities (seller_id);

CREATE INDEX IF NOT EXISTS actor_route_capabilities_supplier_id_idx
  ON private.actor_route_capabilities (supplier_id);

CREATE INDEX IF NOT EXISTS dispatch_locations_reviewed_by_idx
  ON private.dispatch_locations (reviewed_by);

CREATE INDEX IF NOT EXISTS market_routes_changed_by_idx
  ON private.market_routes (changed_by);

CREATE INDEX IF NOT EXISTS route_decision_snapshots_dispatch_location_id_idx
  ON private.route_decision_snapshots (dispatch_location_id);

CREATE INDEX IF NOT EXISTS route_decision_snapshots_seller_id_idx
  ON private.route_decision_snapshots (seller_id);

CREATE INDEX IF NOT EXISTS route_decision_snapshots_supplier_id_idx
  ON private.route_decision_snapshots (supplier_id);

CREATE INDEX IF NOT EXISTS supplier_marketplace_commercial_controls_reviewed_by_idx
  ON private.supplier_marketplace_commercial_controls (reviewed_by);

CREATE INDEX IF NOT EXISTS supplier_stripe_account_bindings_verified_by_idx
  ON private.supplier_stripe_account_bindings (verified_by);

CREATE INDEX IF NOT EXISTS supplier_warehouse_bindings_reviewed_by_idx
  ON private.supplier_warehouse_bindings (reviewed_by);
