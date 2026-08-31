import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { upsertDirectSupplierFoundationCandidate } from '../_shared/directSupplierFoundationCandidate';
import {
  parseDirectSupplierOnboardingManifest,
  type DirectSupplierOnboardingManifestV1,
} from '../_shared/directSupplierOnboarding';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_ID = '22222222-2222-4222-8222-222222222222';

const MANIFEST: DirectSupplierOnboardingManifestV1 = {
  onboardingVersion: 1,
  supplierKey: 'uk-maker-001',
  legalName: 'Example UK Manufacturer Ltd',
  registrationCountry: 'GB',
  registrationNumber: '12345678',
  vatNumber: 'GB123456789',
  feedTransport: 'json_feed',
  warehouseDeclarations: [
    { externalWarehouseRef: 'blackburn-01', country: 'GB' },
  ],
  supportedTerritories: ['GB'],
  requestedCapabilities: ['catalog', 'variants', 'stock', 'price'],
  commercialApproval: false,
  hostedActivation: 'off',
};

function clientWith(
  implementation: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>,
): { client: RpcClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn(implementation);
  return { client: { rpc } as unknown as RpcClient, rpc };
}

describe('Direct Supplier onboarding manifest runtime parsing', () => {
  it('normalizes a valid external manifest while preserving fail-closed activation flags', () => {
    const result = parseDirectSupplierOnboardingManifest({
      ...MANIFEST,
      supplierKey: 'uk-maker-001 ',
      legalName: ' Example UK Manufacturer Ltd ',
      registrationCountry: 'gb',
      warehouseDeclarations: [
        { externalWarehouseRef: ' blackburn-01 ', country: 'gb' },
      ],
      supportedTerritories: ['gb'],
    });

    expect(result).toEqual({
      ok: true,
      manifest: {
        ...MANIFEST,
        supplierKey: 'uk-maker-001',
        legalName: 'Example UK Manufacturer Ltd',
        registrationCountry: 'GB',
        warehouseDeclarations: [
          { externalWarehouseRef: 'blackburn-01', country: 'GB' },
        ],
        supportedTerritories: ['GB'],
      },
    });
  });

  it('rejects unknown credential fields, unsupported transports and unsupported capabilities', () => {
    const result = parseDirectSupplierOnboardingManifest({
      ...MANIFEST,
      feedTransport: 'webhook_magic',
      requestedCapabilities: ['catalog', 'root_access'],
      apiKey: 'must-never-be-accepted-here',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('unsupported onboarding field: apiKey');
    expect(result.errors).toContain('feedTransport is unsupported');
    expect(result.errors).toContain('unsupported requested capability: root_access');
  });

  it('fails closed on malformed arrays instead of trusting TypeScript-only shapes', () => {
    const result = parseDirectSupplierOnboardingManifest({
      ...MANIFEST,
      warehouseDeclarations: 'GB',
      supportedTerritories: ['GB', 123],
      requestedCapabilities: 'catalog',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('warehouseDeclarations must be an array');
    expect(result.errors).toContain('supportedTerritories must be an array of strings');
    expect(result.errors).toContain('requestedCapabilities must be an array of strings');
  });
});

describe('Direct Supplier Supplier Foundation candidate onboarding', () => {
  it('uses only the existing upsert_supplier action and withholds qualification/capability evidence', async () => {
    const { client, rpc } = clientWith(async (name, args) => {
      if (name === 'server_admin_supplier_foundation_v1') {
        return {
          data: {
            ok: true,
            supplierId: SUPPLIER_ID,
            supplierKey: 'uk-maker-001',
            interfaceVersion: 1,
          },
          error: null,
        };
      }
      if (name === 'server_supplier_foundation_decision_v1') {
        return {
          data: {
            eligible: false,
            reason: 'supplier_not_approved',
            supplierId: SUPPLIER_ID,
            lifecycleStatus: 'candidate',
            interfaceVersion: 1,
          },
          error: null,
        };
      }
      throw new Error(`unexpected RPC ${name}`);
    });

    const result = await upsertDirectSupplierFoundationCandidate({
      client,
      actorId: ACTOR_ID,
      manifest: MANIFEST,
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, 'server_admin_supplier_foundation_v1', {
      p_actor_id: ACTOR_ID,
      p_action: 'upsert_supplier',
      p_payload: {
        supplierKey: 'uk-maker-001',
        displayName: 'Example UK Manufacturer Ltd',
        legalName: 'Example UK Manufacturer Ltd',
        businessCountry: 'GB',
        warehouseRefs: [
          { externalWarehouseRef: 'blackburn-01', country: 'GB' },
        ],
      },
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'server_supplier_foundation_decision_v1', {
      p_supplier_key: 'uk-maker-001',
      p_territory: 'GB',
      p_required_capability: null,
    });

    const firstArgs = vi.mocked(rpc).mock.calls[0][1] as Record<string, unknown>;
    const foundationPayload = firstArgs.p_payload as Record<string, unknown>;
    expect(foundationPayload).not.toHaveProperty('registrationNumber');
    expect(foundationPayload).not.toHaveProperty('vatNumber');
    expect(foundationPayload).not.toHaveProperty('requestedCapabilities');
    expect(foundationPayload).not.toHaveProperty('commercialApproval');
    expect(foundationPayload).not.toHaveProperty('hostedActivation');
    expect(foundationPayload).not.toHaveProperty('originCountry');

    expect(result).toMatchObject({
      ok: true,
      candidate: {
        interfaceVersion: 1,
        supplierId: SUPPLIER_ID,
        supplierKey: 'uk-maker-001',
        foundationBinding: {
          supplierFound: true,
          lifecycleStatus: 'candidate',
          identityCaptureAllowed: true,
          canonicalImportBatchCreationAllowed: false,
          supplierFoundationReady: false,
        },
        registrationEvidencePending: true,
        vatEvidencePending: true,
        requestedCapabilitiesRecordedAsIntentOnly: true,
        requestedCapabilitiesPromoted: false,
        lifecycleMutationPerformed: false,
        qualificationMutationPerformed: false,
        adapterRegistrationMutationPerformed: false,
        commercialActivationPerformed: false,
        marketplaceListingPerformed: false,
      },
    });
  });

  it('fails closed if the candidate write fails and never tries to advance foundation state', async () => {
    const { client, rpc } = clientWith(async () => ({
      data: null,
      error: { message: 'material supplier identity changes require verification lifecycle' },
    }));

    const result = await upsertDirectSupplierFoundationCandidate({
      client,
      actorId: ACTOR_ID,
      manifest: MANIFEST,
    });

    expect(result).toEqual({
      ok: false,
      error: 'material supplier identity changes require verification lifecycle',
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('server_admin_supplier_foundation_v1', expect.objectContaining({
      p_action: 'upsert_supplier',
    }));
  });

  it('fails closed if post-write read-back does not bind to the exact supplier identity', async () => {
    const { client } = clientWith(async (name) => {
      if (name === 'server_admin_supplier_foundation_v1') {
        return {
          data: {
            ok: true,
            supplierId: SUPPLIER_ID,
            supplierKey: 'uk-maker-001',
            interfaceVersion: 1,
          },
          error: null,
        };
      }
      return {
        data: {
          eligible: false,
          reason: 'supplier_not_approved',
          supplierId: '33333333-3333-4333-8333-333333333333',
          lifecycleStatus: 'candidate',
          interfaceVersion: 1,
        },
        error: null,
      };
    });

    await expect(upsertDirectSupplierFoundationCandidate({
      client,
      actorId: ACTOR_ID,
      manifest: MANIFEST,
    })).resolves.toEqual({
      ok: false,
      error: 'Supplier Foundation candidate verification returned a mismatched supplier identity',
    });
  });

  it('rejects an invalid actor before any database RPC', async () => {
    const { client, rpc } = clientWith(async () => ({ data: null, error: null }));

    const result = await upsertDirectSupplierFoundationCandidate({
      client,
      actorId: 'not-a-uuid',
      manifest: MANIFEST,
    });

    expect(result).toEqual({ ok: false, error: 'Active admin actor ID is required' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
