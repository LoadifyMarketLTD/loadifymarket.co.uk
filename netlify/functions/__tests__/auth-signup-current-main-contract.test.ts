import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const foundation = read(
  'supabase/migrations/20260829080642_auth_signup_intent_foundation_676.sql',
);
const control = read(
  'supabase/migrations/20260829080831_auth_signup_cutover_control_676a.sql',
);
const provisioning = read(
  'supabase/migrations/20260829080911_auth_signup_intent_consumption_677_cutover_safe.sql',
);
const hook = read(
  'supabase/migrations/20260829080941_auth_before_user_created_hook_678_cutover_safe.sql',
);

describe('current-main Auth signup cutover contract', () => {
  it('uses the hosted-canonical signup intent migration identities', () => {
    expect(foundation).toContain('CREATE TABLE IF NOT EXISTS private.signup_intents');
    expect(foundation).toContain("CHECK (requested_role IN ('buyer', 'seller'))");
    expect(foundation).toContain('public.create_signup_intent');
    expect(foundation).toContain('public.create_social_signup_intent');
    expect(foundation.toLowerCase()).not.toContain('password text');
  });

  it('keeps signup intents private and server governed', () => {
    expect(foundation).toContain('ALTER TABLE private.signup_intents ENABLE ROW LEVEL SECURITY');
    expect(foundation).toContain('REVOKE ALL ON TABLE private.signup_intents FROM PUBLIC, anon, authenticated');
    expect(foundation).toContain('TO service_role');
    expect(foundation).not.toMatch(/grant\s+usage\s+on\s+schema\s+private\s+to\s+(anon|authenticated)/i);
  });

  it('keeps overlap default-off and private', () => {
    expect(control).toContain('allow_legacy_server_registration boolean NOT NULL DEFAULT false');
    expect(control).toContain('VALUES (true, false)');
    expect(control).toContain('REVOKE ALL ON TABLE private.auth_signup_cutover_control');
    expect(control).toContain('FROM PUBLIC, anon, authenticated, service_role');
  });

  it('keeps email and Google provisioning intent-bound', () => {
    expect(provisioning).toContain("IF v_provider = 'google' THEN");
    expect(provisioning).toContain("auth_provider = 'google'");
    expect(provisioning).toContain('provider_subject = v_provider_subject');
    expect(provisioning).toContain("ELSIF v_provider = 'email' THEN");
    expect(provisioning).toContain("auth_provider = 'email'");
    expect(provisioning).toContain('provider_subject IS NULL');
    expect(provisioning).toContain('signup rejected: signup intent is required');
    expect(provisioning).toContain('FOR UPDATE');
    expect(provisioning).toContain('SET consumed_at = now()');
    expect(provisioning).toContain('signup rejected: signup intent replay detected');
  });

  it('never trusts client role metadata as public authority', () => {
    expect(provisioning).toContain("NEW.raw_user_meta_data ? 'role'");
    expect(provisioning).toContain('signup rejected: client role metadata is forbidden');
    expect(provisioning).toContain('signup rejected: public email signup cannot carry app role metadata');
    expect(provisioning).toContain('signup rejected: unsupported auth provider');
  });

  it('keeps the Before User Created hook fail-closed and auth-admin-only', () => {
    expect(hook).toContain('public.before_user_created_validate_signup_intent(event jsonb)');
    expect(hook).toContain('security definer');
    expect(hook).toContain("set search_path = ''");
    expect(hook).toContain("if v_provider = 'google' then");
    expect(hook).toContain("elsif v_provider = 'email' then");
    expect(hook).toContain('signup intent is required');
    expect(hook).toContain('registration availability could not be verified');
    expect(hook).toContain('from public, anon, authenticated, service_role');
    expect(hook).toContain('to supabase_auth_admin');
    expect(hook).not.toContain('EXCEPTION WHEN OTHERS');
    expect(hook).not.toContain('RAISE WARNING');
  });

  it('does not pretend SQL itself enables hosted Auth hook configuration', () => {
    expect(hook).not.toContain('hook_uri');
    expect(hook).not.toContain('hook_enabled');
    expect(hook).not.toContain('pg_net');
  });
});
