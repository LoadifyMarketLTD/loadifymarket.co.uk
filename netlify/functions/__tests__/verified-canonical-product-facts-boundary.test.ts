import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("verified canonical product facts boundary", () => {
  const migration = repo("supabase/migrations/20260920191509_verified_canonical_product_facts_read.sql");
  const helper = repo("netlify/functions/_shared/verifiedCanonicalProductFacts.ts");

  it("returns only reviewed non-AI canonical facts", () => {
    expect(migration).toContain("review_status = 'verified'");
    expect(migration).toContain("source_class <> 'ai_proposed'");
    expect(migration).toContain("DISTINCT ON (fact_key)");
  });

  it("keeps the read RPC service-role only and security-invoker", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).not.toContain("SECURITY DEFINER");
    expect(migration).toContain("GRANT USAGE ON SCHEMA private TO service_role");
    expect(migration).toContain("GRANT SELECT ON TABLE private.normalized_product_facts TO service_role");
    expect(migration).toContain("REVOKE ALL ON FUNCTION");
    expect(migration).toContain("FROM authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("fails closed when canonical facts are absent", () => {
    expect(helper).toContain("No verified canonical product facts are available");
    expect(helper).toContain("factCount < 1");
  });
});
