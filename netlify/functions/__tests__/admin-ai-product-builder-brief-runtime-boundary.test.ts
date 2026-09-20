import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin AI Product Builder brief runtime boundary", () => {
  const endpoint = repo("netlify/functions/admin-ai-product-builder-brief.ts");
  const wrapper = repo("netlify/functions-modern/admin-ai-product-builder-brief.ts");

  it("is admin-authenticated and reads verified facts from canonical storage", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(endpoint).toContain("readVerifiedCanonicalProductFacts");
    expect(endpoint).toContain("canonicalProductId");
    expect(endpoint).not.toContain("body.facts");
  });

  it("uses the facts-lock contract and performs no provider or marketplace mutation", () => {
    expect(endpoint).toContain("prepareAiProductBuilderBrief");
    expect(endpoint).toContain("providerCalled: false");
    expect(endpoint).toContain("publicationPerformed: false");
    expect(endpoint).not.toContain("OPENAI_API_KEY");
    expect(endpoint).not.toContain("fetch(");
  });

  it("has a modern function wrapper", () => {
    expect(wrapper).toContain("../functions/admin-ai-product-builder-brief");
    expect(wrapper).toContain("withLambda(handler)");
  });
});
