import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("operator product URL preview runtime boundary", () => {
  const endpoint = repo("netlify/functions/admin-product-source-preview.ts");
  const wrapper = repo("netlify/functions-modern/admin-product-source-preview.ts");

  it("is exposed through the modern Netlify runtime wrapper", () => {
    expect(wrapper).toContain("../functions/admin-product-source-preview");
    expect(wrapper).toContain("withLambda(handler)");
  });

  it("requires an active admin account and never writes product state", () => {
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, [\"admin\"])");
    expect(endpoint).toContain("previewOperatorProductUrl(url)");
    expect(endpoint).not.toContain(".from(\"products\")");
    expect(endpoint).not.toContain("create-product");
    expect(endpoint).not.toContain("mutateSupplierImport");
  });
});
