import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepo = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

const mobileSellWizard = readRepo('src/pages/MobileSellWizard.tsx');

describe('mobile seller listing tax-gate recovery', () => {
  it('preserves seller work as a draft when P1 live tax evidence blocks publication', () => {
    expect(mobileSellWizard).toContain("data.code === 'TAX_EVIDENCE_REQUIRED'");
    expect(mobileSellWizard).toContain("body: JSON.stringify({ ...payload, isActive: false })");
    expect(mobileSellWizard).toContain("setListingResultMode('draft')");
    expect(mobileSellWizard).toContain('Item saved as draft');
    expect(mobileSellWizard).toContain('Complete or refresh your seller tax setup before publishing it live.');
  });

  it('does not report a tax-blocked draft as a published listing', () => {
    expect(mobileSellWizard).toContain("if (created.isActive === false)");
    expect(mobileSellWizard).toContain("setListingResultMode('published')");
    expect(mobileSellWizard).toContain('trackPublishListing(created.id, form.title.trim())');
    expect(mobileSellWizard).toContain("navigate(isDraft ? `/seller/products/${productId}/edit` : `/product/${productId}`)");
  });
});
