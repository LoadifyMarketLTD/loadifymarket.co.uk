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
  it('keeps signup intents in the private schema', () => {
    expect(migration676).toContain(
      'CREATE TABLE IF NOT EXISTS private.signup_intents',
    );

    expect(migration676).toContain(
      'REVOKE ALL ON TABLE private.signup_intents',
    );

    expect(migration676).toContain(
      'FROM PUBLIC, anon, authenticated',
    );
  });

  it('does not expose private signup_intents through the Data API', () => {
    expect(migration676).not.toContain(
      "GRANT USAGE ON SCHEMA private TO anon",
    );

    expect(migration676).not.toContain(
      "GRANT USAGE ON SCHEMA private TO authenticated",
    );

    expect(migration676).toContain(
      'public.create_signup_intent',
    );
  });

  it('makes create_signup_intent service-role only', () => {
    expect(migration676).toContain(
      'TO service_role',
    );

    expect(migration676).toContain(
      'signup intent RPC security failure: client role can execute RPC',
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
    expect(migration676).toContain(
      'AFTER UPDATE OF email_confirmed_at',
    );

    expect(migration676).toContain(
      'OLD.email_confirmed_at IS NULL',
    );

    expect(migration676).toContain(
      'NEW.email_confirmed_at IS NOT NULL',
    );

    expect(migration676).toContain(
      'SET "isEmailVerified" = true',
    );
  });

  it('requires email/password signup to carry a valid intent', () => {
    expect(migration677).toContain(
      "IF v_provider <> 'email'",
    );

    expect(migration677).toContain(
      'signup intent is required',
    );

    expect(migration677).toContain(
      'signup intent not found',
    );

    expect(migration677).toContain(
      'signup intent expired',
    );

    expect(migration677).toContain(
      'signup intent email mismatch',
    );
  });

  it('locks and consumes signup intent exactly inside provisioning', () => {
    expect(migration677).toContain('FOR UPDATE');

    expect(migration677).toContain(
      'SET consumed_at = now()',
    );

    expect(migration677).toContain(
      'signup intent already consumed',
    );

    expect(migration677).toContain(
      'signup intent replay detected',
    );
  });

  it('never accepts client user_metadata role authority', () => {
    expect(migration677).toContain(
      "NEW.raw_user_meta_data ? 'role'",
    );

    expect(migration677).toContain(
      'client role metadata is forbidden',
    );

    expect(migration677).not.toContain(
      "raw_user_meta_data->>'role') IN",
    );
  });

  it('does not allow public email signup to carry app role metadata', () => {
    expect(migration677).toContain(
      "NEW.raw_app_meta_data ? 'role'",
    );

    expect(migration677).toContain(
      'public email signup cannot carry app role metadata',
    );

    expect(migration677).not.toContain(
      "raw_app_meta_data->>'role') IN",
    );
  });

  it('provisions supported OAuth identities Buyer-only', () => {
    expect(migration677).toContain(
      "v_provider IN ('google', 'facebook')",
    );

    const oauthSection =
      migration677.split(
        "IF v_provider IN ('google', 'facebook') THEN",
      )[1]?.split(
        /-- -------------------------------------------------------------------------\r?\n[ ]{2}-- Public email\/password signup\./,
      )[0] ?? '';

    expect(oauthSection).toContain("'buyer'");
    expect(oauthSection).not.toContain("'seller'");
    expect(oauthSection).not.toContain("'admin'");
  });

  it('fails closed for unknown Auth providers', () => {
    expect(migration677).toContain(
      'signup rejected: unsupported auth provider',
    );
  });

  it('fails closed when downstream profile provisioning is incomplete', () => {
    expect(migration677).toContain(
      'Buyer profile provisioning failed',
    );

    expect(migration677).toContain(
      'Seller profile provisioning failed',
    );

    expect(migration677).toContain(
      'Seller store provisioning failed',
    );
  });

  it('contains no catch-all non-fatal Auth provisioning path', () => {
    expect(migration677).not.toContain(
      'EXCEPTION WHEN OTHERS',
    );

    expect(migration677).not.toContain(
      'RAISE WARNING',
    );
  });

  it('keeps the Auth trigger installed', () => {
    expect(migration677).toContain(
      'CREATE TRIGGER on_auth_user_created',
    );

    expect(migration677).toContain(
      'AFTER INSERT ON auth.users',
    );

    expect(migration677).toContain(
      'EXECUTE FUNCTION public.handle_new_auth_user()',
    );
  });
});
