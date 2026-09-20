import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("operator merchandising review runtime boundary", () => {
  const endpoint = repo("netlify/functions/admin-operator-merchandising-review.ts");
  const migration = repo("supabase/migrations/20260920192754_operator_merchandising_review.sql");

  it("requires admin auth and re-evaluates publication gates server-side", () => {
    expect(endpoint).toContain('authenticateActiveAccount(event, admin, ["admin"])');
    expect(endpoint).toContain("evaluateSupplierImport");
    expect(endpoint).toContain("evaluateSupplierEconomics");
    expect(endpoint).toContain("Publication gate is not eligible");
  });

  it("records an immutable digest without publishing", () => {
    expect(endpoint).toContain('createHash("sha256")');
    expect(endpoint).toContain("server_approve_operator_merchandising_v1");
    expect(endpoint).toContain("publicationPerformed: false");
    expect(endpoint).toContain("marketplaceMutationPerformed: false");
  });

  it("keeps the review table private and RPC service-role only", () => {
    expect(migration).toContain("private.operator_merchandising_reviews");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain("Approval does not publish or expose a marketplace listing");
  });
});
