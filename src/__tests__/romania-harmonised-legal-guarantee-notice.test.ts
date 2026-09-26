import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const assetPath = resolve(process.cwd(), "public/legal/eu-legal-guarantee-notice-ro.png");
const checkout = readFileSync(resolve(process.cwd(), "src/pages/pixel-perfect/Checkout.tsx"), "utf8");
const officialSha256 = "51d641e25d29a9cd4d087a6540d474ade46fd52b2e38f1ac65befb1108caa032";

describe("Romania harmonised legal guarantee notice", () => {
  it("keeps the official Romanian Commission asset byte-identical", () => {
    expect(existsSync(assetPath)).toBe(true);
    const actual = createHash("sha256").update(readFileSync(assetPath)).digest("hex");
    expect(actual).toBe(officialSha256);
  });

  it("renders the official notice only inside the RO pre-order disclosure", () => {
    expect(checkout).toContain('market === "RO"');
    expect(checkout).toContain('src="/legal/eu-legal-guarantee-notice-ro.png"');
    expect(checkout).toContain("Garanția legală de conformitate");
  });

  it("places the notice before the payment-obligation order button", () => {
    const noticeIndex = checkout.indexOf('src="/legal/eu-legal-guarantee-notice-ro.png"');
    const buttonIndex = checkout.indexOf('"Comandă cu obligație de plată"');
    expect(noticeIndex).toBeGreaterThan(-1);
    expect(buttonIndex).toBeGreaterThan(noticeIndex);
  });
});
