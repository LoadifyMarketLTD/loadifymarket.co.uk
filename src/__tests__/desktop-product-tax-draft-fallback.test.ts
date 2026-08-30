import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const desktopProductForm = readRepo('src/pages/ProductFormPage.tsx');

describe('desktop seller listing tax-gate recovery', () => {
  it('preserves a tax-blocked new listing as an inactive draft', () => {
    expect(desktopProductForm).toContain(
      "payload.code === 'TAX_EVIDENCE_REQUIRED'"
    );
    expect(desktopProductForm).toContain(
      "const draftRes = await authorizedFetch('/.netlify/functions/create-product'"
    );
    expect(desktopProductForm).toContain(
      'body: JSON.stringify({ ...createBody, isActive: false })'
    );
    expect(desktopProductForm).toContain(
      'recoveredTaxDraftId = draftPayload.id'
    );
  });

  it('preserves a tax-blocked existing listing update as an inactive draft', () => {
    expect(desktopProductForm).toContain(
      "const draftRes = await authorizedFetch('/.netlify/functions/update-product'"
    );
    expect(desktopProductForm).toContain(
      'body: JSON.stringify({ ...updateBody, isActive: false })'
    );
    expect(desktopProductForm).toContain(
      'recoveredTaxDraftId = id'
    );
  });

  it('does not report a recovered draft as a live publication', () => {
    expect(desktopProductForm).toContain(
      'const createdAsDraft ='
    );
    expect(desktopProductForm).toContain(
      'setPublishedProductId(null)'
    );
    expect(desktopProductForm).toContain(
      'Complete or refresh your tax setup before publishing it live.'
    );
    expect(desktopProductForm).toContain(
      'const nextRoute = recoveredTaxDraftId'
    );
    expect(desktopProductForm).toContain(
      '/seller/products/${recoveredTaxDraftId}/edit'
    );
    expect(desktopProductForm).toContain(
      'trackPublishListing(created.id, formData.title)'
    );
  });
});
