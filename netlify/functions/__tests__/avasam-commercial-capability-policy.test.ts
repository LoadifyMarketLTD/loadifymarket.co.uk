import { describe, expect, it } from 'vitest';
import { AvasamAdapterV1 } from '../_shared/avasamAdapter';
import {
  AVASAM_GATE_B_CAPABILITIES,
  AVASAM_VERIFIED_IMPLEMENTABLE_CAPABILITIES,
  canAdvertiseAvasamCapability,
  getAvasamCommercialCapabilityDecision,
  listAvasamCommercialCapabilityDecisions,
} from '../_shared/avasamCommercialCapabilityPolicy';
import { getSupplierProviderDefinition } from '../_shared/supplierProviderRegistry';

describe('Avasam Gate B commercial capability policy', () => {
  it('classifies the complete SupplierAdapterV1 capability surface', () => {
    const decisions = listAvasamCommercialCapabilityDecisions();

    expect(decisions.map(decision => decision.capability)).toEqual(AVASAM_GATE_B_CAPABILITIES);
    expect(new Set(decisions.map(decision => decision.capability)).size).toBe(AVASAM_GATE_B_CAPABILITIES.length);
  });

  it('allows adapter advertisement only for live-verified catalog, stock and price', () => {
    expect(AVASAM_VERIFIED_IMPLEMENTABLE_CAPABILITIES).toEqual(['catalog', 'stock', 'price']);

    const advertised = AVASAM_GATE_B_CAPABILITIES.filter(canAdvertiseAvasamCapability);
    expect(advertised).toEqual(['catalog', 'stock', 'price']);

    const adapter = new AvasamAdapterV1();
    expect(adapter.capabilities).toEqual(advertised);

    const registry = getSupplierProviderDefinition('avasam');
    expect(registry.verifiedCapabilities).toEqual(advertised);
    expect(registry.hostedActivation).toBe('off');
  });

  it('keeps order submission blocked by provider contract, Orders and PII gates', () => {
    const decision = getAvasamCommercialCapabilityDecision('order_submission');

    expect(decision.classification).toBe('PROVIDER_CONTRACT_STILL_MISSING');
    expect(decision.adapterAdvertisementAllowed).toBe(false);
    expect(decision.automatedExecutionAllowed).toBe(false);
    expect(decision.requiredPermissions).toEqual(['orders', 'pii']);
    expect(decision.blockers).toContain('canonical_order_create_endpoint_unconfirmed');
    expect(decision.blockers).toContain('stable_provider_order_identifier_missing');
    expect(decision.blockers).toContain('idempotency_contract_missing');
    expect(decision.blockers).toContain('lost_response_recovery_contract_missing');
  });

  it('treats tracking as a least-privilege PII boundary rather than a harmless read', () => {
    const decision = getAvasamCommercialCapabilityDecision('tracking');

    expect(decision.classification).toBe('REQUIRES_PII_PERMISSION');
    expect(decision.requiredPermissions).toEqual(['orders', 'pii']);
    expect(decision.adapterAdvertisementAllowed).toBe(false);
    expect(decision.blockers).toContain('dedicated_tracking_only_endpoint_not_verified');
    expect(decision.blockers).toContain('server_side_pii_minimisation_not_verified');
  });

  it('records controlled-supplier cancellation as manual-only and never advertises an API action', () => {
    const decision = getAvasamCommercialCapabilityDecision('cancellation');

    expect(decision.classification).toBe('VERIFIED_MANUAL_ONLY');
    expect(decision.automatedExecutionAllowed).toBe(false);
    expect(decision.adapterAdvertisementAllowed).toBe(false);
    expect(decision.blockers).toContain('gb010107_standard_cancellation_disabled');
    expect(decision.blockers).toContain('avasam_support_flow_required');
  });

  it('keeps shipping, acknowledgement, returns and reimbursement fail-closed', () => {
    for (const capability of ['shipping', 'acknowledgement', 'returns', 'reimbursement'] as const) {
      const decision = getAvasamCommercialCapabilityDecision(capability);
      expect(decision.classification).toBe('PROVIDER_CONTRACT_STILL_MISSING');
      expect(decision.adapterAdvertisementAllowed).toBe(false);
      expect(decision.automatedExecutionAllowed).toBe(false);
    }
  });
});
