import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier buyer catalog publication boundary", () => {
  const publish = repo("netlify/functions/admin-publish-supplier-projection.ts");
  const catalog = repo("netlify/functions/supplier-catalog.ts");
  const migration = repo("supabase/migrations/20260920194642_supplier_projection_publication_gate.sql");
  const readBoundary = repo("supabase/migrations/20260921081947_supplier_projection_service_read.sql");

  it("publishes only after admin auth and fresh import/economics/stock-price gates", () => {
    expect(publish).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(publish).toContain("evaluateSupplierImport");
    expect(publish).toContain("evaluateSupplierEconomics");
    expect(publish).toContain("server_supplier_stock_price_decision_v1");
    expect(publish).toContain("server_publish_supplier_marketplace_projection_v1");
  });

  it("keeps seller listings untouched while handing published projections to revalidated supplier checkout", () => {
    expect(publish).toContain("sellerListingMutationPerformed: false");
    expect(publish).toContain("checkoutEnabled: true");
    expect(publish).toContain('nextGate: "buyer_checkout_revalidation"');
    expect(publish).not.toContain("create-product");
    expect(migration).toContain("'checkoutEnabled',false");
  });

  it("serves only published GB supplier-fulfilled projections through the multi-supplier eligibility engine", () => {
    expect(catalog).toContain("server_get_supplier_marketplace_projection_v1");
    expect(readBoundary).toContain("p.status='published'");
    expect(readBoundary).toContain("p.commercial_mode='loadify_supplier_fulfilled'");
    expect(readBoundary).toContain("p.territory='GB'");
    expect(catalog).toContain("evaluateProjectionSupplierOffers");
    expect(catalog).toContain("selected.grossCustomerPrice");
    expect(catalog).toContain("selected.sellableQuantity");
    expect(catalog).toContain("Sold and dispatched by approved supplier");
    expect(catalog).toContain("server_supplier_marketplace_commercial_readiness_v1");
    expect(catalog).toContain("server_supplier_marketplace_identity_v1");
    expect(catalog).toContain("payload.imageUrls");
    expect(catalog).toContain("imageUrls,");
  });

  it("keeps publication and projection-read RPCs service-role only while private schema stays unexposed", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("v_review.draft_hash<>v_projection.payload_hash");
    expect(readBoundary).toContain("SECURITY INVOKER");
    expect(readBoundary).toContain("FROM PUBLIC, anon, authenticated");
    expect(readBoundary).toContain("TO service_role");
    expect(catalog).not.toContain('.schema("private")');
  });
});
