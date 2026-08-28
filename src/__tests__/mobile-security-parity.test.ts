import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const mobileSecurity = read('src/pages/MobileSecurityPage.tsx');
const buyerSettings = read('src/pages/pixel-perfect/buyer/BuyerSettings.tsx');

describe('mobile account security parity', () => {
  it('requires the current password and re-authenticates before changing password', () => {
    expect(mobileSecurity).toContain('Current password');
    expect(mobileSecurity).toContain('currentPassword');
    expect(mobileSecurity).toContain('supabase.auth.signInWithPassword');
    expect(mobileSecurity).toContain('password: currentPassword');
    expect(mobileSecurity).toContain('supabase.auth.updateUser({ password: newPassword })');

    expect(buyerSettings).toContain('supabase.auth.signInWithPassword');
    expect(buyerSettings).toContain('password: currentPassword');
    expect(buyerSettings).toContain('supabase.auth.updateUser({ password: newPassword })');
  });

  it('does not allow the old direct password update path', () => {
    expect(mobileSecurity).not.toContain('supabase.auth.updateUser({ password: pw })');
  });
});
