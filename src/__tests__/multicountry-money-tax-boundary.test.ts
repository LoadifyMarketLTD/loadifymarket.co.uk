import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-country money and tax boundary", () => {
  const migration = read("supabase/migrations/20260924153000_multicountry_market_native_pricing.sql");
  const payment = read("netlify/functions/create-supplier-payment-intent.ts");

  it("requires market-native product pricing evidence", () => {
    expect(migration).toContain("product_market_price_versions");
    expect(migration).toContain("(market_code='GB' AND currency='GBP')");
    expect(migration).toContain("(market_code='RO' AND currency='RON')");
    expect(migration).toContain("approved_market_price_missing");
    expect(migration).toContain("tax_inclusion <> 'unknown'");
  });

  it("allows supplier economics for Romania only with RON pricing and RO tax evidence", () => {
    expect(migration).toContain("v_territory NOT IN ('GB','RO')");
    expect(migration).toContain("CASE WHEN v_territory='GB' THEN 'GBP' ELSE 'RON' END");
    expect(migration).toContain("p.currency=v_expected_currency");
    expect(migration).toContain("v_tax.territory<>v_territory");
    expect(migration).toContain("v_landed.destination_territory<>v_territory");
  });

  it("defines transaction, display and settlement currency semantics", () => {
    expect(migration).toContain('"displayCurrency" text NOT NULL DEFAULT \'GBP\'');
    expect(migration).toContain('"settlementCurrency" text NOT NULL DEFAULT \'GBP\'');
    expect(migration).toContain("Transaction currency: the currency contractually charged to the buyer");
    expect(migration).toContain("Conversion requires explicit FX evidence");
  });

  it("keeps supplier payment fail-closed unless the market/currency and runtime launch gate agree", () => {
    expect(payment).toContain('expectedCurrency = orderMarket === "RO" ? "RON" : orderMarket === "GB" ? "GBP" : null');
    expect(payment).toContain("marketPaymentIsLive(admin, orderMarket as LaunchMarket)");
    expect(payment).toContain("SUPPLIER_PAYMENT_MARKET_NOT_READY");
    expect(payment).toContain("p_territory: order.marketCode");
    expect(payment).toContain("currency: order.currency.toLowerCase()");
    expect(payment).not.toContain('p_territory: "GB"');
  });

  it("never treats display currency as transaction currency", () => {
    expect(migration).toContain("It must never be used to reinterpret the transaction amount");
  });
});
