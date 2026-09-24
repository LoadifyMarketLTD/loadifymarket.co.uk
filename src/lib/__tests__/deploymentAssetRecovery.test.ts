import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isDeploymentAssetError } from "../deploymentAssetRecovery";

describe("deployment asset recovery", () => {
  it("recognises stale Vite lazy chunk failures", () => {
    expect(isDeploymentAssetError(new Error("Failed to fetch dynamically imported module: https://loadifymarket.co.uk/assets/Signup-old.js"))).toBe(true);
    expect(isDeploymentAssetError(new Error("ChunkLoadError: Loading chunk 42 failed"))).toBe(true);
    expect(isDeploymentAssetError(new Error("Failed to load module script"))).toBe(true);
  });

  it("does not classify ordinary application errors as deployment asset failures", () => {
    expect(isDeploymentAssetError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isDeploymentAssetError(new Error("Registration failed"))).toBe(false);
  });

  it("wires both the Vite preload event and the global error boundary", () => {
    const main = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");
    const boundary = readFileSync(resolve(process.cwd(), "src/components/ErrorBoundary.tsx"), "utf8");
    expect(main).toContain("vite:preloadError");
    expect(main).toContain("recoverFromDeploymentAssetError");
    expect(boundary).toContain("recoverFromDeploymentAssetError(error)");
  });

  it("bumps the PWA cache generation for the hotfix", () => {
    const sw = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toContain("const CACHE_NAME = 'loadify-v4'");
  });
});
