import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

const buyer = read("src/pages/pixel-perfect/BuyerTerms.tsx");
const returnsPolicy = read("src/pages/pixel-perfect/ReturnsPolicy.tsx");
const shipping = read("src/pages/pixel-perfect/ShippingPolicy.tsx");
const privacyWeb = read("src/pages/pixel-perfect/PrivacyPolicyWeb.tsx");
const privacyMobile = read("src/pages/pixel-perfect/PrivacyPolicyMobile.tsx");

describe("Romania legal policy routing", () => {
  it.each([
    ["buyer terms", buyer, "RomaniaBuyerTerms"],
    ["returns", returnsPolicy, "RomaniaReturnsPolicy"],
    ["shipping", shipping, "RomaniaShippingPolicy"],
    ["privacy web", privacyWeb, "RomaniaPrivacyPolicy"],
    ["privacy native/mobile", privacyMobile, "RomaniaPrivacyPolicy"],
  ])("routes RO %s to the Romanian policy component", (_name, source, component) => {
    expect(source).toContain('market === "RO"');
    expect(source).toContain(component);
  });

  it("keeps the native privacy surface market-aware instead of hard-wiring UK policy", () => {
    expect(privacyMobile).toContain('const { market } = useMarket()');
    expect(privacyMobile).toContain('title="Politica de confidențialitate | Loadify Market"');
  });
});
