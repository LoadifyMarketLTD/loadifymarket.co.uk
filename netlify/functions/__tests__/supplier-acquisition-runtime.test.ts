import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runSupplierAcquisition } from '../_shared/supplierAcquisitionRuntime';

const ENV_NAME = 'SUPPLIER_ACQUISITION_RUNTIME_TEST';
const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const BATCH_ID = '33333333-3333-4333-8333-333333333333';

afterEach(() => {
  delete process.env[ENV_NAME];
  vi.restoreAllMocks();
});

function context() {
  return {
    eligible: true,
    reason: 'acquisition_ready',
    supplierId: SUPPLIER_ID,
    supplierKey: 'acme-uk',
    legalName: 'Acme UK Ltd',
    registrationCountry: 'GB',
    warehouseRefs: [{ externalWarehouseRef: 'main', country: 'GB' }],
    supportedTerritories: ['GB'],
    requestedCapabilities: ['catalog','variants','price','stock'],
    transport: 'feed_url',
    sourceFormat: 'canonical_json',
    configRef: 'env:' + ENV_NAME,
    acquisitionMode: 'manual',
    blockers: [],
    externalMutationPerformed: false,
    commercialActivationPerformed: false,
    marketplaceListingPerformed: false,
    interfaceVersion: 1,
  };
}

describe('supplier acquisition orchestration', () => {
  it('acquires, normalizes, admits and persists only to durable staging', async () => {
    process.env[ENV_NAME] = JSON.stringify({
      kind: 'http',
      supplierKey: 'acme-uk',
      transport: 'feed_url',
      sourceFormat: 'canonical_json',
      url: 'https://feeds.example.com/catalog.json',
      allowedHosts: ['feeds.example.com'],
    });

    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === 'server_supplier_acquisition_context_v1') return { data: context(), error: null };
      if (name === 'server_supplier_acquisition_run_v1' && args.p_action === 'start') {
        return { data: { ok: true, runId: RUN_ID, status: 'running', interfaceVersion: 1 }, error: null };
      }
      if (name === 'server_persist_direct_supplier_feed_v1') {
        const payload = args as Record<string, unknown>;
        expect(Array.isArray(payload.p_candidates)).toBe(true);
        expect((payload.p_candidates as unknown[]).length).toBe(1);
        return {
          data: {
            batchId: BATCH_ID,
            duplicate: false,
            status: 'staged',
            acceptedCount: 1,
            quarantinedCount: 0,
            commercialActivationPerformed: false,
            capabilityPromotionPerformed: false,
            marketplaceListingPerformed: false,
            interfaceVersion: 1,
          },
          error: null,
        };
      }
      if (name === 'server_supplier_acquisition_run_v1' && args.p_action === 'finish') {
        return { data: { ok: true, runId: RUN_ID, status: 'succeeded', interfaceVersion: 1 }, error: null };
      }
      throw new Error('Unexpected RPC ' + name);
    });

    const result = await runSupplierAcquisition({
      supabase: { rpc } as unknown as Pick<SupabaseClient, 'rpc'>,
      supplierKey: 'acme-uk',
      trigger: 'manual',
      actorId: '44444444-4444-4444-8444-444444444444',
      acquire: async () => ({
        ok: true,
        payload: {
          rawPayload: JSON.stringify([{
            externalProductRef: 'P-1',
            externalVariantRef: 'V-1',
            title: 'Acme Widget',
            currency: 'GBP',
            amountMinor: 1299,
            stockQuantity: 5,
            warehouseCountry: 'GB',
          }]),
          payloadBytes: 180,
          sourceDigest: 'a'.repeat(64),
          generatedAt: '2026-09-21T15:00:00.000Z',
        },
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      runId: RUN_ID,
      batchId: BATCH_ID,
      acceptedCount: 1,
      quarantinedCount: 0,
      commercialActivationPerformed: false,
      capabilityPromotionPerformed: false,
      marketplaceListingPerformed: false,
    });
    expect(rpc).toHaveBeenCalledWith('server_persist_direct_supplier_feed_v1', expect.any(Object));
  });

  it('stops before config resolution or acquisition when governance blocks the supplier', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'server_supplier_acquisition_context_v1') {
        return {
          data: {
            eligible: false,
            reason: 'acquisition_blocked',
            blockers: ['acquisition_disabled'],
            interfaceVersion: 1,
          },
          error: null,
        };
      }
      throw new Error('No downstream RPC should be called');
    });
    const acquire = vi.fn();

    const result = await runSupplierAcquisition({
      supabase: { rpc } as unknown as Pick<SupabaseClient, 'rpc'>,
      supplierKey: 'acme-uk',
      trigger: 'manual',
      acquire,
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'ACQUISITION_BLOCKED',
      blockers: ['acquisition_disabled'],
      commercialActivationPerformed: false,
      marketplaceListingPerformed: false,
    });
    expect(acquire).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
