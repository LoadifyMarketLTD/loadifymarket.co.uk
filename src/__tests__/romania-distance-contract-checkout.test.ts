import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/pages/pixel-perfect/Checkout.tsx"), "utf8");

describe("Romania distance-contract checkout disclosure", () => {
  it("shows the RO pre-order disclosure only in the Romania market", () => {
    expect(source).toContain('market === "RO"');
    expect(source).toContain("Informații înainte de comandă");
    expect(source).toContain("obligație de plată");
  });

  it("links the buyer to the transaction policies before ordering", () => {
    expect(source).toContain('href="/buyer-terms"');
    expect(source).toContain('href="/returns"');
    expect(source).toContain('href="/shipping"');
    expect(source).toContain('href="/privacy"');
  });

  it("uses explicit payment-obligation wording on the Romania order button", () => {
    expect(source).toContain('"Comandă cu obligație de plată"');
  });
});
