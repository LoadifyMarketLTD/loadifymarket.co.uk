import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH,
  type DirectSupplierFeedBatchV1,
  type DirectSupplierWebhookEnvelopeV1,
} from '../_shared/directSupplierContract';
import type { DirectSupplierOnboardingManifestV1 } from '../_shared/directSupplierOnboarding';
import { computeDirectSupplierWebhookSignature } from '../_shared/directSupplierSecurity';
import { processDirectSupplierSignedFeed } from '../_shared/directSupplierSignedFeedPipeline';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const NOW = new Date('2026-08-31T09:40:00.000Z');
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

function oversizedBatch(): DirectSupplierFeedBatchV1 {
  return {
    contractVersion: 1,
    supplierKey: 'uk-maker-001',
    generatedAt: '2026-08-31T09:39:00.000Z',
    transport: 'json_feed',
    variants: Array.from(
      { length: DIRECT_SUPPLIER_MAX_VARIANTS_PER_BATCH + 1 },
      (_, index) => ({
        externalProductRef: `PROD-${index}`,
        externalVariantRef: `VAR-${index}`,
        sku: `SKU-${index}`,
        title: `Example Product ${index}`,
        currency: 'GBP',
        amountMinor: 2599,
        stockQuantity: 12,
        warehouseCountry: 'GB',
      }),
    ),
  };
}

function signedBody(payload: DirectSupplierFeedBatchV1) {
  const envelope: DirectSupplierWebhookEnvelopeV1<DirectSupplierFeedBatchV1> = {
    contractVersion: 1,
    eventId: 'evt_supplier_0501',
    eventType: 'catalog.updated',
    supplierKey: 'uk-maker-001',
    occurredAt: '2026-08-31T09:39:30.000Z',
    payload,
  };
  const rawBody = JSON.stringify(envelope);
  return {
    rawBody,
    signature: computeDirectSupplierWebhookSignature(SECRET, TIMESTAMP, rawBody),
  };
}

describe('Direct Supplier batch reviewability boundary', () => {
  it('rejects more than 500 variants before any persistence RPC', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const signed = signedBody(oversizedBatch());

    const result = await processDirectSupplierSignedFeed({
      supabase: { rpc } as unknown as RpcClient,
      manifest: MANIFEST,
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: signed.signature,
      rawBody: signed.rawBody,
      now: NOW,
    });

    expect(result).toEqual({
      ok: false,
      reason: 'FEED_ADMISSION_REJECTED',
      details: [
        'variants must contain at most 500 records; split larger feeds into smaller batches',
      ],
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
