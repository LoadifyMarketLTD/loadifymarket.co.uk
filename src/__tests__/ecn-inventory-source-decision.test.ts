import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925211000_ecn_inventory_source_decision.sql"),
  "utf8",
);

describe("ECN-3B inventory-source decision", () => {
  it("is shadow, read-only and service-role only", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.server_inventory_source_decision_v1");
    expect(migration).toContain("Shadow only");
    expect(migration).toContain("FROM PUBLIC,anon,authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).not.toContain("INSERT INTO private.seller_inventory_positions");
    expect(migration).not.toContain("UPDATE private.seller_inventory_positions");
  });

  it("normalises seller positions through verified dispatch locations", () => {
    expect(migration).toContain("private.seller_inventory_positions");
    expect(migration).toContain("private.dispatch_locations");
    expect(migration).toContain("verification_status='verified'");
    expect(migration).toContain("available_quantity>=v_quantity");
  });

  it("prefers explicit position candidates deterministically", () => {
    expect(migration).toContain("preferred DESC,domestic DESC,available_quantity DESC,inventory_position_id");
    expect(migration).toContain("'sourceType','seller_position'");
    expect(migration).toContain("'reservationModel','seller_position_not_authoritative'");
  });

  it("keeps legacy scalar seller stock restricted to GB to GB compatibility", () => {
    expect(migration).toContain("v_destination_country='GB'");
    expect(migration).toContain("v_destination_market='GB'");
    expect(migration).toContain('COALESCE(v_product."stockQuantity",0)>=v_quantity');
    expect(migration).toContain("'legacyGbOrigin',true");
    expect(migration).toContain("'reservationModel','legacy_seller_listing'");
  });

  it("requires explicit inventory location outside the legacy GB path", () => {
    expect(migration).toContain("'reason','inventory_location_required'");
    expect(migration).toContain("'INVENTORY_LOCATION_MISSING'");
  });

  it("reuses governed supplier stock and price readiness instead of copying raw stock", () => {
    expect(migration).toContain("server_supplier_stock_price_decision_v1");
    expect(migration).toContain("private.supplier_stock_observations");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS private.supplier_stock_observations");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS private.supplier_stock_reservations");
  });

  it("requires a reviewed supplier warehouse binding before route selection", () => {
    expect(migration).toContain("private.supplier_warehouse_bindings");
    expect(migration).toContain("status='verified'");
    expect(migration).toContain("'reason','supplier_warehouse_binding_missing'");
    expect(migration).toContain("'reservationModel','supplier_stock_reservation'");
  });

  it("fails closed when supplier stock evidence has no physical warehouse reference", () => {
    expect(migration).toContain("externalWarehouseRef");
    expect(migration).toContain("'reason','supplier_warehouse_ref_missing'");
  });

  it("does not reserve stock or activate Romania", () => {
    expect(migration).not.toContain("server_reserve_supplier");
    expect(migration).not.toContain("server_set_romania_launch_control");
    expect(migration).not.toContain("UPDATE private.market_routes");
  });
});
