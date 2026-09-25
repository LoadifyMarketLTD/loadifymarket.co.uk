import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("home market provider regression", () => {
  it("wraps the public homepage in MarketProvider because SEO consumes useMarket", () => {
    const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    const homeBranch = app.slice(app.indexOf("if (location.pathname === '/')"), app.indexOf("return (\n    <MarketProvider>", app.indexOf("if (location.pathname === '/')") + 1));
    expect(homeBranch).toContain("<MarketProvider>");
    expect(homeBranch).toContain("<Home />");
    expect(homeBranch).toContain("</MarketProvider>");
  });
});
