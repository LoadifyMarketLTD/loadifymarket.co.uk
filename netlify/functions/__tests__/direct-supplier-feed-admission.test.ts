import { describe, expect, it } from 'vitest';
import type { DirectSupplierFeedBatchV1 } from '../_shared/directSupplierContract';
import type { DirectSupplierOnboardingManifestV1 } from '../_shared/directSupplierOnboarding';
import { prepareDirectSupplierFeedForStaging } from '../_shared/directSupplierFeedAdmission';
import {
  createSupplierProviderAdapter,
  getSupplierProviderDefinition,
} from '../_shared/supplierProviderRegistry';

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
  generatedAt: '2026-08-30T22:55:00.000Z',
  transport: 'json_feed',
  variants: [
    {
      externalProductRef: ' PROD-001 ',
      externalVariantRef: ' VAR-001 ',
      sku: ' SKU-001 ',
      gtin: ' 05012345678901 ',
      title: ' Example Product ',
      currency: 'gbp',
      amountMinor: 2599,
      stockQuantity: 12,
      warehouseCountry: 'gb',
      imageUrls: ['https://supplier.example.test/images/1.jpg'],
      attributes: { colour: ' blue ', size: ' M ' },
    },
  ],
};

describe('Direct Supplier feed admission', () => {
  it('normalizes valid feed records only into non-commercial staging candidates', () => {
    const result = prepareDirectSupplierFeedForStaging({ manifest: MANIFEST, batch: BATCH });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.quarantined).toEqual([]);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      supplierKey: 'uk-maker-001',
      sourceTransport: 'json_feed',
      externalProductRef: 'PROD-001',
      externalVariantRef: 'VAR-001',
      sku: 'SKU-001',
      gtin: '05012345678901',
      title: 'Example Product',
      currency: 'GBP',
      amountMinor: 2599,
      stockQuantity: 12,
      warehouseCountry: 'GB',
      imageUrls: ['https://supplier.example.test/images/1.jpg'],
      attributes: { colour: 'blue', size: 'M' },
      ingestionState: 'staged_candidate',
      marketplaceListingAllowed: false,
    });
    expect(result.accepted[0].sourceRecordDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result).toMatchObject({
      commercialActivationPerformed: false,
      capabilityPromotionPerformed: false,
      marketplaceListingPerformed: false,
    });
  });

  it('fails the whole batch when supplier identity, transport or requested feed capabilities do not match onboarding', () => {
    const result = prepareDirectSupplierFeedForStaging({
      manifest: {
        ...MANIFEST,
        requestedCapabilities: ['catalog', 'price'],
      },
      batch: {
        ...BATCH,
        supplierKey: 'different-supplier',
        transport: 'csv',
      },
    });

    expect(result).toEqual(expect.objectContaining({
      ok: false,
      accepted: [],
      quarantined: [],
    }));
    if (result.ok) return;
    expect(result.batchErrors).toContain('batch supplierKey must match onboarding supplierKey');
    expect(result.batchErrors).toContain('batch transport must match onboarding feedTransport');
    expect(result.batchErrors).toContain('requestedCapabilities must include variants for feed staging');
    expect(result.batchErrors).toContain('requestedCapabilities must include stock when feed records contain stockQuantity');
  });

  it('quarantines every occurrence of an ambiguous duplicate external variant ref', () => {
    const duplicate = {
      ...BATCH.variants[0],
      externalProductRef: 'PROD-002',
      externalVariantRef: 'VAR-001',
    };
    const result = prepareDirectSupplierFeedForStaging({
      manifest: MANIFEST,
      batch: { ...BATCH, variants: [BATCH.variants[0], duplicate] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.accepted).toEqual([]);
    expect(result.quarantined).toHaveLength(2);
    for (const record of result.quarantined) {
      expect(record.reasons).toContain('DUPLICATE_EXTERNAL_VARIANT_REF');
    }
  });

  it('quarantines records from undeclared warehouses or with unsafe media metadata without blocking valid siblings', () => {
    const validSibling = {
      ...BATCH.variants[0],
      externalProductRef: 'PROD-002',
      externalVariantRef: 'VAR-002',
      sku: 'SKU-002',
    };
    const unsafe = {
      ...BATCH.variants[0],
      externalProductRef: 'PROD-003',
      externalVariantRef: 'VAR-003',
      warehouseCountry: 'FR',
      imageUrls: ['http://supplier.example.test/insecure.jpg'],
    };
    const result = prepareDirectSupplierFeedForStaging({
      manifest: MANIFEST,
      batch: { ...BATCH, variants: [validSibling, unsafe] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.accepted.map(item => item.externalVariantRef)).toEqual(['VAR-002']);
    expect(result.quarantined).toEqual([
      expect.objectContaining({
        index: 1,
        externalVariantRef: 'VAR-003',
        reasons: expect.arrayContaining(['UNDECLARED_WAREHOUSE_COUNTRY', 'INVALID_IMAGE_URL']),
      }),
    ]);
  });

  it('does not promote Direct Supplier capabilities or hosted activation by admitting a feed candidate', () => {
    const result = prepareDirectSupplierFeedForStaging({ manifest: MANIFEST, batch: BATCH });
    expect(result.ok).toBe(true);

    const definition = getSupplierProviderDefinition('direct_supplier');
    expect(definition.codeState).toBe('scaffolded_unverified');
    expect(definition.hostedActivation).toBe('off');
    expect(definition.verifiedCapabilities).toEqual([]);
    expect(createSupplierProviderAdapter('direct_supplier').capabilities).toEqual([]);
  });
});
