import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const migration676 = read(
  'supabase/migrations/20260825200500_signup_intent_auth_foundation.sql',
);

const migration677 = read(
  'supabase/migrations/20260825201500_auth_signup_intent_consumption.sql',
);

describe('Auth signup intent SQL contract', () => {
  it('keeps signup intents private and service-governed', () => {
    expect(migration676).toContain(
      'CREATE TABLE IF NOT EXISTS private.signup_intents',
    );
    expect(migration676).toContain(
      'REVOKE ALL ON TABLE private.signup_intents',
    );
    expect(migration676).toContain(
      'FROM PUBLIC, anon, authenticated',
    );
    expect(migration676).not.toContain(
      'GRANT USAGE ON SCHEMA private TO anon',
    );
    expect(migration676).not.toContain(
      'GRANT USAGE ON SCHEMA private TO authenticated',
    );
  });

  it('stores no password in signup intents', () => {
    const tableSection =
      migration676.split(
        'CREATE TABLE IF NOT EXISTS private.signup_intents',
      )[1]?.split('CREATE INDEX')[0] ?? '';
    expect(tableSection.toLowerCase()).not.toContain('password');
  });

  it('projects later Auth email confirmation into public.users', () => {
    expect(migration676).toContain('AFTER UPDATE OF email_confirmed_at');
    expect(migration676).toContain('OLD.email_confirmed_at IS NULL');
    expect(migration676).toContain('NEW.email_confirmed_at IS NOT NULL');
    expect(migration676).toContain('SET "isEmailVerified" = true');
  });

  it('keeps email signup bound to an email-only intent', () => {
    expect(migration677).toContain("ELSIF v_provider = 'email' THEN");
    expect(migration677).toContain("auth_provider = 'email'");
    expect(migration677).toContain('provider_subject IS NULL');
    expect(migration677).toContain('signup intent is required');
    expect(migration677).toContain('signup intent not found');
    expect(migration677).toContain('signup intent expired');
    expect(migration677).toContain('signup intent email mismatch');
  });

  it('binds fresh Google creation to provider + subject + verified email', () => {
    expect(migration676).toContain(
      "auth_provider IN ('email', 'google', 'facebook')",
    );
    expect(migration676).toContain('provider_subject text NULL');
    expect(migration676).toContain('public.create_social_signup_intent');
    expect(migration677).toContain("IF v_provider = 'google' THEN");
    expect(migration677).toContain("NEW.raw_user_meta_data ->> 'sub'");
    expect(migration677).toContain("auth_provider = 'google'");
    expect(migration677).toContain('provider_subject = v_provider_subject');
    expect(migration677).toContain('AND email = v_email');
    expect(migration677).toContain(
      'Google registration authorization not found',
    );
  });

  it('keeps fresh Facebook account creation fail-closed', () => {
    expect(migration677).toContain("ELSIF v_provider = 'facebook' THEN");
    expect(migration677).toContain(
      'Facebook signup requires registration authorization',
    );
  });

  it('locks and consumes signup intent exactly inside provisioning', () => {
    expect(migration677).toContain('FOR UPDATE');
    expect(migration677).toContain('SET consumed_at = now()');
    expect(migration677).toContain('signup intent already consumed');
    expect(migration677).toContain('signup intent replay detected');
  });

  it('never accepts client role metadata authority', () => {
    expect(migration677).toContain("NEW.raw_user_meta_data ? 'role'");
    expect(migration677).toContain('client role metadata is forbidden');
    expect(migration677).toContain("NEW.raw_app_meta_data ? 'role'");
    expect(migration677).toContain(
      'public email signup cannot carry app role metadata',
    );
    expect(migration677).not.toContain("raw_user_meta_data->>'role') IN");
    expect(migration677).not.toContain("raw_app_meta_data->>'role') IN");
  });

  it('fails closed for unknown providers and incomplete provisioning', () => {
    expect(migration677).toContain('signup rejected: unsupported auth provider');
    expect(migration677).toContain('Buyer profile provisioning failed');
    expect(migration677).toContain('Seller profile provisioning failed');
    expect(migration677).toContain('Seller store provisioning failed');
  });

  it('contains no catch-all non-fatal Auth provisioning path', () => {
    expect(migration677).not.toContain('EXCEPTION WHEN OTHERS');
    expect(migration677).not.toContain('RAISE WARNING');
  });

  it('keeps the Auth trigger installed', () => {
    expect(migration677).toContain('CREATE TRIGGER on_auth_user_created');
    expect(migration677).toContain('AFTER INSERT ON auth.users');
    expect(migration677).toContain(
      'EXECUTE FUNCTION public.handle_new_auth_user()',
    );
  });
});
