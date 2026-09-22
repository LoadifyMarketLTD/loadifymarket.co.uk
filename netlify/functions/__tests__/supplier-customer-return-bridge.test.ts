import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("supplier customer return bridge", () => {
  const migration = repo("supabase/migrations/20260921062910_supplier_return_customer_bridge.sql");
  const buyerReturn = repo("netlify/functions/request-supplier-customer-return.ts");
  const adminRuntime = repo("netlify/functions/admin-supplier-return-runtime.ts");
  const refund = repo("netlify/functions/create-refund.ts");

  it("keeps supplier returns sellerless while preserving marketplace seller identity", () => {
    expect(migration).toContain('ALTER COLUMN "sellerId" DROP NOT NULL');
    expect(migration).toContain('"commercialMode"');
    expect(migration).toContain("loadify_supplier_fulfilled");
    expect(migration).toContain('"sellerId" IS NULL');
    expect(migration).toContain('"requestedQuantity"');
  });

  it("creates buyer return truth without issuing a refund or inventing supplier recovery", () => {
    expect(buyerReturn).toContain('authenticateActiveAccount(event, admin, ["buyer"])');
    expect(buyerReturn).toContain('commercialMode: "loadify_supplier_fulfilled"');
    expect(buyerReturn).toContain("refundIssued: false");
    expect(buyerReturn).toContain("supplierRecoveryStarted: false");
    expect(buyerReturn).toContain("evaluateCustomerReturnAutomation");
  });

  it("keeps supplier return/recovery runtime admin controlled and capability gated", () => {
    expect(adminRuntime).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(adminRuntime).toContain("createRuntimeSupplierAdapter");
    expect(adminRuntime).toContain("supplierOfferId");
    expect(adminRuntime).toContain("requestSupplierReturn");
    expect(adminRuntime).toContain("pollSupplierRecovery");
    expect(adminRuntime).toContain("buyerRefundIssued: false");
  });

  it("refunds supplier-fulfilled buyers without seller transfer reversal and reconciles supplier financial truth separately", () => {
    expect(refund).toContain("order.commercialMode !== 'loadify_supplier_fulfilled'");
    expect(refund).toContain("server_reconcile_supplier_financials_v1");
    expect(refund).toContain("supplier recovery reconciliation requires admin review");
  });
});
