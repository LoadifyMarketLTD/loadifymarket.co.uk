import { describe, expect, it } from 'vitest';
import {
  evaluateSupplierSourceAdmission,
  listSupplierSourcePolicies,
} from '../_shared/supplierSourcePolicy';

describe('supplier source policy', () => {
  it('defines the five independent Loadify supply channels', () => {
    expect(listSupplierSourcePolicies().map(item => item.channel)).toEqual([
      'direct_supplier_network',
      'supplier_aggregator',
      'wholesale_catalog_feed',
      'product_discovery',
      'multi_supplier_routing',
    ]);
  });

  it('allows direct supplier and wholesale staging without requiring an API transport', () => {
    const direct = evaluateSupplierSourceAdmission({
      channel: 'direct_supplier_network',
      transport: 'manual_catalog',
      supplierIdentityVerified: false,
      commercialTermsApproved: false,
      rightsAndComplianceVerified: false,
      canonicalSupplierOfferApproved: false,
    });
    const wholesale = evaluateSupplierSourceAdmission({
      channel: 'wholesale_catalog_feed',
      transport: 'csv',
      supplierIdentityVerified: false,
      commercialTermsApproved: false,
      rightsAndComplianceVerified: false,
      canonicalSupplierOfferApproved: false,
    });

    expect(direct.eligibleForStaging).toBe(true);
    expect(wholesale.eligibleForStaging).toBe(true);
    expect(direct.eligibleForBuyerCommerce).toBe(false);
    expect(wholesale.eligibleForBuyerCommerce).toBe(false);
  });

  it('keeps supplier aggregators fail closed until authority and compliance gates pass', () => {
    const blocked = evaluateSupplierSourceAdmission({
      channel: 'supplier_aggregator',
      transport: 'partner_api',
      supplierIdentityVerified: true,
      commercialTermsApproved: false,
      rightsAndComplianceVerified: true,
      canonicalSupplierOfferApproved: true,
    });
    expect(blocked.eligibleForStaging).toBe(true);
    expect(blocked.eligibleForSupplierOffer).toBe(false);
    expect(blocked.eligibleForBuyerCommerce).toBe(false);
    expect(blocked.reasons).toContain('commercial_terms_not_approved');
  });

  it('never allows discovery candidates to become buyer commerce directly', () => {
    const discovery = evaluateSupplierSourceAdmission({
      channel: 'product_discovery',
      transport: 'web_discovery',
      supplierIdentityVerified: true,
      commercialTermsApproved: true,
      rightsAndComplianceVerified: true,
      canonicalSupplierOfferApproved: true,
    });
    expect(discovery.eligibleForStaging).toBe(true);
    expect(discovery.eligibleForSupplierOffer).toBe(false);
    expect(discovery.eligibleForBuyerCommerce).toBe(false);
    expect(discovery.reasons).toContain('discovery_candidate_cannot_become_commerce_directly');
  });

  it('treats multi-supplier routing as orchestration over approved offers, not ingestion', () => {
    const routing = evaluateSupplierSourceAdmission({
      channel: 'multi_supplier_routing',
      transport: 'none',
      supplierIdentityVerified: true,
      commercialTermsApproved: true,
      rightsAndComplianceVerified: true,
      canonicalSupplierOfferApproved: true,
    });
    expect(routing.eligibleForStaging).toBe(false);
    expect(routing.eligibleForSupplierOffer).toBe(false);
    expect(routing.eligibleForBuyerCommerce).toBe(false);
  });
});
