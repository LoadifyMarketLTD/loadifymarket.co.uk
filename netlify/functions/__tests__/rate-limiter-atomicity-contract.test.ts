import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('E2E audit rate-limit and privilege remediation', () => {
  it('uses one atomic database RPC instead of SELECT-then-write rate limiting', () => {
    const source = read('netlify/functions/_shared/rateLimiter.ts');

    expect(source).toContain("supabase.rpc('increment_rate_limit_counter'");
    expect(source).toContain('p_table_name: tableName');
    expect(source).toContain('p_identifier: identifier');
    expect(source).toContain('p_window_end: windowEnd');
    expect(source).toContain('p_max_attempts: maxAttempts');
    expect(source).not.toContain('.from(tableName)');
    expect(source).not.toContain("stage: 'select'");
    expect(source).not.toContain("stage: 'insert'");
    expect(source).not.toContain("stage: 'update'");
  });

  it('defines an allow-listed service-role-only atomic counter', () => {
    const sql = read('supabase/679_audit_e2e_rate_limit_and_privilege_hardening.sql');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.increment_rate_limit_counter(');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain('p_table_name = ANY (v_allowed_tables)');
    expect(sql).toContain('INSERT INTO public.%I AS rl');
    expect(sql).toContain('ON CONFLICT (identifier, "windowEnd")');
    expect(sql).toContain('DO UPDATE SET attempts = LEAST(rl.attempts + 1, $3 + 1)');
    expect(sql).toContain('FROM authenticated');
    expect(sql).toContain('TO service_role');
    expect(sql).toContain("'push_token_rate_limits'");
  });

  it('removes only the duplicate quoted updatedAt triggers', () => {
    const sql = read('supabase/679_audit_e2e_rate_limit_and_privilege_hardening.sql');

    for (const trigger of [
      'trg_buyer_profiles_updatedAt',
      'trg_seller_profiles_updatedAt',
      'trg_seller_stores_updatedAt',
      'trg_users_updatedAt',
    ]) {
      expect(sql).toContain(`DROP TRIGGER IF EXISTS "${trigger}"`);
    }

    expect(sql).not.toContain('DROP TRIGGER IF EXISTS trg_buyer_profiles_updatedat');
    expect(sql).not.toContain('DROP TRIGGER IF EXISTS trg_seller_profiles_updatedat');
    expect(sql).not.toContain('DROP TRIGGER IF EXISTS trg_seller_stores_updatedat');
    expect(sql).not.toContain('DROP TRIGGER IF EXISTS trg_users_updatedat');
  });

  it('closes direct client execution of product-view analytics writes', () => {
    const sql = read('supabase/679_audit_e2e_rate_limit_and_privilege_hardening.sql');

    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text) FROM PUBLIC;',
    );
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text) FROM anon;',
    );
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.track_product_view(uuid, uuid, text) FROM authenticated;',
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.track_product_view(uuid, uuid, text) TO service_role;',
    );
  });
});
