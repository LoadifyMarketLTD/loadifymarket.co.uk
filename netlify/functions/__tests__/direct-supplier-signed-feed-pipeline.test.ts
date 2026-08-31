import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectSupplierFeedBatchV1, DirectSupplierWebhookEnvelopeV1 } from '../_shared/directSupplierContract';
import type { DirectSupplierOnboardingManifestV1 } from '../_shared/directSupplierOnboarding';
import { computeDirectSupplierWebhookSignature } from '../_shared/directSupplierSecurity';
import { processDirectSupplierSignedFeed } from '../_shared/directSupplierSignedFeedPipeline';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const NOW = new Date('2026-08-31T00:30:00.000Z');
const TIMESTAMP = String(Math.floor(NOW.getTime() / 1000));
const SECRET = 'direct-supplier-test-secret-32-bytes-minimum-value';

const MANIFEST: DirectSupplierOnboardingManifestV1 = {
  onboardingVersion: 1,
  supplierKey: 'uk-maker-001',
  legalName: 'Example UK Manufacturer Ltd',
  registrationCountry: 'GB',
  feedTransport: 'json_feed',
  warehouseDeclarations: [
    { externalWarehouseRef: 'blackburn-01', country: 'GB' },
  ],
  supportedTerritories: ['GB'],
  requestedCapabilities: ['catalog', 'variants', 'stock', 'price'],
  commercialApproval: false,
  hostedActivation: 'off',
};

const BATCH: DirectSupplierFeedBatchV1 = {
  contractVersion: 1,
  supplierKey: 'uk-maker-001',
  generatedAt: '2026-08-31T00:29:00.000Z',
  transport: 'json_feed',
  variants: [
    {
      externalProductRef: 'PROD-001',
      externalVariantRef: 'VAR-001',
      sku: 'SKU-001',
      title: 'Example Product',
      currency: 'GBP',
      amountMinor: 2599,
      stockQuantity: 12,
      warehouseCountry: 'GB',
      imageUrls: ['https://supplier.example.test/images/1.jpg'],
      attributes: { colour: 'blue' },
    },
  ],
};

function envelope(
  eventType: DirectSupplierWebhookEnvelopeV1['eventType'] = 'catalog.updated',
  payload: DirectSupplierFeedBatchV1 = BATCH,
): DirectSupplierWebhookEnvelopeV1<DirectSupplierFeedBatchV1> {
  return {
    contractVersion: 1,
    eventId: 'evt_supplier_0001',
    eventType,
    supplierKey: 'uk-maker-001',
    occurredAt: '2026-08-31T00:29:30.000Z',
    payload,
  };
}

function signedBody(value: unknown) {
  const rawBody = JSON.stringify(value);
  return {
    rawBody,
    signature: computeDirectSupplierWebhookSignature(SECRET, TIMESTAMP, rawBody),
  };
}

function rpcClient(implementation: (...args: unknown[]) => unknown): RpcClient {
  return {
    rpc: vi.fn(implementation),
  } as unknown as RpcClient;
}

