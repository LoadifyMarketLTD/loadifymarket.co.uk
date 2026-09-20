import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier runtime and buyer status boundary", () => {
  const runtime = repo("netlify/functions/admin-supplier-order-runtime.ts");
  const buyer = repo("netlify/functions/supplier-order-status.ts");
  const tracking = repo("netlify/functions/_shared/supplierTracking.ts");
  const migration = repo("supabase/migrations/20260920202009_supplier_runtime_buyer_status.sql");

  it("keeps supplier submit/recover/tracking admin controlled and provider neutral", () => {
    expect(runtime).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(runtime).toContain("submitPaidSupplierOrder");
    expect(runtime).toContain("recoverSupplierOrderAcknowledgement");
    expect(runtime).toContain("syncSupplierTracking");
    expect(runtime).toContain("createSupplierProviderAdapter");
  });

  it("exposes only buyer-owned supplier order status", () => {
    expect(buyer).toContain('authenticateActiveAccount(event, admin, ["buyer"])');
    expect(buyer).toContain("server_supplier_buyer_order_status_v1");
    expect(migration).toContain('"buyerId"=p_buyer_id');
  });

  it("projects canonical tracking to existing public order states without a parallel order system", () => {
    expect(tracking).toContain("server_project_supplier_tracking_to_order_v1");
    expect(migration).toContain("status='shipped'");
    expect(migration).toContain("status='delivered'");
    expect(migration).toContain('"trackingNumber"');
  });

  it("keeps buyer-safe status free of supplier commercial internals", () => {
    expect(migration).toContain("'supplierConfirmation'");
    expect(migration).toContain("'supportRequired'");
    expect(migration).not.toContain("'supplierOfferId'");
    expect(migration).not.toContain("'pricingSnapshotId'");
  });
});
