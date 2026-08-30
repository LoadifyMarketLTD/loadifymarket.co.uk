import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectSupplierFeedBatchV1 } from '../_shared/directSupplierContract';
import type { DirectSupplierFeedAdmissionResult } from '../_shared/directSupplierFeedAdmission';
import {
  computeDirectSupplierStagingBatchDigest,
  createSupabaseDirectSupplierReplayStore,
  persistDirectSupplierFeedAdmission,
} from '../_shared/directSupplierPersistence';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const batch: DirectSupplierFeedBatchV1 = {
  contractVersion: 1,
  supplierKey: 'uk-maker-001',
  generatedAt: '2026-08-30T23:30:00.000Z',
  transport: 'json_api',
  variants: [],
};

const admitted: Extract<DirectSupplierFeedAdmissionResult, { ok: true }> = {
  ok: true,
  batchErrors: [],
  accepted: [{
    supplierKey: 'uk-maker-001',
    sourceGeneratedAt: '2026-08-30T23:30:00.000Z',
    sourceTransport: 'json_api',
    externalProductRef: 'product-1',
    externalVariantRef: 'variant-1',
    sku: 'SKU-1',
    title: 'Example product',
    currency: 'GBP',
    amountMinor: 1299,
    stockQuantity: 5,
    warehouseCountry: 'GB',
    imageUrls: ['https://example.test/image.jpg'],
    attributes: { colour: 'blue' },
    sourceRecordDigest: 'a'.repeat(64),
    ingestionState: 'staged_candidate',
    marketplaceListingAllowed: false,
  }],
  quarantined: [{
    index: 1,
    externalVariantRef: 'variant-2',
    reasons: ['INVALID_IMAGE_URL'],
  }],
  commercialActivationPerformed: false,
  capabilityPromotionPerformed: false,
  marketplaceListingPerformed: false,
};

function rpcClient(implementation: (...args: unknown[]) => unknown): RpcClient {
  return {
    rpc: vi.fn(implementation),
  } as unknown as RpcClient;
}

describe('Direct Supplier durable replay store', () => {
  it('uses the service RPC as the atomic durable replay boundary', async () => {
    const rpc = rpcClient(async () => ({ data: true, error: null }));
    const store = createSupabaseDirectSupplierReplayStore({
      supabase: rpc,
      supplierKey: 'uk-maker-001',
    });

    const claimed = await store.claim('evt_supplier_0001', new Date('2026-09-01T23:30:00.000Z'));

    expect(claimed).toBe(true);
    expect(rpc.rpc).toHaveBeenCalledWith('server_direct_supplier_claim_event_v1', {
      p_supplier_key: 'uk-maker-001',
      p_event_id: 'evt_supplier_0001',
      p_expires_at: '2026-09-01T23:30:00.000Z',
    });
  });

  it('fails closed when the replay RPC errors or returns a malformed result', async () => {
    const errored = createSupabaseDirectSupplierReplayStore({
      supabase: rpcClient(async () => ({ data: null, error: { message: 'denied' } })),
      supplierKey: 'uk-maker-001',
    });
    await expect(errored.claim('evt_supplier_0001', new Date('2026-09-01T23:30:00.000Z')))
      .rejects.toThrow('Direct Supplier replay claim failed: denied');

    const malformed = createSupabaseDirectSupplierReplayStore({
      supabase: rpcClient(async () => ({ data: 'yes', error: null })),
      supplierKey: 'uk-maker-001',
    });
    await expect(malformed.claim('evt_supplier_0001', new Date('2026-09-01T23:30:00.000Z')))
      .rejects.toThrow('Direct Supplier replay claim returned an invalid result');
  });
});

describe('Direct Supplier durable feed staging', () => {
  it('computes a deterministic PII-free batch digest from admitted metadata', () => {
    const first = computeDirectSupplierStagingBatchDigest({
      batch,
      accepted: admitted.accepted,
      quarantined: admitted.quarantined,
    });
    const second = computeDirectSupplierStagingBatchDigest({
      batch,
      accepted: admitted.accepted,
      quarantined: [{
        ...admitted.quarantined[0],
        reasons: [...admitted.quarantined[0].reasons].reverse(),
      }],
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
  });

  it('refuses to persist a batch that failed admission before touching Supabase', async () => {
    const rpc = rpcClient(async () => ({ data: null, error: null }));
    const rejected: DirectSupplierFeedAdmissionResult = {
      ok: false,
      batchErrors: ['invalid batch'],
      accepted: [],
      quarantined: [],
    };

    await expect(persistDirectSupplierFeedAdmission({ supabase: rpc, batch, admission: rejected }))
      .rejects.toThrow('Direct Supplier batch must pass feed admission before persistence');
    expect(rpc.rpc).not.toHaveBeenCalled();
  });

  it('persists only sanitized admitted candidates and quarantine metadata', async () => {
    const rpc = rpcClient(async () => ({
      data: {
        batchId: '11111111-1111-4111-8111-111111111111',
        duplicate: false,
        status: 'staged',
        acceptedCount: 1,
        quarantinedCount: 1,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
        interfaceVersion: 1,
      },
      error: null,
    }));

    const result = await persistDirectSupplierFeedAdmission({ supabase: rpc, batch, admission: admitted });

    expect(result.marketplaceListingPerformed).toBe(false);
    expect(result.capabilityPromotionPerformed).toBe(false);
    expect(result.commercialActivationPerformed).toBe(false);
    expect(rpc.rpc).toHaveBeenCalledTimes(1);

    const [, args] = vi.mocked(rpc.rpc).mock.calls[0];
    expect(args).toMatchObject({
      p_supplier_key: 'uk-maker-001',
      p_source_generated_at: '2026-08-30T23:30:00.000Z',
      p_source_transport: 'json_api',
      p_candidates: admitted.accepted,
      p_quarantined: admitted.quarantined,
    });
    expect((args as Record<string, unknown>).p_source_batch_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails closed on malformed persistence responses or count mismatches', async () => {
    const malformed = rpcClient(async () => ({
      data: {
        batchId: '11111111-1111-4111-8111-111111111111',
        duplicate: false,
        status: 'staged',
        acceptedCount: 1,
        quarantinedCount: 1,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: true,
        marketplaceListingPerformed: false,
        interfaceVersion: 1,
      },
      error: null,
    }));
    await expect(persistDirectSupplierFeedAdmission({ supabase: malformed, batch, admission: admitted }))
      .rejects.toThrow('Direct Supplier persistence returned a fail-open or malformed result');

    const mismatched = rpcClient(async () => ({
      data: {
        batchId: '11111111-1111-4111-8111-111111111111',
        duplicate: false,
        status: 'staged',
        acceptedCount: 0,
        quarantinedCount: 1,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
        interfaceVersion: 1,
      },
      error: null,
    }));
    await expect(persistDirectSupplierFeedAdmission({ supabase: mismatched, batch, admission: admitted }))
      .rejects.toThrow('Direct Supplier persistence count mismatch');
  });
});
