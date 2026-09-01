import { describe, expect, it } from 'vitest';
import { validateDirectSupplierFeedBatch } from '../_shared/directSupplierContract';
import {
  createSupplierProviderAdapter,
  getSupplierProviderDefinition,
  listSupplierProviderDefinitions,
} from '../_shared/supplierProviderRegistry';
import { assertSupplierAdapterV1 } from '../_shared/supplierAdapter';

const CONTEXT = {
  correlationId: 'provider-foundation-test',
  idempotencyKey: 'provider-foundation-idempotency',
  supplierKey: 'test-supplier',
  territory: 'GB',
};

describe('supplier provider registry', () => {
  it('keeps every hosted provider activation off', () => {
    expect(listSupplierProviderDefinitions().every(provider => provider.hostedActivation === 'off')).toBe(true);
  });

  it('does not register Syncee as a Loadify provider', () => {
    expect(listSupplierProviderDefinitions().map(provider => provider.key)).not.toContain('syncee');
  });

  it('preserves Avasam as the only provider with verified code capabilities', () => {
    const avasam = getSupplierProviderDefinition('avasam');
    expect(avasam.codeState).toBe('verified_read_only');
    expect(avasam.verifiedCapabilities).toEqual(['catalog', 'stock', 'price']);

    const others = listSupplierProviderDefinitions().filter(provider => provider.key !== 'avasam');
    expect(others.every(provider => provider.verifiedCapabilities.length === 0)).toBe(true);
  });

  it('scaffolds BigBuy without claiming or enabling unverified capabilities', async () => {
    const definition = getSupplierProviderDefinition('bigbuy');
    expect(definition.codeState).toBe('scaffolded_unverified');
    expect(definition.verifiedCapabilities).toEqual([]);
    expect(definition.potentialCapabilities).toContain('catalog');
    expect(definition.potentialCapabilities).toContain('order_submission');

    const adapter = createSupplierProviderAdapter('bigbuy');
    assertSupplierAdapterV1(adapter);
    expect(adapter.capabilities).toEqual([]);
    const result = await adapter.listCatalog?.(CONTEXT);
    expect(result?.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });

  it('scaffolds direct UK/EU suppliers behind the same fail-closed adapter boundary', async () => {
    const definition = getSupplierProviderDefinition('direct_supplier');
    expect(definition.role).toBe('direct_supplier');
    expect(definition.hostedActivation).toBe('off');

    const adapter = createSupplierProviderAdapter('direct_supplier');
    expect(adapter.providerKey).toBe('direct_supplier');
    expect(adapter.capabilities).toEqual([]);
    const result = await adapter.submitOrder?.(CONTEXT, {
      externalOfferRef: 'offer-1',
      quantity: 1,
      destinationCountry: 'GB',
    });
    expect(result?.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('CAPABILITY_UNAVAILABLE');
  });

  it('records Spocket as contract-blocked rather than an integration target', () => {
    const spocket = getSupplierProviderDefinition('spocket');
    expect(spocket.codeState).toBe('contract_blocked');
    expect(spocket.potentialCapabilities).toEqual([]);
    expect(spocket.requiresProviderOrPartnerApproval).toBe(true);
  });
});

describe('Loadify Direct Supplier Contract V1', () => {
  it('accepts a normalized PII-free supplier feed batch', () => {
    const errors = validateDirectSupplierFeedBatch({
      contractVersion: 1,
      supplierKey: 'uk-manufacturer-001',
      generatedAt: '2026-08-30T18:00:00.000Z',
      transport: 'json_api',
      variants: [{
        externalProductRef: 'P-100',
        externalVariantRef: 'P-100-BLK',
        sku: 'P-100-BLK',
        title: 'Example product',
        currency: 'GBP',
        amountMinor: 2599,
        stockQuantity: 14,
        warehouseCountry: 'GB',
      }],
    });
    expect(errors).toEqual([]);
  });

  it('rejects malformed money, stock and country data before ingestion', () => {
    const errors = validateDirectSupplierFeedBatch({
      contractVersion: 1,
      supplierKey: '',
      generatedAt: 'not-a-date',
      transport: 'csv',
      variants: [{
        externalProductRef: '',
        externalVariantRef: '',
        title: '',
        currency: 'pounds',
        amountMinor: -1,
        stockQuantity: -2,
        warehouseCountry: 'United Kingdom',
      }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(7);
  });
});
