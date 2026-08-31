import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { readDirectSupplierStagingReview } from '../_shared/directSupplierStagingReview';

const BATCH_DIGEST = 'a'.repeat(64);
const RECORD_DIGEST = 'b'.repeat(64);

function rpcResponse(overrides: Record<string, unknown> = {}) {
  return {
    interfaceVersion: 1,
    status: 'staged',
    supplierKey: 'uk-maker-001',
    sourceBatchDigest: BATCH_DIGEST,
    sourceGeneratedAt: '2026-08-31T08:00:00.000Z',
    sourceTransport: 'json_api',
    acceptedCount: 1,
    quarantinedCount: 1,
    accepted: [
      {
        supplierKey: 'uk-maker-001',
        sourceGeneratedAt: '2026-08-31T08:00:00.000Z',
        sourceTransport: 'json_api',
        externalProductRef: 'product-001',
        externalVariantRef: 'variant-001',
        sku: 'SKU-001',
        gtin: '05012345678901',
        title: 'Supplier Product Title',
        currency: 'GBP',
        amountMinor: 1299,
        stockQuantity: 8,
        warehouseCountry: 'GB',
        imageUrls: ['https://supplier.example.test/image.jpg'],
        attributes: { Colour: 'Blue' },
        sourceRecordDigest: RECORD_DIGEST,
        ingestionState: 'staged_candidate',
        marketplaceListingAllowed: false,
      },
    ],
    quarantined: [
      {
        index: 1,
        externalVariantRef: 'variant-bad',
        reasons: ['INVALID_IMAGE_URL'],
      },
    ],
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
    canonicalImportBatchCreationPerformed: false,
    canonicalIdentityMutationPerformed: false,
    ...overrides,
  };
}

function clientWith(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return {
    rpc,
    client: { rpc } as unknown as Pick<SupabaseClient, 'rpc'>,
  };
}

describe('readDirectSupplierStagingReview', () => {
  it('turns one staged batch into the existing read-only canonical review package', async () => {
    const { client, rpc } = clientWith({ data: rpcResponse(), error: null });

    const result = await readDirectSupplierStagingReview(client, {
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: BATCH_DIGEST,
    });

    expect(rpc).toHaveBeenCalledWith('server_get_direct_supplier_staging_review_v1', {
      p_supplier_key: 'uk-maker-001',
      p_source_batch_digest: BATCH_DIGEST,
    });
    expect(result).toMatchObject({
      ok: true,
      reviewPackage: {
        interfaceVersion: 1,
        supplierKey: 'uk-maker-001',
        acceptedCount: 1,
        quarantinedCount: 1,
        requiresAdminReview: true,
        canonicalImportBatchCreationPerformed: false,
        canonicalIdentityMutationPerformed: false,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
      },
    });
    if (!result.ok) throw new Error('expected successful review package');
    expect(result.reviewPackage.items[0].commercialObservation).toMatchObject({
      amountMinor: 1299,
      stockQuantity: 8,
      disposition: 'review_only',
      canonicalIdentityWriteAllowed: false,
      marketplaceListingAllowed: false,
    });
    expect(result.reviewPackage.quarantined[0]).toEqual({
      index: 1,
      externalVariantRef: 'variant-bad',
      reasons: ['INVALID_IMAGE_URL'],
    });
  });

  it('fails before the RPC for invalid supplier binding or digest', async () => {
    const { client, rpc } = clientWith({ data: rpcResponse(), error: null });

    await expect(readDirectSupplierStagingReview(client, {
      supplierKey: 'INVALID KEY',
      sourceBatchDigest: BATCH_DIGEST,
    })).resolves.toMatchObject({ ok: false, kind: 'validation' });

    await expect(readDirectSupplierStagingReview(client, {
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: 'bad',
    })).resolves.toMatchObject({ ok: false, kind: 'validation' });

    expect(rpc).not.toHaveBeenCalled();
  });

  it('fails closed when the database response attempts to enable a commercial side effect', async () => {
    const { client } = clientWith({
      data: rpcResponse({ marketplaceListingPerformed: true }),
      error: null,
    });

    await expect(readDirectSupplierStagingReview(client, {
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: BATCH_DIGEST,
    })).resolves.toMatchObject({
      ok: false,
      kind: 'upstream',
      error: expect.stringContaining('marketplaceListingPerformed'),
    });
  });

  it('fails closed when database counts or supplier binding do not match the records', async () => {
    const { client: countClient } = clientWith({
      data: rpcResponse({ acceptedCount: 2 }),
      error: null,
    });
    await expect(readDirectSupplierStagingReview(countClient, {
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: BATCH_DIGEST,
    })).resolves.toMatchObject({ ok: false, kind: 'upstream' });

    const { client: bindingClient } = clientWith({
      data: rpcResponse({ supplierKey: 'other-supplier' }),
      error: null,
    });
    await expect(readDirectSupplierStagingReview(bindingClient, {
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: BATCH_DIGEST,
    })).resolves.toMatchObject({ ok: false, kind: 'upstream' });
  });

  it('maps a missing staged batch to a not-found result without leaking database detail', async () => {
    const { client } = clientWith({
      data: null,
      error: { message: 'direct supplier staged batch not found' },
    });

    await expect(readDirectSupplierStagingReview(client, {
      supplierKey: 'uk-maker-001',
      sourceBatchDigest: BATCH_DIGEST,
    })).resolves.toEqual({
      ok: false,
      kind: 'not_found',
      error: 'Direct Supplier staged batch not found',
    });
  });
});
