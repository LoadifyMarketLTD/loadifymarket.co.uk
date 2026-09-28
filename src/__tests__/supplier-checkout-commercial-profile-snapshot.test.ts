import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("supplier checkout immutable commercial profile snapshot", () => {
  const migration = repo("supabase/migrations/20260928220000_supplier_checkout_independent_seller_profile_snapshot.sql");
  const payment = repo("netlify/functions/create-supplier-payment-intent.ts");

  it("snapshots the independent supplier and exact commercial profile on the order", () => {
    expect(migration).toContain('"supplierCommercialProfileIdSnapshot"');
    expect(migration).toContain('"supplierCommercialProfileVersionSnapshot"');
    expect(migration).toContain('v_supplier_name,NULL,v_supplier_name,NULL');
    expect(migration).toContain("v_supplier.id,v_supplier_name,v_control.settlement_model");
    expect(migration).toContain("'Loadify Market',1,v_profile.id,v_profile.version");
  });

  it("guards the snapshot against a different supplier, market, version or settlement model", () => {
    expect(migration).toContain("guard_supplier_commercial_profile_snapshot_v1");
    expect(migration).toContain('supplier_id=NEW."supplierSellerIdSnapshot"');
    expect(migration).toContain('market_code=NEW."marketCode"');
    expect(migration).toContain('version=NEW."supplierCommercialProfileVersionSnapshot"');
    expect(migration).toContain('NEW."supplierSettlementModelSnapshot" IS DISTINCT FROM v_profile.settlement_model');
  });

  it("loads payment policy from the snapshotted profile rather than whichever profile is current later", () => {
    expect(payment).toContain("server_supplier_commercial_profile_snapshot_v1");
    expect(payment).toContain("p_profile_id: order.supplierCommercialProfileIdSnapshot");
    expect(payment).toContain("p_version: order.supplierCommercialProfileVersionSnapshot");
    expect(payment).toContain("supplierCommercialProfile.settlementModel !== order.supplierSettlementModelSnapshot");
    expect(payment).not.toContain('"server_supplier_commercial_profile_readiness_v1"');
  });

  it("does not activate a market or create a payment", () => {
    expect(migration).not.toContain("SET checkout_enabled = true");
    expect(migration).not.toContain("paymentIntents.create");
    expect(migration).not.toContain("transfers.create");
  });
});
