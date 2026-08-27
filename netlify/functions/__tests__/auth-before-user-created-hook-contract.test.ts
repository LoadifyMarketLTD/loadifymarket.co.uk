import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const numericPath = path.join(
  root,
  "supabase",
  "678_auth_before_user_created_hook.sql",
);

const timestampedPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260826070000_auth_before_user_created_hook.sql",
);

const sql = fs.readFileSync(numericPath, "utf8");
const timestampedSql = fs.readFileSync(timestampedPath, "utf8");

describe("Before User Created signup-intent hook contract", () => {
  it("keeps the numeric and timestamped migration copies identical", () => {
    expect(timestampedSql).toBe(sql);
  });

  it("uses the official Postgres Auth hook function shape", () => {
    expect(sql).toContain(
      "public.before_user_created_validate_signup_intent(event jsonb)",
    );
    expect(sql).toContain("returns jsonb");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
  });

  it("grants execution only to supabase_auth_admin", () => {
    expect(sql).toContain("to supabase_auth_admin");
    expect(sql).toContain("from public, anon, authenticated, service_role");
    expect(sql).toContain(
      "'supabase_auth_admin must execute before_user_created_validate_signup_intent'",
    );
  });

  it("does not expose the private schema to clients", () => {
    expect(sql).toContain("has_schema_privilege('anon', 'private', 'USAGE')");
    expect(sql).toContain(
      "has_schema_privilege('authenticated', 'private', 'USAGE')",
    );
    expect(sql).not.toMatch(
      /grant\s+usage\s+on\s+schema\s+private\s+to\s+(anon|authenticated)/i,
    );
  });

  it("rejects client-controlled role metadata", () => {
    expect(sql).toContain("v_user_metadata ? 'role'");
    expect(sql).toContain("v_app_metadata ? 'role'");
    expect(sql).toContain("client role metadata is forbidden");
  });

  it("requires provider-bound authorization for fresh Google creation", () => {
    expect(sql).toContain("if v_provider = 'google' then");
    expect(sql).toContain("v_user_metadata->>'sub'");
    expect(sql).toContain("si.auth_provider = 'google'");
    expect(sql).toContain("si.provider_subject = v_provider_subject");
    expect(sql).toContain("lower(trim(si.email)) = v_email");
    expect(sql).toContain("Google registration authorization not found");
  });

  it("keeps fresh Facebook account creation fail-closed", () => {
    expect(sql).toContain("elsif v_provider = 'facebook' then");
    expect(sql).toContain(
      "Facebook signup requires registration authorization",
    );
  });

  it("requires an email-only intent for email signup", () => {
    expect(sql).toContain("elsif v_provider = 'email' then");
    expect(sql).toContain("v_user_metadata->>'intent_id'");
    expect(sql).toContain("si.auth_provider = 'email'");
    expect(sql).toContain("si.provider_subject is null");
    expect(sql).toContain("signup intent is required");
    expect(sql).toContain("signup intent not found");
  });

  it("validates single-use and expiry state", () => {
    expect(sql).toContain("v_intent.consumed_at is not null");
    expect(sql).toContain("signup intent already consumed");
    expect(sql).toContain("v_intent.expires_at <= now()");
    expect(sql).toContain("signup intent expired");
  });

  it("binds the intent to the normalized email", () => {
    expect(sql).toContain("lower(trim(v_intent.email)) <> v_email");
    expect(sql).toContain("signup intent email mismatch");
  });

  it("accepts only Buyer or Seller signup intents", () => {
    expect(sql).toContain("v_intent.requested_role not in ('buyer', 'seller')");
    expect(sql).toContain("unsupported signup role");
  });

  it("validates seller type invariants", () => {
    expect(sql).toContain("('individual', 'sole_trader', 'company')");
    expect(sql).toContain("seller signup intent is incomplete");
    expect(sql).toContain("buyer signup intent is invalid");
  });

  it("does not consume the intent in the before-user-created hook", () => {
    expect(sql).not.toMatch(
      /update\s+private\.signup_intents[\s\S]*set\s+consumed_at/i,
    );
  });

  it("contains no fail-open catch-all exception path", () => {
    expect(sql).not.toContain("EXCEPTION WHEN OTHERS");
    expect(sql).not.toContain("RAISE WARNING");
  });

  it("fails closed when registration availability cannot be trusted", () => {
    expect(sql).toContain("public.platform_settings");
    expect(sql).toContain(
      "coalesce(jsonb_typeof(v_feature_flags), '') <> 'object'",
    );
    expect(sql).toContain("ps.key = 'feature_flags'");
    expect(sql).toContain(
      "coalesce(jsonb_typeof(v_feature_flags->'buyerRegistration'), '') <> 'boolean'",
    );
    expect(sql).toContain(
      "coalesce(jsonb_typeof(v_feature_flags->'sellerRegistration'), '') <> 'boolean'",
    );
    expect(sql).toContain("registration availability could not be verified");
  });

  it("does not derive Google Buyer or Seller authority from client metadata", () => {
    const googleSection =
      sql.split("if v_provider = 'google' then")[1]
        ?.split("elsif v_provider = 'facebook' then")[0] ?? "";

    expect(googleSection).toContain("private.signup_intents");
    expect(googleSection).toContain("v_user_metadata->>'sub'");
    expect(googleSection).not.toContain("requested_role := 'buyer'");
    expect(googleSection).not.toContain("requested_role := 'seller'");
    expect(googleSection).not.toContain("return '{}'::jsonb");
  });

  it("rechecks current Buyer and Seller policy after intent creation", () => {
    expect(sql).toContain("v_intent.requested_role = 'buyer'");
    expect(sql).toContain("v_intent.requested_role = 'seller'");
    expect(sql).toContain("not v_buyer_registration");
    expect(sql).toContain("not v_seller_registration");
    expect(sql).toContain("seller registration is temporarily disabled");
  });

  it("does not activate hosted Auth hook configuration in SQL", () => {
    expect(sql).not.toContain("hook_uri");
    expect(sql).not.toContain("hook_enabled");
    expect(sql).not.toContain("pg_net");
  });
});
