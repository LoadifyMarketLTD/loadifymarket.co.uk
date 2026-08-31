import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const cutoverPath =
  'supabase/migrations/20260831123232_auth_signup_disable_legacy_overlap.sql';
const cutover = read(cutoverPath);

describe('strict Auth cutover migration contract', () => {
  it('disables only the legacy server registration overlap in the canonical control row', () => {
    expect(cutover).toContain('BEGIN;');
    expect(cutover).toContain('FROM private.auth_signup_cutover_control');
    expect(cutover).toContain('WHERE singleton = true');
    expect(cutover).toContain('FOR UPDATE');
    expect(cutover).toContain('SET allow_legacy_server_registration = false');
    expect(cutover).toContain('GET DIAGNOSTICS v_row_count = ROW_COUNT');
    expect(cutover).toContain('IF v_row_count <> 1 THEN');
    expect(cutover).toContain('IF v_overlap IS DISTINCT FROM false THEN');
    expect(cutover).toContain('COMMIT;');
  });

  it('does not relax Auth, RLS, or signup-hook privileges', () => {
    expect(cutover).not.toMatch(/\bgrant\b/i);
    expect(cutover).not.toMatch(/\brevoke\b/i);
    expect(cutover).not.toMatch(/disable\s+row\s+level\s+security/i);
    expect(cutover).not.toMatch(/before_user_created_validate_signup_intent\s*\(/i);
    expect(cutover).not.toMatch(/allow_legacy_server_registration\s*=\s*true/i);
  });

  it('does not reintroduce obsolete #599 migration identities', () => {
    const obsolete = [
      '20260825200500_signup_intent_auth_foundation.sql',
      '20260825201000_auth_signup_cutover_control.sql',
      '20260825201500_auth_signup_intent_consumption.sql',
      '20260826070000_auth_before_user_created_hook.sql',
    ];

    for (const filename of obsolete) {
      expect(
        fs.existsSync(path.join(root, 'supabase/migrations', filename)),
      ).toBe(false);
    }
  });
});
