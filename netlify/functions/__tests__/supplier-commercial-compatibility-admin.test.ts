import fs from 'node:fs';
import path from 'node:path';

describe('admin supplier commercial compatibility boundary', () => {
  const endpoint = fs.readFileSync(path.resolve(process.cwd(), 'netlify/functions/admin-supplier-commercial-compatibility.ts'), 'utf8');
  const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260930184500_universal_commercial_compatibility.sql'), 'utf8');

  it('requires active admin authority and rejects secret-bearing configuration', () => {
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain('containsSecretMaterial');
    expect(endpoint).toContain('Raw credentials or secrets are forbidden');
  });

  it('uses the governed database mutation boundary', () => {
    expect(endpoint).toContain('server_admin_supplier_commercial_compatibility_v2');
    expect(migration).toContain('PERFORM private.require_active_admin_v1(p_actor_id)');
    expect(migration).toContain("v_action='create_profile_draft'");
    expect(migration).toContain("v_action='verify_profile'");
    expect(migration).toContain("v_action='retire_profile'");
    expect(migration).toContain("v_action='configure_market_policy'");
  });

  it('does not activate checkout while configuring profiles or policy', () => {
    expect(migration).toContain("'checkoutEnabledByThisAction',false");
    expect(migration).toContain("RAISE EXCEPTION 'market commercial policy cannot be changed while checkout is enabled'");
    expect(endpoint).toContain('checkoutEnabledByThisEndpoint: false');
    expect(endpoint).toContain('supplierCommerceActivated: false');
  });
});