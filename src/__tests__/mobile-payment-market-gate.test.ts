import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "netlify/functions/create-payment-intent.ts"),
  "utf8",
);

describe("mobile payment market gate", () => {
  it("accepts only supported market codes", () => {
    expect(source).toContain("requestedMarket !== 'GB' && requestedMarket !== 'RO'");
    expect(source).toContain("PAYMENT_MARKET_INVALID");
  });

  it("keeps Romania mobile payments disabled", () => {
    expect(source).toContain("PAYMENT_MARKET_NOT_READY");
    expect(source).toContain("Mobile payments are not yet enabled for this market");
  });

  it("validates product market eligibility", () => {
    expect(source).toContain("productMarkets.includes(requestedMarket)");
    expect(source).toContain("PRODUCT_MARKET_NOT_ELIGIBLE");
  });

  it("requires the product currency to match the selected market", () => {
    expect(source).toContain("const expectedCurrency = requestedMarket === 'RO' ? 'RON' : 'GBP'");
    expect(source).toContain("productCurrency !== expectedCurrency");
    expect(source).toContain("PRODUCT_CURRENCY_MISMATCH");
  });
});
