import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { handler } from '../register';

const registerSource = () =>
  readFileSync(
    join(process.cwd(), 'netlify/functions/register.ts'),
    'utf8',
  );

describe('register legacy endpoint retirement', () => {
  it('fails closed with 410 Gone', async () => {
    const response = await handler(
      {
        httpMethod: 'POST',
        body: JSON.stringify({
          email: 'buyer@example.com',
          password: 'Secret123!',
          firstName: 'Buyer',
          lastName: 'Example',
          role: 'buyer',
        }),
      } as never,
      {} as never,
      (() => undefined) as never,
    );

    expect(response).toBeDefined();
    expect(response?.statusCode).toBe(410);

    const body = JSON.parse(response?.body || '{}') as { error?: string };
    expect(body.error).toContain('retired');
  });

  it('does not expose the old registration implementation', () => {
    const source = registerSource();
    expect(source).not.toContain('auth.admin.createUser');
    expect(source).not.toContain('app_metadata: { role }');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).not.toContain('password.length');
    expect(source).not.toContain('getFeatureFlagsStrict');
  });

  it('documents the replacement signup-intent flow', () => {
    const source = registerSource();
    expect(source).toContain('/.netlify/functions/register-intent');
    expect(source).toContain('supabase.auth.signUp');
    expect(source).toContain('Passwords must never be sent');
  });
});
