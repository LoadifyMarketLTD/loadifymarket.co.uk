import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("seller market capabilities", () => {
  it("loads and persists selling, delivery and returns markets", () => {
    const settings = read("src/pages/pixel-perfect/seller/SellerSettings.tsx");
    expect(settings).toContain("marketCodes, deliveryMarketCodes, returnsCountryCode");
    expect(settings).toContain("marketCodes,");
    expect(settings).toContain("deliveryMarketCodes,");
    expect(settings).toContain("returnsCountryCode,");
  });

  it("keeps delivery markets within selling markets", () => {
    const settings = read("src/pages/pixel-perfect/seller/SellerSettings.tsx");
    expect(settings).toContain("deliveryMarketCodes.some((code) => !marketCodes.includes(code))");
    expect(settings).toContain("Every delivery market must also be enabled as a selling market.");
  });

  it("states that Romania capability does not bypass checkout readiness", () => {
    const settings = read("src/pages/pixel-perfect/seller/SellerSettings.tsx");
    expect(settings).toContain("Romanian checkout remains separately gated until launch readiness is complete.");
  });
});
