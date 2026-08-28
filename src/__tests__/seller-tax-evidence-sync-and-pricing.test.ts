import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) =>
  readFileSync(path.resolve(process.cwd(), file), 'utf8');

const connectStatus = read('netlify/functions/connect-status.ts');
const sellerProfile = read('src/pages/pixel-perfect/seller/SellerProfile.tsx');
const productForm = read('src/pages/ProductFormPage.tsx');

describe('seller tax evidence synchronization boundary', () => {
  it('does not report Stripe evidence persistence failures as success', () => {
    expect(connectStatus).toContain("taxEvidenceReason: 'persist_failed'");
    expect(connectStatus).toContain("taxEvidenceReason: 'readback_failed'");
    expect(connectStatus).toContain(
      ".select('taxCountry, taxPostcode, taxCountrySource, taxCountryCapturedAt')"
    );
    expect(connectStatus).toContain('taxEvidenceReady');
  });

  it('makes the seller profile consume the explicit evidence readiness result', () => {
    expect(sellerProfile).toContain(
      'taxSyncPayload.taxEvidenceReady === true'
    );
    expect(sellerProfile).toContain(
      'Profile saved — tax setup still required'
    );
    expect(sellerProfile).toContain(
      'Stripe Connect did not return a usable GB postcode to Loadify'
    );
  });
});

describe('seller product tax presentation', () => {
  it('does not invent a blanket 20 percent VAT treatment', () => {
    expect(productForm).not.toContain('20% VAT applied');
    expect(productForm).not.toContain('priceNum / 1.2');
    expect(productForm).not.toContain('Price ex-VAT:');
    expect(productForm).toContain(
      'No VAT rate is assumed in this form.'
    );
  });

  it('labels publication of an inactive listing explicitly', () => {
    expect(productForm).toContain('loadedIsActive');
    expect(productForm).toContain("'Publish Draft'");
    expect(productForm).toContain(
      'This listing is a draft. Publish it when your seller and tax setup are ready.'
    );
  });
});


describe('existing seller draft editing', () => {
  it('allows an existing draft to be saved without publishing or leaving the editor', () => {
    expect(productForm).toContain('(!id || loadedIsActive === false)');
    expect(productForm).toContain(
      "id ? 'Save Draft' : 'Save as Draft'"
    );
    expect(productForm).toContain('id && !publishMode');
    expect(productForm).toContain('/seller/products/${id}/edit');
  });
});