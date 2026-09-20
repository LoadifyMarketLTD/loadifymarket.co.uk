import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin AI Product Builder generate runtime boundary", () => {
  const endpoint = repo("netlify/functions/admin-ai-product-builder-generate.ts");
  const provider = repo("netlify/functions/_shared/aiProductBuilderProvider.ts");

  it("is admin-only and rebuilds the brief from canonical verified facts", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(endpoint).toContain("readVerifiedCanonicalProductFacts");
    expect(endpoint).toContain("prepareAiProductBuilderBrief");
    expect(endpoint).not.toContain("body.facts");
  });

  it("keeps provider credentials server-side and feature gated", () => {
    expect(provider).toContain("LOADIFY_AI_PRODUCT_BUILDER_ENABLED");
    expect(provider).toContain("LOADIFY_AI_PRODUCT_BUILDER_API_KEY");
    expect(provider).toContain("LOADIFY_AI_PRODUCT_BUILDER_PROVIDER_URL");
    expect(provider).toContain("validateAiProductBuilderDraft");
    expect(provider).not.toContain("VITE_LOADIFY_AI");
  });

  it("never publishes from generation", () => {
    expect(endpoint).toContain("publicationPerformed: false");
    expect(endpoint).toContain("marketplaceMutationPerformed: false");
  });
});
