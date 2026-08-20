import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_COMMERCE_INTERFACE_VERSION,
  evaluateSupplierCommerceControl,
  recordSupplierCommerceOperation,
} from '../_shared/supplierCommerceControl';

const migration = readFileSync(
  new URL('../../../supabase/616_supplier_commerce_platform_control_foundations.sql', import.meta.url),
  'utf8',
);
const adminApi = readFileSync(new URL('../admin-supplier-commerce-controls.ts', import.meta.url), 'utf8');

type RpcResult = { data: unknown; error: null | { message: string; code?: string } };

function clientWithRpc(result: RpcResult | (() => Promise<RpcResult>)) {
  const rpc = vi.fn(async () => (
    typeof result === 'function' ? result() : result
  ));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('Phase C1 Supplier Commerce control foundations', () => {
  it('uses an explicitly versioned canonical server contract', () => {
    expect(SUPPLIER_COMMERCE_INTERFACE_VERSION).toBe(1);
    expect(migration).toContain('server_supplier_commerce_control_decision_v1');
    expect(migration).toContain("'interfaceVersion', 1");
  });

  it('fails closed when the control RPC errors', async () => {
    const { client } = clientWithRpc({ data: null, error: { message: 'db unavailable' } });
    const decision = await evaluateSupplierCommerceControl(client, 'checkout');
    expect(decision).toEqual({
      enabled: false,
      reason: 'control_unavailable',
      interfaceVersion: 1,
    });
  });

  it('fails closed when the control RPC throws', async () => {
    const rpc = vi.fn(async () => { throw new Error('network unavailable'); });
    const client = { rpc } as unknown as SupabaseClient;
    const decision = await evaluateSupplierCommerceControl(client, 'supplier_order');
    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe('control_unavailable');
  });

  it('fails closed on malformed control evidence', async () => {
    const { client } = clientWithRpc({ data: { enabled: true }, error: null });
    const decision = await evaluateSupplierCommerceControl(client, 'publish');
    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe('control_unavailable');
  });

  it('returns a valid server decision without reconstructing it client-side', async () => {
    const expected = {
      enabled: true,
      reason: 'enabled',
      operation: 'import',
      interfaceVersion: 1,
      controlVersion: 4,
    } as const;
    const { client, rpc } = clientWithRpc({ data: expected, error: null });
    const decision = await evaluateSupplierCommerceControl(client, 'import', {
      providerRef: 'provider-1',
      territory: 'GB',
    });
    expect(decision).toEqual(expected);
    expect(rpc).toHaveBeenCalledWith('server_supplier_commerce_control_decision_v1', {
      p_operation: 'import',
      p_scope: { providerRef: 'provider-1', territory: 'GB' },
    });
  });

  it('persists structured operation evidence without arbitrary provider payloads', async () => {
    const { client, rpc } = clientWithRpc({ data: 'operation-id', error: null });
    const result = await recordSupplierCommerceOperation(client, {
      correlationId: '11111111-1111-1111-1111-111111111111',
      operation: 'supplier_order',
      resultClass: 'UNKNOWN_OUTCOME',
      recoveryState: 'query_before_retry',
      externalRef: 'provider-order-7',
    });
    expect(result).toEqual({ ok: true, id: 'operation-id' });
    const call = rpc.mock.calls[0];
    expect(call[0]).toBe('server_record_supplier_commerce_operation_v1');
    expect(JSON.stringify(call[1])).not.toMatch(/password|accessToken|secret|cardNumber|shippingAddress/i);
  });

  it('starts with Supplier Commerce globally and operationally disabled', () => {
    expect(migration).toContain("('*', 'global', NULL, false");
    for (const operation of [
      'import', 'publish', 'checkout', 'reservation',
      'supplier_order', 'tracking_ingest', 'return_recovery',
    ]) {
      expect(migration).toContain(`('${operation}', 'global', NULL, false`);
    }
  });

  it('keeps controls, incidents, recovery and evidence private and server-only', () => {
    expect(migration).toContain('private.supplier_commerce_controls');
    expect(migration).toContain('private.supplier_commerce_control_audit');
    expect(migration).toContain('private.supplier_commerce_incidents');
    expect(migration).toContain('private.supplier_commerce_recovery_queue');
    expect(migration).toContain('private.supplier_commerce_operations');
    expect(migration).toContain('REVOKE ALL ON TABLE private.supplier_commerce_controls FROM PUBLIC, anon, authenticated, service_role');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.server_supplier_commerce_control_decision_v1(text, jsonb)');
    expect(migration).toContain('TO service_role');
  });

  it('rechecks live active-admin authority for material control changes', () => {
    expect(migration).toContain("u.role = 'admin' AND u.\"isActive\" = true");
    expect(migration).toContain('control change reason is required');
    expect(migration).toContain('supplier_commerce_control_audit');
    expect(adminApi).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(adminApi).toContain('server_set_supplier_commerce_control_v1');
    expect(adminApi).toContain('server_list_supplier_commerce_controls_v1');
  });

  it('creates provider re-verification and privacy-retention frameworks without provider-specific core types', () => {
    expect(migration).toContain('supplier_commerce_provider_capabilities');
    expect(migration).toContain('official_source_refs');
    expect(migration).toContain('reverify_due_at');
    expect(migration).toContain('supplier_commerce_retention_registry');
    expect(migration).toContain('backup_handling');
    expect(migration).not.toMatch(/tiktok_|amazon_|aliexpress_|avasam_/i);
  });
});
