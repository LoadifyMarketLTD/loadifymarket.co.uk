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
    expect(avasam.blockingDependencies).toEqual(['provider_transactional_evidence']);
    expect(avasam.providerActivationBlocked).toBe(true);
    expect(avasam.externalDependency).toBe(true);
    expect(avasam.platformEngineeringBlocked).toBe(false);
    expect(avasam.nextAction).toMatch(/do not block unrelated platform engineering/i);
  });

  it('routes BigBuy to the sandbox evidence gate without promoting capabilities', () => {
    const bigbuy = getSupplierProviderReadiness('bigbuy');
    expect(bigbuy.readinessState).toBe('sandbox_evidence_required');
    expect(bigbuy.verifiedCapabilities).toEqual([]);
    expect(bigbuy.blockingDependencies).toEqual(['sandbox_credentials', 'controlled_sandbox_identifiers']);
    expect(bigbuy.hostedActivation).toBe('off');
    expect(bigbuy.capabilityPromotionPerformed).toBe(false);
    expect(bigbuy.providerWriteActivationPerformed).toBe(false);
    expect(bigbuy.nextAction).toMatch(/sandbox API key/i);
  });

  it('routes Direct Supplier to authentic supplier onboarding instead of synthetic fixtures', () => {
    const direct = getSupplierProviderReadiness('direct_supplier');
    expect(direct.readinessState).toBe('authentic_supplier_required');
    expect(direct.verifiedCapabilities).toEqual([]);
    expect(direct.blockingDependencies).toEqual(['authentic_supplier']);
    expect(direct.nextAction).toMatch(/authentic UK\/EU supplier/i);
    expect(direct.nextAction).toMatch(/Phase E/i);
    expect(direct.nextAction).toMatch(/Phase F/i);
  });

  it('distinguishes retailer/API/contract blockers for the remaining providers', () => {
    const syncee = getSupplierProviderReadiness('syncee');
    const appscenic = getSupplierProviderReadiness('appscenic');
    const salehoo = getSupplierProviderReadiness('salehoo');
    const spocket = getSupplierProviderReadiness('spocket');

    expect(syncee.readinessState).toBe('partner_access_required');
    expect(syncee.blockingDependencies).toEqual(['partner_retailer_api_access']);
    expect(syncee.nextAction).toMatch(/not retailer catalog access/i);

    expect(appscenic.readinessState).toBe('partner_access_required');
    expect(appscenic.blockingDependencies).toEqual(['partner_retailer_api_access']);
    expect(appscenic.nextAction).toMatch(/Supplier Public API availability is not retailer API evidence/i);

    expect(salehoo.readinessState).toBe('directory_api_approval_required');
    expect(salehoo.blockingDependencies).toEqual(['directory_api_approval']);

    expect(spocket.readinessState).toBe('contract_blocked');
    expect(spocket.blockingDependencies).toEqual(['marketplace_resale_permission']);
  });

  it('models DSers developer approval and UK import compliance as independent blockers', () => {
    const dsers = getSupplierProviderReadiness('aliexpress_dsers');
    expect(dsers.readinessState).toBe('compliance_blocked');
    expect(dsers.blockingDependencies).toEqual(['developer_api_approval', 'uk_import_compliance_controls']);
    expect(dsers.nextAction).toMatch(/Developer\/Open API approval/i);
    expect(dsers.nextAction).toMatch(/UK import VAT/i);
    expect(dsers.verifiedCapabilities).toEqual([]);
    expect(dsers.hostedActivation).toBe('off');
  });

  it('never marks an external provider blocker as a blocker for independent platform engineering', () => {
    for (const readiness of listSupplierProviderReadiness()) {
      expect(readiness.blockingDependencies.length).toBeGreaterThan(0);
      expect(readiness.platformEngineeringBlocked).toBe(false);
      expect(readiness.providerWriteActivationPerformed).toBe(false);
      expect(readiness.capabilityPromotionPerformed).toBe(false);
    }
  });
});
