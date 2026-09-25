import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "netlify/functions/prepare-supplier-checkout.ts"),
  "utf8",
);

describe("supplier checkout market gate", () => {
  it("accepts an explicit market input but defaults legacy requests to GB", () => {
    expect(source).toContain('body.marketCode');
    expect(source).toContain(': "GB"');
  });

  it("rejects unsupported markets before supplier selection", () => {
    expect(source).toContain("SUPPLIER_CHECKOUT_MARKET_INVALID");
    expect(source).toContain('requestedMarket !== "GB" && requestedMarket !== "RO"');
  });

  it("keeps Romania supplier checkout disabled until the explicit runtime launch control is live", () => {
    expect(source).toContain("SUPPLIER_CHECKOUT_MARKET_NOT_READY");
    expect(source).toContain("marketCheckoutIsLive(admin, requestedMarket as LaunchMarket)");
    expect(source).toContain("paymentSessionCreated: false");
  });

  it("passes the validated market into supplier selection", () => {
    expect(source).toContain("territory: requestedMarket");
    expect(source).not.toContain('territory: "GB"');
  });
});
