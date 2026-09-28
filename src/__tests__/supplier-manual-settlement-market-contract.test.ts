import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260928211500_supplier_manual_settlement_market_contract.sql"),
  "utf8",
);
const profile = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260928145500_supplier_commercial_policy_matrix.sql"),
  "utf8",
);
const payment = readFileSync(
  resolve(process.cwd(), "netlify/functions/create-supplier-payment-intent.ts"),
  "utf8",
);

describe("supplier manual settlement market contract", () => {
  it("aligns the market-level settlement vocabulary with the supplier commercial profile", () => {
    expect(migration).toContain("'manual_supplier_settlement'");
    expect(profile).toContain("'manual_supplier_settlement'");
  });

  it("does not enable a market or execute payout mutations", () => {
    expect(migration).not.toContain("SET checkout_enabled = true");
    expect(migration).not.toContain("SET status = 'verified'");
    expect(migration).not.toContain("paymentIntents.create");
    expect(migration).not.toContain("transfers.create");
  });

  it("keeps payment fail-closed unless the reviewed market and supplier settlement models match", () => {
    expect(payment).toContain("supplierCommercialProfile.settlementModel !== commercialReadiness.settlementModel");
    expect(payment).toContain("SUPPLIER_SETTLEMENT_MODEL_MISMATCH");
  });
});
