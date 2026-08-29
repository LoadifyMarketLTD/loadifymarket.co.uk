import { describe, expect, it } from 'vitest';
import {
  AVASAM_GB010107_POLICY,
  AVASAM_PILOT_SKU,
  AVASAM_PILOT_SUPPLIER_REF,
  evaluateAvasamGb010107Gate,
} from '../_shared/avasamSupplierPolicy';

describe('Avasam GB010107 supplier terms policy', () => {
  it('captures the presented supplier-specific risk terms without enabling commerce', () => {
    expect(AVASAM_GB010107_POLICY.commercialActivation).toBe('blocked');
    expect(AVASAM_GB010107_POLICY.listingEnabled).toBe(false);
    expect(AVASAM_GB010107_POLICY.orderSubmissionEnabled).toBe(false);
    expect(AVASAM_GB010107_POLICY.shipping.internationalSupported).toBe(false);
    expect(AVASAM_GB010107_POLICY.shipping.remoteUkRequiresQuote).toBe(true);
    expect(AVASAM_GB010107_POLICY.shipping.dispatchTerms.conflictStatus).toBe('unresolved');
    expect(AVASAM_GB010107_POLICY.shipping.deliveryTerms.conflictStatus).toBe('unresolved');
    expect(AVASAM_GB010107_POLICY.returns.nonFaultyReturnsAcceptedBySupplier).toBe(false);
    expect(AVASAM_GB010107_POLICY.pricing.automatedPricingRuleRequiredBeforeListing).toBe(true);
    expect(AVASAM_GB010107_POLICY.cancellation.standardCancellationDisabled).toBe(true);
    expect(AVASAM_GB010107_POLICY.cancellation.avasamSupportRequired).toBe(true);
  });

  it('allows only the exact pilot SKU to pass the sourcing gate after explicit terms acceptance', () => {
    expect(evaluateAvasamGb010107Gate({
      supplierRef: AVASAM_PILOT_SUPPLIER_REF,
      sku: AVASAM_PILOT_SKU,
      termsAccepted: true,
      action: 'read_only_source_pilot',
    })).toEqual({ eligible: true, blockers: [] });
  });

  it('fails the sourcing gate before supplier terms are accepted', () => {
    const decision = evaluateAvasamGb010107Gate({
      supplierRef: AVASAM_PILOT_SUPPLIER_REF,
      sku: AVASAM_PILOT_SKU,
      termsAccepted: false,
      action: 'read_only_source_pilot',
    });
    expect(decision.eligible).toBe(false);
    expect(decision.blockers).toContain('supplier_terms_not_accepted');
  });

  it('rejects sourcing for any SKU outside the controlled pilot', () => {
    const decision = evaluateAvasamGb010107Gate({
      supplierRef: AVASAM_PILOT_SUPPLIER_REF,
      sku: 'OTHER-SKU',
      termsAccepted: true,
      action: 'read_only_source_pilot',
    });
    expect(decision.eligible).toBe(false);
    expect(decision.blockers).toContain('sku_outside_controlled_pilot');
  });

  it('keeps listing fail-closed even after terms acceptance', () => {
    const decision = evaluateAvasamGb010107Gate({
      supplierRef: AVASAM_PILOT_SUPPLIER_REF,
      sku: AVASAM_PILOT_SKU,
      termsAccepted: true,
      action: 'listing',
    });
    expect(decision.eligible).toBe(false);
    expect(decision.blockers).toContain('commercial_activation_off');
    expect(decision.blockers).toContain('automated_pricing_rule_not_verified');
    expect(decision.blockers).toContain('dispatch_sla_conflict_unresolved');
    expect(decision.blockers).toContain('non_faulty_returns_economics_not_approved');
  });

  it('keeps order submission fail-closed even after terms acceptance', () => {
    const decision = evaluateAvasamGb010107Gate({
      supplierRef: AVASAM_PILOT_SUPPLIER_REF,
      sku: AVASAM_PILOT_SKU,
      termsAccepted: true,
      action: 'order_submission',
    });
    expect(decision.eligible).toBe(false);
    expect(decision.blockers).toContain('orders_permission_off');
    expect(decision.blockers).toContain('order_submission_capability_disabled');
  });
});
