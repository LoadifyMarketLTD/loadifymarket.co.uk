import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-supplier-simulator.ts'), 'utf8');

describe('Phase N supplier simulator admin boundary', () => {
  it('requires active admin authentication', () => {
    expect(source).toContain("authenticateActiveAccount(event, admin, ['admin'])");
  });

  it('supports the complete evidence lifecycle', () => {
    for (const action of ['start','record_check','record_replay','complete','status']) expect(source).toContain(`'${action}'`);
  });

  it('records through reviewed server RPC boundaries only', () => {
    for (const rpc of [
      'server_admin_start_supplier_simulator_run_v1','server_record_supplier_simulator_check_v1',
      'server_record_supplier_replay_validation_v1','server_admin_complete_supplier_simulator_run_v1',
      'server_admin_supplier_simulator_status_v1',
    ]) expect(source).toContain(rpc);
  });

  it('rejects secret-bearing simulator evidence', () => {
    expect(source).toContain('containsSecretMaterial');
    expect(source).toContain('Raw credentials or secrets are forbidden in simulator evidence');
  });

  it('does not expose supplier-provider calls or payment mutation', () => {
    expect(source).not.toContain('submitOrder(');
    expect(source).not.toContain('stripe.refunds');
    expect(source).not.toContain('UPDATE public.orders');
  });

  it('does not redesign Workspace or Super Admin UI', () => {
    expect(source).not.toContain('Workspace');
    expect(source).not.toContain('SuperAdmin');
  });
});
