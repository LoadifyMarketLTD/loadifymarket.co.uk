import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin supplier publication gate runtime boundary", () => {
  const endpoint = repo("netlify/functions/admin-supplier-publication-gate.ts");

  it("is admin-only and evaluates existing governance and economics decisions", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(endpoint).toContain("evaluateSupplierImport");
    expect(endpoint).toContain("evaluateSupplierEconomics");
    expect(endpoint).toContain('"loadify_supplier_fulfilled"');
    expect(endpoint).toContain('"GB"');
  });

  it("is read-only and performs no publication or provider write", () => {
    expect(endpoint).toContain("marketplaceMutationPerformed: false");
    expect(endpoint).toContain("publicationPerformed: false");
    expect(endpoint).toContain("providerWriteMutationPerformed: false");
    expect(endpoint).not.toContain("mutateSupplierImport");
    expect(endpoint).not.toContain("create-product");
  });
});
