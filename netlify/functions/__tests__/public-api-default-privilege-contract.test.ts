import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migrationPath = 'supabase/migrations/20260904224909_public_api_default_privilege_and_duplicate_policy_closure.sql';

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('public Data API default privilege closure', () => {
  it('makes future public tables, sequences and functions opt-in for ordinary client roles', () => {
    const sql = read(migrationPath);

    expect(sql).toContain('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public');
    expect(sql).toContain('REVOKE ALL ON TABLES FROM anon, authenticated');
    expect(sql).toContain('REVOKE ALL ON SEQUENCES FROM anon, authenticated');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated');
    expect(sql).not.toContain('REVOKE ALL ON TABLES FROM service_role');
  });

  it('removes only the two exact duplicate policies confirmed in production', () => {
    const sql = read(migrationPath);

    expect(sql).toContain('DROP POLICY IF EXISTS "Acces vanzator dispute"');
    expect(sql).toContain('ON public.disputes_and_returns');
    expect(sql).toContain('DROP POLICY IF EXISTS "Acces vanzator feed-uri sync"');
    expect(sql).toContain('ON public.vendor_sync_feeds');

    expect(sql).not.toContain('DROP POLICY IF EXISTS "Sellers view assigned returns"');
    expect(sql).not.toContain('DROP POLICY IF EXISTS "Vânzătorii își gestionează propriile feed-uri"');
  });

  it('fails closed if client default grants or duplicate policies remain', () => {
    const sql = read(migrationPath);

    expect(sql).toContain("grantee.rolname IN ('anon', 'authenticated')");
    expect(sql).toContain("d.defaclobjtype IN ('r', 'S', 'f')");
    expect(sql).toContain('public default privileges still auto-grant API access to anon/authenticated');
    expect(sql).toContain('duplicate disputes_and_returns policy was not removed');
    expect(sql).toContain('duplicate vendor_sync_feeds policy was not removed');
  });
});
