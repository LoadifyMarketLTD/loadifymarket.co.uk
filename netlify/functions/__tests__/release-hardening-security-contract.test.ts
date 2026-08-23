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

  it('keeps the historical payment-session hardening replay-idempotent and admin-only', () => {
    const baseRls = read('supabase/10_rls_policies.sql');
    const correctiveRls = read('supabase/80_fix_rls_security_gaps.sql');

    expect(baseRls).toContain('CREATE POLICY "payment_sessions_admin_write" ON payment_sessions');
    expect(baseRls).toContain('USING (is_admin()) WITH CHECK (is_admin())');

    const dropHardened = 'DROP POLICY IF EXISTS "payment_sessions_admin_write" ON payment_sessions;';
    const createHardened = 'CREATE POLICY "payment_sessions_admin_write" ON payment_sessions';
    expect(correctiveRls).toContain('DROP POLICY IF EXISTS "payment_sessions_write" ON payment_sessions;');
    expect(correctiveRls).toContain(dropHardened);
    expect(correctiveRls).toContain(createHardened);
    expect(correctiveRls.indexOf(dropHardened)).toBeLessThan(correctiveRls.indexOf(createHardened));
    expect(correctiveRls).toContain('USING (is_admin())');
    expect(correctiveRls).toContain('WITH CHECK (is_admin())');
  });

  it('keeps migration 220 product-analytics hardening replay-idempotent', () => {
    const sql = read('supabase/220_fix_rls_security_gaps.sql');

    for (const policy of [
      'product_analytics_select',
      'product_analytics_insert',
      'product_analytics_update',
      'product_analytics_delete',
    ]) {
      const drop = `DROP POLICY IF EXISTS "${policy}" ON product_analytics;`;
      const create = `CREATE POLICY "${policy}"`;
      expect(sql).toContain(drop);
      expect(sql).toContain(create);
      expect(sql.indexOf(drop)).toBeLessThan(sql.indexOf(create));
    }

    expect(sql).toContain('CREATE POLICY "product_analytics_update"');
    expect(sql).toContain('CREATE POLICY "product_analytics_delete"');
    expect(sql.match(/USING \(is_admin\(\)\);/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('guards historical realtime publication additions against duplicate membership', () => {
    const cases = [
      { path: 'supabase/490_realtime_enable.sql', tables: ['offers', 'orders'] },
      { path: 'supabase/510_realtime_messages.sql', tables: ['messages'] },
    ];

    for (const { path, tables } of cases) {
      const sql = read(path);
      expect(sql).toContain("WHERE p.pubname = 'supabase_realtime'");
      expect(sql).toContain('IF NOT EXISTS (');
      expect(sql).toContain('FROM pg_publication_rel pr');

      for (const table of tables) {
        const membership = `AND c.relname = '${table}'`;
        const add = `ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};`;
        expect(sql).toContain(membership);
        expect(sql).toContain(add);
        expect(sql.indexOf(membership)).toBeLessThan(sql.indexOf(add));
      }
    }
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
