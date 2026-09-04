import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('admin payout security boundary', () => {
  it('requires an active admin at the Netlify service-role boundary', () => {
    const source = read('netlify/functions/admin-payout-action.ts');

    expect(source).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(source).toContain("const ALLOWED_ACTIONS = new Set(['approve', 'complete', 'reject'])");
    expect(source).toContain("admin.rpc('server_admin_payout_action_v1'");
    expect(source).toContain('p_actor_id: auth.actor.id');
    expect(source).not.toContain("admin.rpc('approve_payout'");
    expect(source).not.toContain("admin.rpc('complete_payout'");
    expect(source).not.toContain("admin.rpc('reject_payout'");
  });

  it('keeps the browser away from privileged payout RPCs', () => {
    const page = read('src/pages/pixel-perfect/admin/AdminPayouts.tsx');

    expect(page).toContain("authorizedFetch('/.netlify/functions/admin-payout-action'");
    expect(page).not.toContain('supabase.rpc("approve_payout"');
    expect(page).not.toContain('supabase.rpc("complete_payout"');
    expect(page).not.toContain('supabase.rpc("reject_payout"');
  });

  it('makes the replacement database contract service-role only', () => {
    const sql = read('supabase/migrations/20260904223200_server_admin_payout_rpc_boundary.sql');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.server_admin_payout_action_v1');
    expect(sql).toContain("u.role = 'admin'");
    expect(sql).toContain('u."isActive" = TRUE');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.server_admin_payout_action_v1(uuid, text, uuid, text)');
    expect(sql).toContain('TO service_role');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.approve_payout(uuid)');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.complete_payout(uuid)');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.reject_payout(uuid, text)');
    expect(sql).toContain('legacy admin payout RPCs remain executable by authenticated');
  });
});
