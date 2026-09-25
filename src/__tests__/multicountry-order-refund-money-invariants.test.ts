import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260924173000_multicountry_order_refund_money_invariants.sql"), "utf8");
describe("multi-country order and refund money invariants", () => {
  it("binds markets to native currencies", () => {
    expect(migration).toContain("orders_market_currency_coherence_check");
    expect(migration).toContain("currency='GBP'");
    expect(migration).toContain("currency='RON'");
  });
  it("guards line item currency", () => {
    expect(migration).toContain("guard_order_item_market_currency_v1");
    expect(migration).toContain("order item currency must match order currency");
  });
  it("guards refund and recovery currency", () => {
    expect(migration).toContain("guard_supplier_refund_market_currency_v1");
    expect(migration).toContain("guard_supplier_recovery_market_currency_v1");
  });
  it("guards reconciliation currency", () => {
    expect(migration).toContain("guard_supplier_reconciliation_market_currency_v1");
  });
});
