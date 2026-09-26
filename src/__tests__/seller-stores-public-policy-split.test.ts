import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260926123000_split_seller_stores_public_select_policy.sql"),
  "utf8",
);

describe("seller_stores public SELECT policy split", () => {
  it("keeps anonymous storefront reads independent from authenticated-only admin helpers", () => {
    expect(migration).toContain("CREATE POLICY seller_stores_select_anon");
    expect(migration).toContain("TO anon");
    expect(migration).toContain('USING ("isActive" = true)');
    const anonBlock = migration.split("CREATE POLICY seller_stores_select_anon")[1]
      ?.split("CREATE POLICY seller_stores_select_authenticated")[0] ?? "";
    expect(anonBlock).not.toContain("is_admin");
    expect(anonBlock).not.toContain("auth.uid");
  });

  it("preserves owner/admin access for authenticated callers", () => {
    expect(migration).toContain("CREATE POLICY seller_stores_select_authenticated");
    expect(migration).toContain("TO authenticated");
    expect(migration).toContain('(select auth.uid()) = "userId"');
    expect(migration).toContain("(select public.is_admin())");
  });

  it("does not grant anonymous execution on admin helpers or mutate store data", () => {
    expect(migration).not.toMatch(/GRANT\s+EXECUTE[\s\S]*is_admin/i);
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  });
});
