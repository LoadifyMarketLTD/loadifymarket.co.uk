import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925163000_ecn_cross_border_domain_foundation.sql"),
  "utf8",
);

describe("ECN cross-border domain foundation", () => {
  it("creates private route, location, capability and decision primitives", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS private.market_routes");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS private.dispatch_locations");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS private.actor_route_capabilities");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS private.route_decision_snapshots");
  });

  it("keeps the existing UK domestic route live", () => {
    expect(migration).toContain("('GB-GB','GB','GB','GB','live',true,true,true,true,true");
  });

  it("keeps every Romania route fail-closed", () => {
    expect(migration).toContain("('RO-RO','RO','RO','RO','prelaunch',true,true,false,false,false");
    expect(migration).toContain("('GB-RO','GB','RO','RO','prelaunch',false,false,false,false,false");
    expect(migration).toContain("('RO-GB','RO','GB','GB','prelaunch',false,false,false,false,false");
    expect(migration).toContain("CHECK (NOT checkout_enabled OR status='live')");
  });

  it("does not create a duplicate market pricing source", () => {
    expect(migration).not.toContain("CREATE TABLE IF NOT EXISTS private.product_market_offers");
    expect(migration).toContain("Market-native pricing continues to use private.product_market_price_versions");
  });

  it("keeps destination country distinct from destination market and binds verified capability to physical origin", () => {
    expect(migration).toContain("destination_country text NOT NULL");
    expect(migration).toContain("route_key = origin_country || '-' || destination_country");
    expect(migration).toContain("dispatch location country does not match route origin");
    expect(migration).toContain("verified route capability requires verified dispatch location");
    expect(migration).toContain("verification_status <> 'verified'");
  });

  it("prevents verified actor capabilities from exceeding broad seller/supplier declarations", () => {
    expect(migration).toContain("verified route offer exceeds seller market capability");
    expect(migration).toContain("verified route fulfilment exceeds seller delivery capability");
    expect(migration).toContain("verified route offer exceeds supplier market capability");
    expect(migration).toContain("verified route fulfilment exceeds supplier delivery capability");
  });

  it("keeps the new operational tables private", () => {
    for (const table of [
      "private.market_routes",
      "private.dispatch_locations",
      "private.actor_route_capabilities",
      "private.route_decision_snapshots",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON TABLE ${table}`);
    }
  });

  it("exposes only a service-role baseline decision interface", () => {
    expect(migration).toContain("server_market_route_baseline_v1");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.server_market_route_baseline_v1(text,text,text)");
    expect(migration).toContain("TO service_role");
  });
});
