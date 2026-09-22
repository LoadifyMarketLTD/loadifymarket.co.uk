import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const panel = repo("src/pages/pixel-perfect/admin/ControlledPilotReadiness.tsx");
const sourcing = repo("src/pages/pixel-perfect/admin/AdminProductSourcing.tsx");
const api = repo("netlify/functions/admin-supplier-pilot.ts");

describe("controlled pilot operator readiness UI", () => {
  it("exposes status readiness and acceptance through the authenticated pilot API", () => {
    expect(panel).toContain('"/.netlify/functions/admin-supplier-pilot"');
    expect(panel).toContain('"status" | "readiness" | "acceptance"');
    expect(api).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it("keeps activation unavailable from the readiness panel", () => {
    expect(panel).toContain("This panel cannot create, prepare or activate a pilot.");
    expect(panel).not.toContain('action: "activate"');
    expect(panel).not.toContain('action: "create"');
    expect(panel).not.toContain('action: "prepare"');
  });

  it("shows fail-closed pilot and global commerce controls", () => {
    expect(panel).toContain("Pilot master control");
    expect(panel).toContain("Global supplier commerce");
    expect(panel).toContain("Simulator PASS is not Pilot PASS");
  });

  it("is mounted in Admin Product Sourcing", () => {
    expect(sourcing).toContain('import ControlledPilotReadiness from "./ControlledPilotReadiness"');
    expect(sourcing).toContain("<ControlledPilotReadiness />");
  });
});
