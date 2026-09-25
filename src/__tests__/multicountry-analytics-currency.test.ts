import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-country analytics currency propagation", () => {
  it("does not hard-code GBP in commerce event payloads", () => {
    const source = read("src/lib/analytics.ts");
    expect(source).toContain('currency: params.currency ?? "GBP"');
    expect(source).toContain("currency,");
    expect(source).not.toContain('currency: "GBP"');
  });

  it("propagates market currency from product detail events", () => {
    const source = read("src/pages/pixel-perfect/ProductDetail.tsx");
    expect(source).toContain("trackProductView(supplierProduct.id, supplierProduct.title, supplierProduct.price, config.currency)");
    expect(source).toContain("trackProductView(adapted.id, adapted.title, adapted.price, config.currency)");
    expect(source).toContain("trackAddToCart(product.id, product.title, product.price, config.currency)");
  });

  it("returns and consumes payment-session currency for purchase analytics", () => {
    const status = read("netlify/functions/checkout-status.ts");
    const success = read("src/pages/OrderSuccessPage.tsx");
    expect(status).toContain(".select('status, orderId, amount, currency')");
    expect(success).toContain('currency: data.currency ?? "GBP"');
  });
});
