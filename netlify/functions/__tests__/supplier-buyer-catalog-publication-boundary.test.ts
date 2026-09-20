import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier buyer catalog publication boundary", () => {
  const publish = repo("netlify/functions/admin-publish-supplier-projection.ts");
  const catalog = repo("netlify/functions/supplier-catalog.ts");
  const migration = repo("supabase/migrations/20260920194642_supplier_projection_publication_gate.sql");

  it("publishes only after admin auth and fresh import/economics/stock-price gates", () => {
    expect(publish).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(publish).toContain("evaluateSupplierImport");
    expect(publish).toContain("evaluateSupplierEconomics");
    expect(publish).toContain("server_supplier_stock_price_decision_v1");
    expect(publish).toContain("server_publish_supplier_marketplace_projection_v1");
  });

  it("does not mutate seller listings or enable checkout", () => {
    expect(publish).toContain("sellerListingMutationPerformed: false");
    expect(publish).toContain("checkoutEnabled: false");
    expect(publish).not.toContain("create-product");
    expect(migration).toContain("'checkoutEnabled',false");
  });

  it("serves only published GB supplier-fulfilled projections with live economics and stock", () => {
    expect(catalog).toContain('.eq("status", "published")');
    expect(catalog).toContain('.eq("commercial_mode", "loadify_supplier_fulfilled")');
    expect(catalog).toContain('.eq("territory", "GB")');
    expect(catalog).toContain("evaluateSupplierEconomics");
    expect(catalog).toContain("server_supplier_stock_price_decision_v1");
    expect(catalog).toContain("Fulfilled by approved supplier");
  });

  it("keeps publication RPC service-role only and tied to the approved reviewed payload", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("v_review.draft_hash<>v_projection.payload_hash");
  });
});
