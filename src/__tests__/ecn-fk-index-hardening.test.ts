import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260926110000_ecn_fk_index_hardening.sql"),
  "utf8",
);

const expectedIndexes = [
  ["private.actor_route_capabilities", "dispatch_location_id"],
  ["private.actor_route_capabilities", "reviewed_by"],
  ["private.actor_route_capabilities", "seller_id"],
  ["private.actor_route_capabilities", "supplier_id"],
  ["private.dispatch_locations", "reviewed_by"],
  ["private.market_routes", "changed_by"],
  ["private.route_decision_snapshots", "dispatch_location_id"],
  ["private.route_decision_snapshots", "seller_id"],
  ["private.route_decision_snapshots", "supplier_id"],
  ["private.supplier_marketplace_commercial_controls", "reviewed_by"],
  ["private.supplier_stripe_account_bindings", "verified_by"],
  ["private.supplier_warehouse_bindings", "reviewed_by"],
] as const;

describe("ECN foreign-key index hardening", () => {
  it("adds one idempotent covering index for each advisor finding", () => {
    for (const [table, column] of expectedIndexes) {
      expect(migration).toMatch(
        new RegExp(
          `CREATE INDEX IF NOT EXISTS [a-z0-9_]+\\s+ON ${table.replace(".", "\\.")} \\(${column}\\)`,
          "m",
        ),
      );
    }
    expect((migration.match(/CREATE INDEX IF NOT EXISTS/g) ?? []).length).toBe(expectedIndexes.length);
  });

  it("contains no schema or business-state mutation", () => {
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/i);
    expect(migration).not.toContain("market_launch_controls");
    expect(migration).not.toContain("market_legal_policy_versions");
    expect(migration).not.toContain("marketplace_tax_route_rules");
    expect(migration).not.toContain("supplier_marketplace_commercial_controls SET");
  });
});
