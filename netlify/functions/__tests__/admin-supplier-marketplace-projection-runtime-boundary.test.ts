import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier marketplace projection boundary", () => {
  const endpoint = repo("netlify/functions/admin-supplier-marketplace-projection.ts");
  const migration = repo("supabase/migrations/20260920193329_supplier_marketplace_projection.sql");

  it("requires admin auth and canonical commerce gates", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(endpoint).toContain("evaluateSupplierImport");
    expect(endpoint).toContain("evaluateSupplierEconomics");
    expect(endpoint).toContain('"loadify_supplier_fulfilled"');
  });

  it("creates only an internal non-buyer-visible projection", () => {
    expect(endpoint).toContain("server_create_supplier_marketplace_projection_v1");
    expect(endpoint).toContain("buyerVisible: false");
    expect(endpoint).toContain("checkoutEnabled: false");
    expect(endpoint).toContain("publicProductMutationPerformed: false");
    expect(endpoint).not.toContain(".from('products').insert");
  });

  it("binds projection to approved human review and keeps storage private", () => {
    expect(migration).toContain("private.supplier_marketplace_projections");
    expect(migration).toContain("private.operator_merchandising_reviews");
    expect(migration).toContain("status='approved'");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("'buyerVisible',false");
    expect(migration).toContain("'checkoutEnabled',false");
  });
});
