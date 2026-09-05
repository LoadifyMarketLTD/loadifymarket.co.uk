import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const repair = readRepo('netlify/functions/_shared/marketplaceTaxEvidenceRepair.ts');
const webWrapper = readRepo('netlify/functions-modern/create-checkout.ts');
const mobileWrapper = readRepo('netlify/functions-modern/create-payment-intent.ts');

describe('historical marketplace tax evidence repair guard', () => {
  it('decorates both web and mobile payment boundaries before the canonical handlers run', () => {
    for (const wrapper of [webWrapper, mobileWrapper]) {
      expect(wrapper).toContain('withMarketplaceTaxEvidenceRepair');
      expect(wrapper).toContain('withLambda(withMarketplaceTaxEvidenceRepair(handler))');
      expect(wrapper).toContain('installPostgrestCatchCompat();');
    }
  });

  it('requires authenticated access plus authoritative Stripe GB evidence and explicit seller declaration', () => {
    expect(repair).toContain('authenticateActiveAccount');
    expect(repair).toContain("taxCountrySource === 'stripe_connect_account_v1'");
    expect(repair).toContain('taxCountryCapturedAt');
    expect(repair).toContain('isOutsideP1GreatBritainPostcode');
    expect(repair).toContain('hasExplicitSellerNonVatDeclaration');
    expect(repair).toContain("normaliseMarketplaceCountry(seller.country) !== 'GB'");
  });

  it('materialises only the canonical non-VAT evidence without changing the listing price or inventing VAT', () => {
    expect(repair).toContain('buildSellerNonVatProductEvidence(product.price)');
    expect(repair).toContain(".eq('sellerId', sellerId)");
    expect(repair).toContain(".eq('listingContext', 'product')");
    expect(repair).toContain(".eq('isActive', true)");
    expect(repair).toContain("code: 'TAX_PRODUCT_EVIDENCE_REPAIR_FAILED'");
    expect(repair).not.toContain('price: product.price');
    expect(repair).not.toContain('vatRate: 0.2');
    expect(repair).not.toContain('/ 1.20');
  });
});
