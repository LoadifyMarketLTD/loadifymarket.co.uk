import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repo = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("Romania legal presentation", () => {
  it("provides Romanian buyer, return, shipping and privacy content without marking database policy evidence verified", () => {
    const content = repo("src/components/legal/RomaniaLegalContent.tsx");
    expect(content).toContain("Termeni pentru cumpărători");
    expect(content).toContain("Politica de retur");
    expect(content).toContain("Politica de livrare");
    expect(content).toContain("Politica de confidențialitate");
    expect(content).toContain("proiect pre-lansare");
    expect(content).not.toContain("status='verified'");
  });

  it("selects Romanian content from the active market on all required policy routes", () => {
    for (const file of [
      "src/pages/pixel-perfect/BuyerTerms.tsx",
      "src/pages/pixel-perfect/ReturnsPolicy.tsx",
      "src/pages/pixel-perfect/ShippingPolicy.tsx",
      "src/pages/pixel-perfect/PrivacyPolicyWeb.tsx",
    ]) {
      const source = repo(file);
      expect(source).toContain('market === "RO"');
      expect(source).toContain("Romania");
    }
  });
});
