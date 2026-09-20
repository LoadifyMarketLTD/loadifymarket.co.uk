import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin supplier economics decision runtime boundary", () => {
  const endpoint = repo("netlify/functions/admin-supplier-economics-decision.ts");
  const wrapper = repo("netlify/functions-modern/admin-supplier-economics-decision.ts");

  it("is admin-only and exposed through the modern Netlify runtime", () => {
    expect(wrapper).toContain("../functions/admin-supplier-economics-decision");
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["admin"])');
  });

  it("reuses the canonical Phase G evaluator without writing economics", () => {
    expect(endpoint).toContain("evaluateSupplierEconomics(admin");
    expect(endpoint).not.toContain("mutateSupplierEconomics");
    expect(endpoint).not.toContain("record_landed_cost");
    expect(endpoint).not.toContain("record_pricing");
  });

  it("defaults operator commerce to supplier-fulfilled GB", () => {
    expect(endpoint).toContain('"loadify_supplier_fulfilled"');
    expect(endpoint).toContain('"GB"');
  });
});
