import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveRoMarketplaceTaxContract,
  type RoMarketplaceTaxRuleEvidence,
} from '../../netlify/functions/_shared/marketplaceRoTax';

const migration = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260926103000_romania_marketplace_seller_tax_contract.sql'),
  'utf8',
);

const verifiedRule: RoMarketplaceTaxRuleEvidence = {
  eligible: true,
  reason: 'reviewed_ro_marketplace_tax_rule',
  market: 'RO',
  destinationCountry: 'RO',
  originScope: 'NON_EU',
  sellerTaxStatus: 'taxable_non_eu',
  buyerTaxStatus: 'consumer_non_taxable',
  supplyClass: 'import_distance_goods',
  consignmentValueClass: 'lte_150_eur',
  productVatClass: 'standard',
  interfaceVatRole: 'deemed_supplier',
  vatScheme: 'ioss',
  vatRateBps: 2100,
  priceTaxMode: 'vat_inclusive',
  legalBasisVersion: 'reviewed-example-v1',
  evidenceHash: 'abc123',
  reviewedAt: '2026-09-26T10:00:00.000Z',
  interfaceVersion: 1,
};

describe('Romania Marketplace Seller tax contract', () => {
  it('fails closed when no reviewed rule exists', () => {
    expect(resolveRoMarketplaceTaxContract({
      eligible: false,
      reason: 'ro_marketplace_tax_evidence_missing',
      market: 'RO',
      destinationCountry: 'RO',
      interfaceVersion: 1,
    })).toEqual({
      ok: false,
      code: 'RO_TAX_EVIDENCE_MISSING',
      message: 'Reviewed Romanian Marketplace Seller tax evidence is required before checkout can be enabled.',
    });
  });

  it('accepts only a complete reviewed-rule projection', () => {
    const result = resolveRoMarketplaceTaxContract(verifiedRule);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot).toMatchObject({
      jurisdiction: 'RO',
      destinationCountry: 'RO',
      originScope: 'NON_EU',
      sellerTaxStatus: 'taxable_non_eu',
      supplyClass: 'import_distance_goods',
      consignmentValueClass: 'lte_150_eur',
      interfaceVatRole: 'deemed_supplier',
      vatScheme: 'ioss',
      vatRateBps: 2100,
      priceTaxMode: 'vat_inclusive',
    });
  });

  it.each([
    ['missing review timestamp', { reviewedAt: undefined }],
    ['missing legal basis', { legalBasisVersion: '' }],
    ['missing evidence hash', { evidenceHash: '' }],
    ['wrong destination', { destinationCountry: 'GB' }],
    ['wrong interface version', { interfaceVersion: 2 }],
    ['zero rate with VAT-inclusive price', { vatRateBps: 0 }],
  ])('rejects malformed evidence: %s', (_label, patch) => {
    const result = resolveRoMarketplaceTaxContract({ ...verifiedRule, ...patch } as RoMarketplaceTaxRuleEvidence);
    expect(result.ok).toBe(false);
  });

  it('keeps route rules private, reviewed and service-role-only', () => {
    expect(migration).toContain('private.marketplace_tax_route_rules');
    expect(migration).toContain("status <> 'verified'");
    expect(migration).toContain('reviewed_by IS NOT NULL');
    expect(migration).toContain('reviewed_at IS NOT NULL');
    expect(migration).toContain('source_refs');
    expect(migration).toContain('legal_effective_from');
    expect(migration).toContain('legal_effective_to');
    expect(migration).toContain('REVOKE ALL ON TABLE private.marketplace_tax_route_rules');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated, service_role');
    expect(migration).toContain('server_marketplace_ro_tax_rule_v1');
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });

  it('does not seed or infer a Romanian rule during migration', () => {
    expect(migration).not.toMatch(/INSERT\s+INTO\s+private\.marketplace_tax_route_rules/i);
    expect(migration).toContain("reason', 'ro_marketplace_tax_evidence_missing'");
    expect(migration).toContain("vat_rate_bps IN (0,1100,2100)");
  });

  it('versions the legal basis so the 2027 EU rule change cannot silently reuse old evidence', () => {
    expect(migration).toContain('legal_basis_version');
    expect(migration).toContain('legal_effective_from');
    expect(migration).toContain('legal_effective_to');
    expect(migration).toContain('p_as_of date DEFAULT CURRENT_DATE');
  });
});
