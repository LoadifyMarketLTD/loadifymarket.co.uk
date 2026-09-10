import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const serverBoundaries = [
  'netlify/functions/create-product.ts',
  'netlify/functions/update-product.ts',
  'netlify/functions/create-checkout.ts',
  'netlify/functions/create-payment-intent.ts',
];

describe('Google Play prohibited marketplace item boundary', () => {
  it('uses one shared server-side classifier at publish and payment boundaries', () => {
    for (const path of serverBoundaries) {
      const source = read(path);
      expect(source).toContain('getMarketplaceProhibitedItemViolation');
      expect(source).toContain('marketplaceProhibitedItemResponseBody');
    }

    expect(read('netlify/functions/create-product.ts')).toContain('if (isActive)');
    expect(read('netlify/functions/update-product.ts')).toContain('if (wantsPublished)');
  });

  it('re-reads description/specifications at checkout so legacy listings cannot bypass the guard', () => {
    for (const path of [
      'netlify/functions/create-checkout.ts',
      'netlify/functions/create-payment-intent.ts',
    ]) {
      expect(read(path)).toContain('title, description, specifications, sellerId');
    }
  });

  it('publishes an explicit product policy aligned with the enforced categories', () => {
    const policy = read('src/pages/legal/ProhibitedItemsPolicyPage.tsx');
    expect(policy).toContain('Firearms, ammunition, explosives');
    expect(policy).toContain('Marijuana, cannabis, THC products');
    expect(policy).toContain('Tobacco or nicotine products');
    expect(policy).toContain('Alcoholic beverages');
    expect(policy).toContain('Prescription-only or controlled medicines');
    expect(policy).toContain('checkout/payment backstop');

    const sellerTerms = read('src/pages/pixel-perfect/SellerTerms.tsx');
    expect(sellerTerms).toContain('Prohibited Items Policy');
    expect(sellerTerms).toContain('server-side publication and checkout controls');
  });
});
