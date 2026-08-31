import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const signupSource = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/pages/pixel-perfect/Signup.tsx',
  ),
  'utf8',
);

describe('Signup native Auth contract', () => {
  it('initializes registration through register-intent', () => {
    expect(signupSource).toContain(
      'fetch("/.netlify/functions/register-intent"',
    );

    expect(signupSource).toContain(
      'requestedRole: role',
    );
  });

  it('does not call the legacy register endpoint', () => {
    expect(signupSource).not.toContain(
      'fetch("/.netlify/functions/register",',
    );
  });

  it('never sends the password to register-intent', () => {
    const intentBlock =
      signupSource.split(
        'fetch("/.netlify/functions/register-intent"',
      )[1]?.split(
        'const intentPayload',
      )[0] ?? '';

    expect(intentBlock).not.toContain(
      'password: form.password',
    );

    expect(intentBlock).not.toContain(
      'password',
    );
  });

  it('uses native Supabase Auth signup for the password', () => {
    expect(signupSource).toContain(
      'supabase.auth.signUp',
    );

    expect(signupSource).toContain(
      'password: form.password',
    );
  });

  it('carries only the opaque intent id as signup metadata', () => {
    expect(signupSource).toContain(
      'intent_id: intentPayload.intentId',
    );

    const authOptions =
      signupSource.split(
        'options: {',
      )[1]?.split(
        'emailRedirectTo,',
      )[0] ?? '';

    expect(authOptions).not.toContain(
      'role:',
    );

    expect(authOptions).not.toContain(
      'sellerType',
    );

    expect(authOptions).not.toContain(
      'firstName',
    );

    expect(authOptions).not.toContain(
      'lastName',
    );
  });

  it('uses a confirmation redirect owned by the application', () => {
    expect(signupSource).toContain(
      '/login?confirmed=1',
    );

    expect(signupSource).toContain(
      'emailRedirectTo',
    );
  });

  it('preserves the existing post-registration UX', () => {
    expect(signupSource).toContain(
      'title: "Account created"',
    );

    expect(signupSource).toContain(
      'Check your email to confirm your address, then sign in.',
    );

    expect(signupSource).toContain(
      '/login?registered=1',
    );
  });
});