describe('Direct Supplier signed feed pipeline', () => {
  it('rejects a bad HMAC before parsing or touching Supabase', async () => {
    const rpc = rpcClient(async () => ({ data: null, error: null }));
    const rawBody = '{not-json';

    const result = await processDirectSupplierSignedFeed({
      supabase: rpc,
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: `v1=${'0'.repeat(64)}`,
      rawBody,
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'SIGNATURE_REJECTED',
      details: ['INVALID_SIGNATURE'],
    });
    expect(rpc.rpc).not.toHaveBeenCalled();
  });

  it('blocks order and fulfilment event types even when the signature is valid', async () => {
    const rpc = rpcClient(async () => ({ data: null, error: null }));
    const signed = signedBody(envelope('order.acknowledged'));

    const result = await processDirectSupplierSignedFeed({
      supabase: rpc,
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    });

    expect(result).toMatchObject({ ok: false, reason: 'UNSUPPORTED_EVENT_TYPE' });
    expect(rpc.rpc).not.toHaveBeenCalled();
  });

  it('binds the signed envelope and feed payload to the onboarding supplier identity', async () => {
    const rpc = rpcClient(async () => ({ data: null, error: null }));
    const signed = signedBody(envelope('catalog.updated', { ...BATCH, supplierKey: 'other-maker' }));

    const result = await processDirectSupplierSignedFeed({
      supabase: rpc,
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'SUPPLIER_MISMATCH',
      details: ['feed payload supplierKey must match signed envelope supplierKey'],
    });
    expect(rpc.rpc).not.toHaveBeenCalled();
  });

  it('uses one atomic RPC for replay claim plus sanitized staging persistence', async () => {
    const rpc = rpcClient(async () => ({
      data: {
        eventClaimed: true,
        replayed: false,
        persisted: true,
        batchId: '11111111-1111-4111-8111-111111111111',
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
    }));
    const signed = signedBody(envelope());

    const result = await processDirectSupplierSignedFeed({
      supabase: rpc,
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    });

    expect(result).toMatchObject({
      ok: true,
      commit: {
        eventClaimed: true,
        replayed: false,
        persisted: true,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
      },
    });
    expect(rpc.rpc).toHaveBeenCalledTimes(1);
    expect(rpc.rpc).toHaveBeenCalledWith('server_commit_direct_supplier_signed_feed_v1', expect.objectContaining({
      p_supplier_key: 'uk-maker-001',
      p_event_id: 'evt_supplier_0001',
      p_expires_at: '2026-09-01T00:30:00.000Z',
      p_source_generated_at: '2026-08-31T00:29:00.000Z',
      p_source_transport: 'json_feed',
      p_candidates: [expect.objectContaining({
        supplierKey: 'uk-maker-001',
        externalVariantRef: 'VAR-001',
        ingestionState: 'staged_candidate',
        marketplaceListingAllowed: false,
      })],
      p_quarantined: [],
    }));
    const [, args] = vi.mocked(rpc.rpc).mock.calls[0];
    expect((args as Record<string, unknown>).p_source_batch_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('treats a previously committed event as an idempotent replay without a second persistence state', async () => {
    const rpc = rpcClient(async () => ({
      data: {
        eventClaimed: false,
        replayed: true,
        persisted: false,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
        interfaceVersion: 1,
      },
      error: null,
    }));
    const signed = signedBody(envelope());

    const result = await processDirectSupplierSignedFeed({
      supabase: rpc,
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    });

    expect(result).toEqual({
      ok: true,
      commit: {
        eventClaimed: false,
        replayed: true,
        persisted: false,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
        interfaceVersion: 1,
      },
    });
  });

  it('fails closed on RPC errors, fail-open flags or persistence count mismatches', async () => {
    const signed = signedBody(envelope());

    await expect(processDirectSupplierSignedFeed({
      supabase: rpcClient(async () => ({ data: null, error: { message: 'db unavailable' } })),
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    })).rejects.toThrow('Direct Supplier atomic signed feed commit failed: db unavailable');

    await expect(processDirectSupplierSignedFeed({
      supabase: rpcClient(async () => ({
        data: {
          eventClaimed: true,
          replayed: false,
          persisted: true,
          batchId: '11111111-1111-4111-8111-111111111111',
          duplicate: false,
          status: 'staged',
          acceptedCount: 1,
          quarantinedCount: 0,
          commercialActivationPerformed: true,
          capabilityPromotionPerformed: false,
          marketplaceListingPerformed: false,
          interfaceVersion: 1,
        },
        error: null,
      })),
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    })).rejects.toThrow('Direct Supplier atomic commit returned a fail-open result');

    await expect(processDirectSupplierSignedFeed({
      supabase: rpcClient(async () => ({
        data: {
          eventClaimed: true,
          replayed: false,
          persisted: true,
          batchId: '11111111-1111-4111-8111-111111111111',
          duplicate: false,
          status: 'staged',
          acceptedCount: 0,
          quarantinedCount: 0,
          commercialActivationPerformed: false,
          capabilityPromotionPerformed: false,
          marketplaceListingPerformed: false,
          interfaceVersion: 1,
        },
        error: null,
      })),
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    })).rejects.toThrow('Direct Supplier atomic commit count mismatch');
  });
});
