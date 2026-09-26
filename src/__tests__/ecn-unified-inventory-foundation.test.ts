import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925204500_ecn_unified_inventory_foundation.sql"),
  "utf8",
);

describe("ECN-3 unified inventory foundation", () => {
  it("creates seller inventory positions and supplier warehouse bindings only", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS private.seller_inventory_positions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS private.supplier_warehouse_bindings");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS private.supplier_stock_observations");
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS private.supplier_stock_reservations");
  });

  it("keeps seller stock migration additive and does not replace products.stockQuantity", () => {
    expect(migration).toContain("Existing products.stockQuantity remains the live seller stock authority");
    expect(migration).not.toContain('ALTER TABLE public.products DROP COLUMN "stockQuantity"');
  });

  it("enforces seller product and dispatch-location ownership", () => {
    expect(migration).toContain("inventory position seller does not own product");
    expect(migration).toContain("dispatch location does not belong to seller");
  });

  it("prevents negative or over-reserved seller inventory", () => {
    expect(migration).toContain("CHECK (on_hand >= 0)");
    expect(migration).toContain("CHECK (reserved >= 0 AND reserved <= on_hand)");
    expect(migration).toContain("reserved inventory cannot exceed on-hand inventory");
  });

  it("requires verified physical locations for active seller inventory", () => {
    expect(migration).toContain("active inventory position requires active dispatch location");
    expect(migration).toContain("active inventory position requires verified dispatch location");
  });

  it("binds supplier warehouse refs to the existing supplier declaration evidence", () => {
    expect(migration).toContain("v_supplier.warehouse_refs");
    expect(migration).toContain("externalWarehouseRef");
    expect(migration).toContain("warehouse reference is not declared by supplier foundation");
  });

  it("requires supplier ownership and warehouse-country parity", () => {
    expect(migration).toContain("dispatch location does not belong to supplier");
    expect(migration).toContain("supplier warehouse country does not match dispatch location");
  });

  it("keeps new operational inventory tables private", () => {
    expect(migration).toContain("REVOKE ALL ON TABLE private.seller_inventory_positions");
    expect(migration).toContain("REVOKE ALL ON TABLE private.supplier_warehouse_bindings");
  });

  it("does not activate Romania or change route launch state", () => {
    expect(migration).not.toContain("UPDATE private.market_routes");
    expect(migration).not.toContain("server_set_romania_launch_control");
  });
});
