import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('release-hardening security contracts', () => {
  it('replaces the owner-rights public seller view with a read-only RLS projection table', () => {
    const sql = read('supabase/673_public_seller_projection_security_closure.sql');

    expect(sql).toContain('DROP VIEW public.seller_profiles_public');
    expect(sql).toContain('CREATE TABLE public.seller_profiles_public');
    expect(sql).toContain('ALTER TABLE public.seller_profiles_public ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY seller_profiles_public_read');
    expect(sql).toContain('GRANT SELECT ON TABLE public.seller_profiles_public');
    expect(sql).toContain('CHECK ("contactPhone" IS NULL)');
    expect(sql).toContain("'city', NEW.\"businessAddress\" ->> 'city'");
    expect(sql).toContain("'country', NEW.\"businessAddress\" ->> 'country'");
    expect(sql).toContain('DROP TABLE private.seller_profiles_public_data');
  });

  it('keeps the public seller projection write-closed to ordinary API roles', () => {
    const sql = read('supabase/673_public_seller_projection_security_closure.sql');

    expect(sql).toContain('REVOKE ALL ON TABLE public.seller_profiles_public');
    expect(sql).toContain('FROM PUBLIC, anon, authenticated, service_role');
    expect(sql).toContain("has_table_privilege('anon', 'public.seller_profiles_public', 'INSERT')");
    expect(sql).toContain("has_table_privilege('authenticated', 'public.seller_profiles_public', 'UPDATE')");
    expect(sql).toContain("has_table_privilege('authenticated', 'public.seller_profiles_public', 'DELETE')");
  });

  it('removes direct API execution from the trigger-only seller suspension helper', () => {
    const sql = read('supabase/673_public_seller_projection_security_closure.sql');

    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.sync_seller_suspension_from_user_activity()',
    );
    expect(sql).toContain('FROM PUBLIC, anon, authenticated, service_role');
    expect(sql).toContain(
      "has_function_privilege('authenticated', 'public.sync_seller_suspension_from_user_activity()', 'EXECUTE')",
    );
  });

  it('removes inherited client CRUD grants from server-only rate-limit state', () => {
    const sql = read('supabase/674_server_only_privilege_closure.sql');

    expect(sql).toContain("c.relname LIKE '%\\_rate\\_limits' ESCAPE '\\'");
    expect(sql).toContain('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %s TO service_role');
    expect(sql).toContain('category_filter_definitions');
    expect(sql).toContain('server-only rate-limit tables still expose client CRUD privileges');
  });

  it('revalidates buyer and seller live account state before service-role checkout side effects', () => {
    for (const source of [
      read('netlify/functions/create-checkout.ts'),
      read('netlify/functions/create-payment-intent.ts'),
    ]) {
      expect(source).toContain("import { authenticateActiveAccount } from './_shared/activeAccountAuth'");
      expect(source).toContain('const buyerAuth = await authenticateActiveAccount(event, supabase)');
      expect(source).toContain('sellerAccount.role !== \'seller\'');
      expect(source).toContain('sellerAccount.isActive !== true');
      expect(source).toContain(".select('id, role, isActive')");
    }
  });
});
