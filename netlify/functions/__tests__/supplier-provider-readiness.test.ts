import { describe, expect, it } from 'vitest';
import {
  getSupplierProviderReadiness,
  listSupplierProviderReadiness,
} from '../_shared/supplierProviderReadiness';

describe('supplier provider readiness control plane', () => {
  it('covers every registered provider exactly once', () => {
    const readiness = listSupplierProviderReadiness();
    expect(readiness.map(item => item.provider)).toEqual([
      'avasam',
      'bigbuy',
      'direct_supplier',
      'syncee',
      'appscenic',
      'salehoo',
      'spocket',
      'aliexpress_dsers',
    ]);
    expect(new Set(readiness.map(item => item.provider)).size).toBe(8);
  });

  it('makes Avasam an external provider blocker rather than a platform-engineering blocker', () => {
    const avasam = getSupplierProviderReadiness('avasam');
    expect(avasam.readinessState).toBe('read_only_verified');
    expect(avasam.verifiedCapabilities.length).toBeGreaterThan(0);
    expect(avasam.providerActivationBlocked).toBe(true);
    expect(avasam.externalDependency).toBe(true);
    expect(avasam.platformEngineeringBlocked).toBe(false);
    expect(avasam.nextAction).toMatch(/do not block unrelated platform engineering/i);
  });

  it('routes BigBuy to the sandbox evidence gate without promoting capabilities', () => {
    const bigbuy = getSupplierProviderReadiness('bigbuy');
    expect(bigbuy.readinessState).toBe('sandbox_evidence_required');
    expect(bigbuy.verifiedCapabilities).toEqual([]);
    expect(bigbuy.hostedActivation).toBe('off');
    expect(bigbuy.capabilityPromotionPerformed).toBe(false);
    expect(bigbuy.providerWriteActivationPerformed).toBe(false);
    expect(bigbuy.nextAction).toMatch(/sandbox API key/i);
  });

  it('routes Direct Supplier to authentic supplier onboarding instead of synthetic fixtures', () => {
    const direct = getSupplierProviderReadiness('direct_supplier');
    expect(direct.readinessState).toBe('authentic_supplier_required');
    expect(direct.verifiedCapabilities).toEqual([]);
    expect(direct.nextAction).toMatch(/authentic UK\/EU supplier/i);
    expect(direct.nextAction).toMatch(/Phase E/i);
    expect(direct.nextAction).toMatch(/Phase F/i);
  });

  it('keeps partner/directory/contract/compliance gates explicit for remaining providers', () => {
    expect(getSupplierProviderReadiness('syncee').readinessState).toBe('partner_access_required');
    expect(getSupplierProviderReadiness('appscenic').readinessState).toBe('partner_access_required');
    expect(getSupplierProviderReadiness('salehoo').readinessState).toBe('directory_api_approval_required');
    expect(getSupplierProviderReadiness('spocket').readinessState).toBe('contract_blocked');
    expect(getSupplierProviderReadiness('aliexpress_dsers').readinessState).toBe('compliance_blocked');
  });

  it('never marks an external provider blocker as a blocker for independent platform engineering', () => {
    for (const readiness of listSupplierProviderReadiness()) {
      expect(readiness.platformEngineeringBlocked).toBe(false);
      expect(readiness.providerWriteActivationPerformed).toBe(false);
      expect(readiness.capabilityPromotionPerformed).toBe(false);
    }
  });
});
