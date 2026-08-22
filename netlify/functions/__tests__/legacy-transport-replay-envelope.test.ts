import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const supabaseDir = join(process.cwd(), 'supabase');

function read(name: string): string {
  return readFileSync(join(supabaseDir, name), 'utf8');
}

function numericPrefix(name: string): number | null {
  const match = name.match(/^(\d+)_/);
  return match ? Number(match[1]) : null;
}

function orderedNumericSqlFiles(): string[] {
  return readdirSync(supabaseDir)
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort((a, b) => {
      const ap = numericPrefix(a) ?? Number.MAX_SAFE_INTEGER;
      const bp = numericPrefix(b) ?? Number.MAX_SAFE_INTEGER;
      return ap - bp || a.localeCompare(b);
    });
}

describe('legacy transport fresh-replay compatibility envelope', () => {
  it('opens before migration 10 and closes immediately after the final legacy reference', () => {
    const files = orderedNumericSqlFiles();
    const open = '09_zz_legacy_transport_replay_compat.sql';
    const rls = '10_rls_policies.sql';
    const finalLegacy = '455_fix_missing_triggers_functions.sql';
    const close = '456_00_remove_legacy_transport_replay_compat.sql';

    expect(files).toContain(open);
    expect(files).toContain(close);
    expect(files.indexOf(open)).toBeLessThan(files.indexOf(rls));
    expect(files.indexOf(finalLegacy)).toBeLessThan(files.indexOf(close));

    const firstFileAfterClose = files[files.indexOf(close) + 1];
    expect(numericPrefix(firstFileAfterClose)).toBeGreaterThanOrEqual(456);
  });

  it('creates only the minimal compatibility relations and removes both again', () => {
    const open = read('09_zz_legacy_transport_replay_compat.sql');
    const close = read('456_00_remove_legacy_transport_replay_compat.sql');

    expect(open).toContain('CREATE TABLE IF NOT EXISTS public.delivery_requests');
    expect(open).toContain('CREATE TABLE IF NOT EXISTS public.transport_quotes');
    expect(open).toContain('LEGACY FRESH-REPLAY COMPATIBILITY ONLY');

    expect(close).toContain('DROP TABLE IF EXISTS public.transport_quotes CASCADE');
    expect(close).toContain('DROP TABLE IF EXISTS public.delivery_requests CASCADE');
    expect(close).toContain("to_regclass('public.transport_quotes')");
    expect(close).toContain("to_regclass('public.delivery_requests')");
  });

  it('keeps the later canonical removal migration aligned with the same retired surfaces', () => {
    const canonicalRemoval = read(
      'migrations/20260818102000_remove_unused_transport_surfaces_20260818.sql',
    );

    expect(canonicalRemoval).toContain('DROP TABLE IF EXISTS public.transport_quotes CASCADE');
    expect(canonicalRemoval).toContain('DROP TABLE IF EXISTS public.delivery_requests CASCADE');
  });

  it('does not allow post-456 numeric migrations to reintroduce the retired relations', () => {
    const offenders = orderedNumericSqlFiles()
      .filter((name) => (numericPrefix(name) ?? 0) > 456)
      .filter((name) => {
        const sql = read(name);
        return /\b(delivery_requests|transport_quotes)\b/.test(sql);
      });

    expect(offenders).toEqual([]);
  });
});
