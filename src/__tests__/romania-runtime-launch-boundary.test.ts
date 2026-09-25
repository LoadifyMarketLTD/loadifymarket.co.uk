import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repo = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("Romania launch runtime boundary", () => {
  it("keeps the client fail-closed until the private launch control reports live checkout and payment", () => {
    const context = repo("src/contexts/MarketContext.tsx");
    expect(context).toContain("market-launch-status?market=RO");
    expect(context).toContain("launchDecision.status === 'live'");
    expect(context).toContain("launchDecision.checkoutEnabled && launchDecision.paymentEnabled");
  });

  it("exposes only the launch decision and keeps service-role access server-side", () => {
    const endpoint = repo("netlify/functions/market-launch-status.ts");
    expect(endpoint).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(endpoint).toContain("readMarketLaunchDecision");
    expect(endpoint).not.toContain("market_launch_controls");
  });

  it("gates marketplace and supplier checkout/payment through the launch control", () => {
    const checkout = repo("netlify/functions/create-checkout.ts");
    const mobile = repo("netlify/functions/create-payment-intent.ts");
    const supplierCheckout = repo("netlify/functions/prepare-supplier-checkout.ts");
    const supplierPayment = repo("netlify/functions/create-supplier-payment-intent.ts");
    expect(checkout).toContain("marketCheckoutIsLive");
    expect(mobile).toContain("marketPaymentIsLive");
    expect(supplierCheckout).toContain("marketCheckoutIsLive");
    expect(supplierPayment).toContain("marketPaymentIsLive");
  });

  it("uses RON end-to-end after RO is explicitly live without changing the GB default", () => {
    const checkout = repo("netlify/functions/create-checkout.ts");
    const mobile = repo("netlify/functions/create-payment-intent.ts");
    const supplierPayment = repo("netlify/functions/create-supplier-payment-intent.ts");
    expect(checkout).toContain("marketCode === 'RO' ? 'RON' : 'GBP'");
    expect(checkout).toContain("currency: expectedCurrency");
    expect(mobile).toContain("requestedMarket === 'RO' ? 'RON' : 'GBP'");
    expect(mobile).toContain("currency: expectedCurrency");
    expect(supplierPayment).toContain('expectedCurrency = orderMarket === "RO" ? "RON"');
    expect(supplierPayment).toContain("currency: order.currency");
  });
});
