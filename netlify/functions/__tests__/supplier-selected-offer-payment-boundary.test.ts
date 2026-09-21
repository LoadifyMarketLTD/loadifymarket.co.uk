import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier selected-offer payment boundary", () => {
  const endpoint = repo("netlify/functions/create-supplier-payment-intent.ts");
  const migration = repo("supabase/migrations/20260921091538_supplier_projection_multi_offer_bindings.sql");

  it("requires the exact selected supplier variant snapshot before payment initialisation", () => {
    expect(endpoint).toContain("supplierExternalVariantRefSnapshot");
    expect(endpoint).toContain("p_external_variant_ref: order.supplierExternalVariantRefSnapshot");
    expect(migration).toContain('"supplierExternalVariantRefSnapshot"');
    expect(migration).toContain("v_catalog_item.external_variant_ref");
  });

  it("rejects pricing drift between checkout selection and payment initialisation", () => {
    expect(endpoint).toContain("guard.pricingSnapshotId !== order.pricingSnapshotId");
    expect(endpoint).toContain("expectedPricingSnapshotId: order.pricingSnapshotId");
  });

  it("carries selected supplier identity into Stripe and payment-session metadata", () => {
    expect(endpoint).toContain("supplierOfferId: order.supplierOfferId");
    expect(endpoint).toContain("pricingSnapshotId: order.pricingSnapshotId");
    expect(endpoint).toContain("supplierExternalVariantRef: order.supplierExternalVariantRefSnapshot");
  });

  it("does not submit a supplier order while creating the buyer payment intent", () => {
    expect(endpoint).not.toContain("submitPaidSupplierOrder");
    expect(endpoint).not.toContain("submitOrder(");
    expect(endpoint).not.toContain("admin-supplier-order-runtime");
  });
});
