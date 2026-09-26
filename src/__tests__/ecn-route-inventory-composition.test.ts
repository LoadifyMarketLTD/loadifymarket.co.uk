import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260926090000_ecn_route_inventory_source_composition.sql"),
  "utf8",
);

describe("ECN-3C route/inventory composition", () => {
  it("composes seller inventory-source decision into the shadow route engine", () => {
    expect(migration).toContain("server_inventory_source_decision_v1");
    expect(migration).toContain("v_inventory_selected");
    expect(migration).toContain("v_effective_dispatch_location_id");
    expect(migration).toContain("'inventorySource',v_inventory");
  });

  it("derives physical origin from the selected inventory source", () => {
    expect(migration).toContain("v_origin:=NULLIF(v_inventory_selected->>'sourceCountry','')");
    expect(migration).toContain("v_effective_dispatch_location_id:=");
    expect(migration).toContain("seller_id=v_product.\"sellerId\"");
    expect(migration).toContain("v_origin:=v_location.country_code");
  });

  it("keeps the existing GB to GB scalar-stock compatibility path", () => {
    expect(migration).toContain("v_legacy_gb_origin:=COALESCE");
    expect(migration).toContain("v_destination_country='GB'");
    expect(migration).toContain("v_destination_market='GB'");
    expect(migration).toContain("v_origin:='GB'");
  });
  it("uses the selected physical location for route capability lookup", () => {
    expect(migration).toContain("dispatch_location_id=v_effective_dispatch_location_id");
    expect(migration).not.toContain("dispatch_location_id=p_dispatch_location_id\n      ORDER BY reviewed_at DESC");
  });

  it("keeps supplier routing fail closed", () => {
    expect(migration).toContain("supplier_intermediary_commercial_model_not_ready");
    expect(migration).toContain("Supplier inventory remains fail-closed");
    expect(migration).toContain("v_stock_ok:=false");
  });

  it("does not wire ECN into live checkout", () => {
    expect(migration).not.toContain("UPDATE public.orders");
    expect(migration).not.toContain("INSERT INTO public.orders");
    expect(migration).not.toContain("stripe.paymentIntents");
    expect(migration).not.toContain("server_set_romania_launch_control");
  });

  it("remains service-role only", () => {
    expect(migration).toContain("FROM PUBLIC,anon,authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("Read-only and service-role-only");
  });
});
