import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { resolveDirectSupplierFoundationBinding } from '../_shared/directSupplierFoundationBinding';

type RpcClient = Pick<SupabaseClient, 'rpc'>;
const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111';

function clientWith(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return {
    rpc,
    client: { rpc } as unknown as RpcClient,
  };
}

describe('resolveDirectSupplierFoundationBinding', () => {
  it('maps a missing foundation supplier to a read-only blocked binding', async () => {
    const { client, rpc } = clientWith({
      eligible: false,
      reason: 'supplier_not_found',
      interfaceVersion: 1,
    });

    const result = await resolveDirectSupplierFoundationBinding(client, 'uk-maker-001');

    expect(rpc).toHaveBeenCalledWith('server_supplier_foundation_decision_v1', {
      p_supplier_key: 'uk-maker-001',
      p_territory: 'GB',
      p_required_capability: null,
    });
    expect(result).toEqual({
      ok: true,
      binding: expect.objectContaining({
        supplierKey: 'uk-maker-001',
        supplierFound: false,
        foundationReason: 'supplier_not_found',
        identityCaptureAllowed: false,
        canonicalImportBatchCreationAllowed: false,
        supplierFoundationReady: false,
        foundationMutationPerformed: false,
        canonicalIdentityMutationPerformed: false,
        canonicalImportBatchCreationPerformed: false,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
      }),
    });
  });

  it('allows non-banned candidate identity capture but blocks canonical import batch creation', async () => {
    const { client } = clientWith({
      eligible: false,
      reason: 'supplier_not_approved',
      supplierId: SUPPLIER_ID,
      lifecycleStatus: 'candidate',
      interfaceVersion: 1,
    });

    const result = await resolveDirectSupplierFoundationBinding(client, 'uk-maker-001');

    expect(result).toMatchObject({
      ok: true,
      binding: {
        supplierFound: true,
        supplierId: SUPPLIER_ID,
        lifecycleStatus: 'candidate',
        identityCaptureAllowed: true,
        canonicalImportBatchCreationAllowed: false,
        supplierFoundationReady: false,
      },
    });
  });

  it('blocks a banned supplier from identity capture and import creation', async () => {
    const { client } = clientWith({
      eligible: false,
      reason: 'supplier_not_approved',
      supplierId: SUPPLIER_ID,
      lifecycleStatus: 'banned',
      interfaceVersion: 1,
    });

    const result = await resolveDirectSupplierFoundationBinding(client, 'uk-maker-001');

    expect(result).toMatchObject({
      ok: true,
      binding: {
        supplierFound: true,
        lifecycleStatus: 'banned',
        identityCaptureAllowed: false,
        canonicalImportBatchCreationAllowed: false,
        supplierFoundationReady: false,
      },
    });
  });

  it('distinguishes approved lifecycle from full Supplier Foundation readiness', async () => {
    const { client } = clientWith({
      eligible: false,
      reason: 'qualification_incomplete',
      supplierId: SUPPLIER_ID,
      missingEvidence: ['identity'],
      interfaceVersion: 1,
    });

    const result = await resolveDirectSupplierFoundationBinding(client, 'uk-maker-001');

    expect(result).toMatchObject({
      ok: true,
      binding: {
        supplierFound: true,
        supplierId: SUPPLIER_ID,
        lifecycleStatus: 'approved',
        foundationReason: 'qualification_incomplete',
        identityCaptureAllowed: true,
        canonicalImportBatchCreationAllowed: true,
        supplierFoundationReady: false,
      },
    });
  });

  it('marks a fully ready approved supplier without enabling any side effect', async () => {
    const { client } = clientWith({
      eligible: true,
      reason: 'supplier_foundation_ready',
      supplierId: SUPPLIER_ID,
      supplierKey: 'uk-maker-001',
      interfaceVersion: 1,
    });

    const result = await resolveDirectSupplierFoundationBinding(client, 'uk-maker-001');

    expect(result).toEqual({
      ok: true,
      binding: {
        interfaceVersion: 1,
        supplierKey: 'uk-maker-001',
        supplierFound: true,
        supplierId: SUPPLIER_ID,
        lifecycleStatus: 'approved',
        foundationReason: 'supplier_foundation_ready',
        identityCaptureAllowed: true,
        canonicalImportBatchCreationAllowed: true,
        supplierFoundationReady: true,
        foundationMutationPerformed: false,
        canonicalIdentityMutationPerformed: false,
        canonicalImportBatchCreationPerformed: false,
        commercialActivationPerformed: false,
        capabilityPromotionPerformed: false,
        marketplaceListingPerformed: false,
      },
    });
  });

  it('fails closed for invalid input, RPC errors or unsupported upstream states', async () => {
    const { client: invalidClient, rpc } = clientWith({
      eligible: true,
      reason: 'supplier_foundation_ready',
      supplierId: SUPPLIER_ID,
      interfaceVersion: 1,
    });
    await expect(resolveDirectSupplierFoundationBinding(invalidClient, 'INVALID KEY'))
      .resolves.toEqual({ ok: false, error: 'Invalid Direct Supplier supplierKey' });
    expect(rpc).not.toHaveBeenCalled();

    const { client: errorClient } = clientWith(null, { message: 'database unavailable' });
    await expect(resolveDirectSupplierFoundationBinding(errorClient, 'uk-maker-001'))
      .resolves.toEqual({ ok: false, error: 'database unavailable' });

    const { client: malformedClient } = clientWith({
      eligible: true,
      reason: 'unexpected_state',
      supplierId: SUPPLIER_ID,
      interfaceVersion: 1,
    });
    await expect(resolveDirectSupplierFoundationBinding(malformedClient, 'uk-maker-001'))
      .resolves.toEqual({ ok: false, error: 'Supplier Foundation returned an unsupported binding state' });
  });
});
