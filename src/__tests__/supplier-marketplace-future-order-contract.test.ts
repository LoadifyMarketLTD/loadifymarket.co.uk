import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925215000_supplier_marketplace_future_order_contract.sql"),
  "utf8",
);

describe("future supplier marketplace order contract", () => {
  it("adds independent supplier seller and settlement snapshots without rewriting historical orders", () => {
    expect(migration).toContain('"supplierSellerIdSnapshot"');
    expect(migration).toContain('"supplierSellerNameSnapshot"');
    expect(migration).toContain('"supplierSettlementModelSnapshot"');
    expect(migration).toContain('"marketplaceOperatorSnapshot"');
    expect(migration).toContain('"supplierCommercialContractVersion"');
    expect(migration).toContain("BEFORE INSERT ON public.orders");
    expect(migration).not.toContain("UPDATE public.orders");
  });

  it("requires the selected approved supplier identity", () => {
    expect(migration).toContain("private.supplier_offers");
    expect(migration).toContain("private.supplier_foundation_suppliers");
    expect(migration).toContain("approved supplier seller identity is required");
    expect(migration).toContain("supplier seller identity snapshot does not match selected supplier");
    expect(migration).toContain("supplier seller name snapshot does not match selected supplier");
  });

  it("fails closed unless the market commercial control is verified with evidence", () => {
    expect(migration).toContain("private.supplier_marketplace_commercial_controls");
    expect(migration).toContain("v_control.status<>'verified'");
    expect(migration).toContain("v_control.checkout_enabled IS DISTINCT FROM true");
    expect(migration).toContain("v_control.settlement_model='unconfigured'");
    expect(migration).toContain("v_control.evidence='{}'::jsonb");
  });

  it("requires the independent supplier to be seller and invoice issuer", () => {
    expect(migration).toContain("legal seller identity must be the independent supplier");
    expect(migration).toContain("invoice issuer must be the independent supplier under marketplace contract v1");
    expect(migration).toContain("Loadify/XDrive cannot be snapshotted as seller of supplier marketplace goods");
  });

  it("requires the reviewed settlement model without assuming a payment recipient", () => {
    expect(migration).toContain('"supplierSettlementModelSnapshot"');
    expect(migration).toContain("supplier settlement model snapshot does not match reviewed control");
    expect(migration).not.toContain('NEW."paymentRecipientSnapshot" IS DISTINCT FROM');
    expect(migration).not.toContain('NEW."merchantOfRecordSnapshot" IS DISTINCT FROM');
  });

  it("keeps the technical legacy mode separate from commercial ownership semantics", () => {
    expect(migration).toContain("NEW.\"commercialMode\" IS DISTINCT FROM 'loadify_supplier_fulfilled'");
    expect(migration).toContain("supplier marketplace commercial contract version 1 is required");
  });
});
