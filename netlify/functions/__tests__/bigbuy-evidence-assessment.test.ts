import { describe, expect, it } from 'vitest';
import { assessBigBuySandboxProbeEvidence } from '../_shared/bigBuyEvidenceAssessment';

function completeEvidence() {
  return {
    gate: 'bigbuy-sandbox-readonly-contract-probe',
    environment: 'sandbox',
    host: 'https://api.sandbox.bigbuy.eu',
    authentication: {
      negativeControlStatus: 401,
      bearerAuthenticated: true,
    },
    controlledScope: {
      parentTaxonomy: 123,
      product: { id: 111, skuMatched: true },
      variation: { id: 222, skuMatched: true, productBindingMatched: true },
    },
    verifiedReadContracts: {
      products: {
        matched: true,
        wholesalePriceNumeric: true,
        activeFlagValid: true,
      },
      variations: {
        matched: true,
        wholesalePriceNumeric: true,
        productBindingMatched: true,
      },
      productStock: {
        matched: true,
        stockBucketsValid: true,
      },
      variationStock: {
        matched: true,
        stockBucketsValid: true,
      },
    },
    safety: {
      ordersCalled: false,
      piiProcessed: false,
      capabilityPromotionPerformed: false,
      fullProviderPayloadLogged: false,
    },
  };
}

describe('BigBuy sandbox evidence assessment', () => {
  it('marks complete controlled read evidence only as candidate evidence, never registry promotion', () => {
    const result = assessBigBuySandboxProbeEvidence(completeEvidence());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.provider).toBe('bigbuy');
    expect(result.data.manualReviewRequired).toBe(true);
    expect(result.data.automaticRegistryPromotionPerformed).toBe(false);
    expect(result.data.decisions).toEqual([
      {
        capability: 'catalog',
        status: 'CANDIDATE_EVIDENCE_COMPLETE',
        blockers: [],
        registryPromotionAllowed: false,
        automatedExecutionAllowed: false,
      },
      {
        capability: 'variants',
        status: 'CANDIDATE_EVIDENCE_COMPLETE',
        blockers: [],
        registryPromotionAllowed: false,
        automatedExecutionAllowed: false,
      },
      {
        capability: 'stock',
        status: 'CANDIDATE_EVIDENCE_COMPLETE',
        blockers: [],
        registryPromotionAllowed: false,
        automatedExecutionAllowed: false,
      },
      {
        capability: 'price',
        status: 'CANDIDATE_EVIDENCE_COMPLETE',
        blockers: [],
        registryPromotionAllowed: false,
        automatedExecutionAllowed: false,
      },
    ]);
  });

  it('blocks every capability when evidence comes from an untrusted host', () => {
    const evidence = completeEvidence();
    evidence.host = 'https://example.invalid';

    const result = assessBigBuySandboxProbeEvidence(evidence);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const decision of result.data.decisions) {
      expect(decision.status).toBe('BLOCKED');
      expect(decision.blockers).toContain('untrusted_bigbuy_host');
      expect(decision.registryPromotionAllowed).toBe(false);
    }
  });

  it('blocks every capability if the probe touched orders or PII', () => {
    const evidence = completeEvidence();
    evidence.safety.ordersCalled = true;
    evidence.safety.piiProcessed = true;

    const result = assessBigBuySandboxProbeEvidence(evidence);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const decision of result.data.decisions) {
      expect(decision.status).toBe('BLOCKED');
      expect(decision.blockers).toContain('order_endpoint_was_called');
      expect(decision.blockers).toContain('pii_was_processed');
    }
  });

  it('can isolate incomplete stock evidence without pretending other read evidence failed', () => {
    const evidence = completeEvidence();
    evidence.verifiedReadContracts.variationStock.matched = false;
    evidence.verifiedReadContracts.variationStock.stockBucketsValid = false;

    const result = assessBigBuySandboxProbeEvidence(evidence);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byCapability = Object.fromEntries(result.data.decisions.map(decision => [decision.capability, decision]));

    expect(byCapability.catalog.status).toBe('CANDIDATE_EVIDENCE_COMPLETE');
    expect(byCapability.variants.status).toBe('CANDIDATE_EVIDENCE_COMPLETE');
    expect(byCapability.price.status).toBe('CANDIDATE_EVIDENCE_COMPLETE');
    expect(byCapability.stock.status).toBe('BLOCKED');
    expect(byCapability.stock.blockers).toEqual([
      'controlled_variation_stock_not_matched',
      'variation_stock_buckets_not_validated',
    ]);
  });

  it('blocks only price evidence when documented prices are not proven numeric', () => {
    const evidence = completeEvidence();
    evidence.verifiedReadContracts.products.wholesalePriceNumeric = false;

    const result = assessBigBuySandboxProbeEvidence(evidence);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byCapability = Object.fromEntries(result.data.decisions.map(decision => [decision.capability, decision]));

    expect(byCapability.catalog.status).toBe('CANDIDATE_EVIDENCE_COMPLETE');
    expect(byCapability.variants.status).toBe('CANDIDATE_EVIDENCE_COMPLETE');
    expect(byCapability.stock.status).toBe('CANDIDATE_EVIDENCE_COMPLETE');
    expect(byCapability.price.status).toBe('BLOCKED');
    expect(byCapability.price.blockers).toContain('product_wholesale_price_not_numeric');
  });

  it('fails structurally malformed evidence instead of coercing it', () => {
    const evidence = completeEvidence() as Record<string, unknown>;
    evidence.authentication = { negativeControlStatus: '401', bearerAuthenticated: true };

    const result = assessBigBuySandboxProbeEvidence(evidence);

    expect(result.ok).toBe(false);
    expect(result && !result.ok ? result.errorClass : null).toBe('MALFORMED_RESPONSE');
  });

  it('blocks evidence when authentication negative control did not fail closed', () => {
    const evidence = completeEvidence();
    evidence.authentication.negativeControlStatus = 200;

    const result = assessBigBuySandboxProbeEvidence(evidence);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const decision of result.data.decisions) {
      expect(decision.status).toBe('BLOCKED');
      expect(decision.blockers).toContain('negative_authentication_control_failed');
    }
  });
});
