import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-country shipping readiness", () => {
  const migration = read("supabase/migrations/20260924154500_multicountry_shipping_readiness.sql");
  const validator = read("netlify/functions/_shared/shippingMethods.ts");

  it("keeps legacy shipping GB-only by default", () => {
    expect(migration).toContain('"marketCodes" text[] NOT NULL DEFAULT ARRAY[\'GB\']::text[]');
    expect(migration).toContain('"marketCode" text NOT NULL DEFAULT \'GB\'');
  });

  it("requires market-native shipping currency", () => {
    expect(migration).toContain('("marketCode"=\'GB\' AND currency=\'GBP\')');
    expect(migration).toContain('("marketCode"=\'RO\' AND currency=\'RON\')');
  });

  it("fails closed when a product lacks market shipping methods or rates", () => {
    expect(migration).toContain("shipping_method_missing");
    expect(migration).toContain("market_shipping_rate_missing");
    expect(migration).toContain("server_shipping_market_readiness_v1");
  });

  it("validates selected shipping methods against the active market", () => {
    expect(validator).toContain("marketCode: ShippingMarketCode = 'GB'");
    expect(validator).toContain(".contains('marketCodes', [marketCode])");
  });
});
