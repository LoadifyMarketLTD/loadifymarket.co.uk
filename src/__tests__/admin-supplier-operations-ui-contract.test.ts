import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/pixel-perfect/admin/AdminOrders.tsx"),
  "utf8",
);

describe("admin supplier operations UI contract", () => {
  it("exposes a dedicated supplier operations view", () => {
    expect(source).toContain('value="supplier"');
    expect(source).toContain("Supplier-Fulfilled Operations");
    expect(source).toContain("admin-supplier-order-runtime");
  });

  it("surfaces controlled submit, recovery, tracking and return operations", () => {
    expect(source).toContain("Submit to supplier");
    expect(source).toContain("Recover acknowledgement");
    expect(source).toContain("Sync tracking");
    expect(source).toContain("Request supplier return");
    expect(source).toContain("Poll supplier recovery");
  });

  it("keeps supplier status canonical instead of manually editable", () => {
    expect(source).toContain('selected.commercialMode === "loadify_supplier_fulfilled"');
    expect(source).toContain("cannot be manually overridden here");
    expect(source).toContain("Buyer refund is independent from supplier reimbursement");
  });
});
