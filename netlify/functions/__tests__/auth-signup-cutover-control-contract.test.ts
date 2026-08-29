import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const control = read('supabase/676a_auth_signup_cutover_control.sql');
const controlTimestamped = read(
  'supabase/migrations/20260825201000_auth_signup_cutover_control.sql',
);
const provisioning = read(
  'supabase/migrations/20260825201500_auth_signup_intent_consumption.sql',
);
const hook = read(
  'supabase/migrations/20260826070000_auth_before_user_created_hook.sql',
);

describe('Auth signup cutover overlap contract', () => {
  it('keeps canonical and timestamped overlap migrations identical', () => {
    expect(controlTimestamped).toBe(control);
  });

  it('defaults the overlap to strict/off and keeps control private', () => {
    expect(control).toContain(
      'allow_legacy_server_registration boolean NOT NULL DEFAULT false',
    );
    expect(control).toContain('VALUES (true, false)');
    expect(control).toContain(
      'REVOKE ALL ON TABLE private.auth_signup_cutover_control',
    );
    expect(control).toContain(
      'FROM PUBLIC, anon, authenticated, service_role',
    );
  });

  it('uses the private overlap control in both Auth enforcement layers', () => {
    expect(provisioning).toContain('private.auth_signup_cutover_control');
    expect(provisioning).toContain('v_allow_legacy_server_registration');
    expect(hook).toContain('private.auth_signup_cutover_control');
    expect(hook).toContain('v_allow_legacy_server_registration');
  });

  it('limits overlap compatibility to trusted email app_metadata buyer/seller', () => {
    const emailProvisioning =
      provisioning.split("ELSIF v_provider = 'email' THEN")[1]
        ?.split("ELSE\n    RAISE EXCEPTION\n      'signup rejected: unsupported auth provider'")[0] ?? '';

    expect(emailProvisioning).toContain('v_allow_legacy_server_registration');
    expect(emailProvisioning).toContain("NEW.raw_app_meta_data ? 'role'");
    expect(emailProvisioning).toContain("IN ('buyer', 'seller')");
    expect(provisioning).toContain(
      'legacy server registration identity is incomplete',
    );
    expect(provisioning).toContain(
      'public email signup cannot carry app role metadata',
    );
  });

  it('never opens fresh Google or Facebook creation during overlap', () => {
    const googleProvisioning =
      provisioning.split("IF v_provider = 'google' THEN")[1]
        ?.split("ELSIF v_provider = 'facebook' THEN")[0] ?? '';

    expect(googleProvisioning).toContain("auth_provider = 'google'");
    expect(googleProvisioning).toContain('provider_subject = v_provider_subject');
    expect(googleProvisioning).not.toContain('v_allow_legacy_server_registration');
    expect(provisioning).toContain(
      'Facebook signup requires registration authorization',
    );
    expect(hook).toContain(
      'Facebook signup requires registration authorization',
    );
  });

  it('rechecks registration policy at provisioning even without hook dispatch', () => {
    expect(provisioning).toContain('public.platform_settings');
    expect(provisioning).toContain('registration availability could not be verified');
    expect(provisioning).toContain('buyer registration is temporarily disabled');
    expect(provisioning).toContain('seller registration is temporarily disabled');
  });

  it('retains the strict final intent-only rejection path', () => {
    expect(provisioning).toContain('signup intent is required');
    expect(hook).toContain('signup intent is required');
    expect(provisioning).toContain("NEW.raw_user_meta_data ? 'role'");
    expect(hook).toContain("v_user_metadata ? 'role'");
  });
});
