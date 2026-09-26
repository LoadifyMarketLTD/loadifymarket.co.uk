import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260926124500_optimize_remaining_auth_rls_initplans.sql"),
  "utf8",
);

describe("remaining RLS auth initplan optimization", () => {
  it("updates exactly the 33 advisor-reported policies", () => {
    expect((migration.match(/ALTER POLICY /g) ?? []).length).toBe(33);
  });

  it("uses select-wrapped auth context throughout policy expressions", () => {
    const normalized = migration
      .replaceAll("(select auth.uid())", "")
      .replaceAll("(select auth.role())", "");
    expect(normalized).not.toContain("auth.uid()");
    expect(normalized).not.toContain("auth.role()");
  });

  it("does not change grants, roles, data, tables or functions", () => {
    expect(migration).not.toMatch(/\b(GRANT|REVOKE|INSERT|UPDATE|DELETE|TRUNCATE|DROP TABLE|CREATE TABLE|CREATE FUNCTION|DROP FUNCTION)\b/i);
    expect(migration).not.toContain("market_launch_controls");
    expect(migration).not.toContain("market_legal_policy_versions");
  });

  it("preserves admin and participant checks on sensitive policies", () => {
    expect(migration).toContain('(select public.is_admin())');
    expect(migration).toContain('d."buyerId" = (select auth.uid())');
    expect(migration).toContain('d."sellerId" = (select auth.uid())');
    expect(migration).toContain('(select auth.role()) = \'service_role\'');
  });
});
