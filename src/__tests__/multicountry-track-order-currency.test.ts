import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-country track order currency", () => {
  it("returns the order currency from the public tracking endpoint", () => {
    const source = read("netlify/functions/track-shipment.ts");
    expect(source).toContain("currency,");
    expect(source).toContain("currency: order.currency || 'GBP'");
  });

  it("formats the tracked order total using the returned currency", () => {
    const source = read("src/pages/TrackOrderPage.tsx");
    expect(source).toContain("trackingData.order.currency ?? 'GBP'");
    expect(source).not.toContain("£{trackingData.order.total.toFixed(2)}");
  });
});
