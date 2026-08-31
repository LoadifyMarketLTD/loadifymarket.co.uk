import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const signup = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "pages",
    "pixel-perfect",
    "Signup.tsx",
  ),
  "utf8",
);

describe("signup newsletter preference contract", () => {
  it("keeps newsletter as user-editable metadata in native Supabase signup", () => {
    expect(signup).toContain("intent_id: intentPayload.intentId");
    expect(signup).toContain("newsletter: form.newsletter");
  });

  it("does not move newsletter into the server-owned signup intent request", () => {
    const intentStart = signup.indexOf(
      'fetch("/.netlify/functions/register-intent"',
    );
    const signUpStart = signup.indexOf("supabase.auth.signUp");

    expect(intentStart).toBeGreaterThanOrEqual(0);
    expect(signUpStart).toBeGreaterThan(intentStart);

    const intentSection = signup.slice(intentStart, signUpStart);

    expect(intentSection).not.toContain("newsletter:");
  });

  it("does not reintroduce client-controlled authorization metadata", () => {
    const signUpStart = signup.indexOf("supabase.auth.signUp");
    expect(signUpStart).toBeGreaterThanOrEqual(0);

    const signUpSection = signup.slice(signUpStart);

    expect(signUpSection).not.toContain('role: form.role');
    expect(signUpSection).not.toContain('role: "buyer"');
    expect(signUpSection).not.toContain('role: "seller"');
  });
});
