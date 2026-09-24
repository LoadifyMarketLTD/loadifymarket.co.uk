import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const checkout = readFileSync(resolve(process.cwd(), "src/pages/pixel-perfect/Checkout.tsx"), "utf8");
const web = readFileSync(resolve(process.cwd(), "netlify/functions/create-checkout.ts"), "utf8");
const mobile = readFileSync(resolve(process.cwd(), "netlify/functions/create-payment-intent.ts"), "utf8");
const supplier = readFileSync(resolve(process.cwd(), "netlify/functions/prepare-supplier-checkout.ts"), "utf8");

describe("multi-country checkout address parity", () => {
  it("sends the selected market from checkout UI", () => {
    expect(checkout).toContain("marketCode: market");
    expect(checkout).toContain("country: market");
    expect(checkout).toContain("validateMarketAddress(address, market)");
  });

  it("validates web checkout billing and shipping addresses", () => {
    expect(web).toContain("BILLING_ADDRESS_MARKET_INVALID");
    expect(web).toContain("SHIPPING_ADDRESS_MARKET_INVALID");
  });

  it("validates mobile payment billing and shipping addresses", () => {
    expect(mobile).toContain("BILLING_ADDRESS_MARKET_INVALID");
    expect(mobile).toContain("SHIPPING_ADDRESS_MARKET_INVALID");
  });

  it("validates supplier checkout addresses", () => {
    expect(supplier).toContain("SUPPLIER_CHECKOUT_ADDRESS_INVALID");
    expect(supplier).toContain("validateMarketAddress(shippingAddress, requestedMarket)");
  });
});
