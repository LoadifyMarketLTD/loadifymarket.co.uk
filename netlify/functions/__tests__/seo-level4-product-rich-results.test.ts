import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getProductIdentifiers,
  merchantCondition,
  normaliseGtin,
  productAggregateRating,
  schemaItemCondition,
} from '../../../src/lib/productSeo';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('SEO Level 4 product rich results and Merchant data', () => {
  it('accepts only valid GS1 check-digit GTINs', () => {
    expect(normaliseGtin('4006381333931')).toBe('4006381333931');
    expect(normaliseGtin('036000291452')).toBe('036000291452');
    expect(normaliseGtin('12345670')).toBe('12345670');
    expect(normaliseGtin('4006381333932')).toBeUndefined();
    expect(normaliseGtin('not-a-gtin')).toBeUndefined();
  });

  it('uses only evidence-backed product identifiers', () => {
    expect(getProductIdentifiers({ brand: ' Example Brand ' })).toEqual({
      brand: 'Example Brand',
      identifierExists: true,
    });
    expect(getProductIdentifiers({ ean: '4006381333931', mpn: 'ABC-42' })).toEqual({
      gtin: '4006381333931',
      mpn: 'ABC-42',
      identifierExists: true,
    });
    expect(getProductIdentifiers({ gtin: '4006381333932' })).toEqual({
      identifierExists: false,
    });
    expect(getProductIdentifiers({})).toEqual({ identifierExists: false });
  });

  it('maps only supported product conditions and real aggregate ratings', () => {
    expect(merchantCondition('used')).toBe('used');
    expect(merchantCondition('refurbished')).toBe('refurbished');
    expect(merchantCondition('unknown')).toBe('new');
    expect(schemaItemCondition('new')).toBe('https://schema.org/NewCondition');
    expect(schemaItemCondition('used')).toBe('https://schema.org/UsedCondition');
    expect(schemaItemCondition('unknown')).toBeUndefined();
    expect(productAggregateRating(4.8, 12)).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.8,
      reviewCount: 12,
    });
    expect(productAggregateRating(5, 0)).toBeUndefined();
    expect(productAggregateRating(6, 3)).toBeUndefined();
  });

  it('keeps Merchant feed eligibility strictly to sellable physical products', () => {
    const source = read('netlify/functions/product-feed.ts');
    expect(source).toContain(".eq('isApproved', true)");
    expect(source).toContain(".eq('listingStatus', 'active')");
    expect(source).toContain(".eq('listingContext', 'product')");
    expect(source).toContain(".gt('stockQuantity', 0)");
    expect(source).toContain(".gt('price', 0)");
    expect(source).not.toContain('listingContext.eq.service');
  });

  it('never substitutes the marketplace as brand or invents Merchant identifiers/categories', () => {
    const source = read('netlify/functions/product-feed.ts');
    expect(source).toContain('getProductIdentifiers(product.specifications)');
    expect(source).toContain('if (identifiers.brand)');
    expect(source).not.toContain('<g:identifier_exists>no</g:identifier_exists>');
    expect(source).not.toContain("const BRAND = 'Loadify Market'");
    expect(source).not.toContain('<g:google_product_category>');
    expect(source).toContain('<g:product_type>');
  });

  it('enriches one crawler-visible Product JSON-LD object with real listing data', () => {
    const edge = read('netlify/edge-functions/product-meta.ts');
    expect(edge).toContain('&isApproved=eq.true');
    expect(edge).toContain("'specifications'");
    expect(edge).toContain("'rating'");
    expect(edge).toContain("'reviewCount'");
    expect(edge).toContain("'category:categories!categoryId(name,slug)'");
    expect(edge).toContain("brand: { '@type': 'Brand', name: identifiers.brand }");
    expect(edge).toContain("...(identifiers.gtin ? { gtin: identifiers.gtin } : {})");
    expect(edge).toContain("...(identifiers.mpn ? { mpn: identifiers.mpn } : {})");
    expect(edge).toContain('aggregateRating');
    expect(edge).toContain('itemCondition');
    expect(edge).toContain('safeJsonLd(productJsonLd)');
    expect(edge).toContain('.replace(/&/g,');
    expect(edge).toContain('.replace(/</g,');
    expect(edge).toContain('.replace(/>/g,');
  });

  it('noindexes confirmed missing products but not transient lookup failures', () => {
    const edge = read('netlify/edge-functions/product-meta.ts');
    expect(edge).toContain("lookup.status === 'not_found'");
    expect(edge).toContain("lookup.status === 'unavailable'");
    expect(edge).toContain("'noindex, nofollow'");
    expect(edge).toContain('Configuration or upstream outages must not accidentally deindex valid');
  });

  it('keeps product metadata buyer-focused and avoids duplicate hydrated Product JSON-LD', () => {
    const seo = read('src/components/SEO.tsx');
    expect(seo).toContain('PRODUCT_SELLER_PROMO_RE');
    expect(seo).toContain('ogType !== "product"');
    expect(seo).toContain('shouldRenderStructuredData');
  });
});
