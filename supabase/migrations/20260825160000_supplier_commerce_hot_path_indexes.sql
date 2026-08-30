-- Supplier Commerce pre-scale performance hardening.
--
-- Scope is intentionally limited to high-frequency catalogue, inventory,
-- pricing, orchestration, tracking and returns lookup paths expected to grow
-- materially once external supplier feeds are enabled. We deliberately do not
-- index every audit/approval foreign key simply to silence the database linter.

create index if not exists supplier_import_items_canonical_product_idx
  on private.supplier_import_items (canonical_product_id);
create index if not exists supplier_import_items_catalog_item_idx
  on private.supplier_import_items (supplier_catalog_item_id);
create index if not exists supplier_offers_catalog_item_idx
  on private.supplier_offers (supplier_catalog_item_id);
create index if not exists supplier_stock_obs_catalog_item_idx
  on private.supplier_stock_observations (supplier_catalog_item_id);
create index if not exists supplier_price_obs_catalog_item_idx
  on private.supplier_price_observations (supplier_catalog_item_id);
create index if not exists supplier_pricing_canonical_product_idx
  on private.supplier_pricing_snapshots (canonical_product_id);
create index if not exists supplier_pricing_landed_cost_idx
  on private.supplier_pricing_snapshots (landed_cost_snapshot_id);
create index if not exists supplier_fulfilment_leg_seller_idx
  on private.supplier_fulfilment_legs (seller_id);
create index if not exists supplier_fulfilment_leg_offer_idx
  on private.supplier_fulfilment_legs (supplier_offer_id);
create index if not exists supplier_fulfilment_item_leg_idx
  on private.supplier_fulfilment_leg_items (leg_id);
create index if not exists supplier_fulfilment_item_offer_idx
  on private.supplier_fulfilment_leg_items (supplier_offer_id);
create index if not exists supplier_orchestrations_buyer_idx
  on private.supplier_order_orchestrations (buyer_id);
create index if not exists supplier_handshakes_orchestration_idx
  on private.supplier_order_handshakes (orchestration_id);
create index if not exists supplier_handshakes_supplier_idx
  on private.supplier_order_handshakes (supplier_id);
create index if not exists supplier_handshakes_offer_idx
  on private.supplier_order_handshakes (supplier_offer_id);
create index if not exists supplier_stock_res_orchestration_idx
  on private.supplier_stock_reservations (orchestration_id);
create index if not exists supplier_stock_res_order_idx
  on private.supplier_stock_reservations (order_id);
create index if not exists supplier_stock_res_leg_item_idx
  on private.supplier_stock_reservations (leg_item_id);
create index if not exists supplier_tracking_mapping_idx
  on private.supplier_tracking_events (mapping_id);
create index if not exists supplier_exceptions_orchestration_idx
  on private.supplier_order_exceptions (orchestration_id);
create index if not exists supplier_exceptions_handshake_idx
  on private.supplier_order_exceptions (handshake_id);
create index if not exists supplier_exceptions_fulfilment_leg_idx
  on private.supplier_order_exceptions (fulfilment_leg_id);
create index if not exists supplier_returns_orchestration_idx
  on private.supplier_return_cases (orchestration_id);
create index if not exists supplier_returns_fulfilment_leg_idx
  on private.supplier_return_cases (fulfilment_leg_id);
create index if not exists supplier_returns_handshake_idx
  on private.supplier_return_cases (handshake_id);
create index if not exists supplier_return_recovery_case_idx
  on private.supplier_return_recovery_events (return_case_id);
create index if not exists supplier_sla_breach_order_idx
  on private.supplier_sla_breach_events (order_id);
create index if not exists supplier_sla_breach_leg_idx
  on private.supplier_sla_breach_events (fulfilment_leg_id);
