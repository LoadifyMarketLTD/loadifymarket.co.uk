import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ProductFormPage.tsx'), 'utf8');

describe('ProductFormPage section numbering', () => {
  it('derives numbering from the sections that are actually visible', () => {
    expect(source).toContain("...(listingContext === 'product' ? ['inventory'] : [])");
    expect(source).toContain("...(listingContext === 'product' ? ['shipping'] : [])");
    expect(source).toContain("...(isBulkType ? ['typeDetails'] : [])");
    expect(source).toContain('const sectionNumber = (section: string) => visibleSections.indexOf(section) + 1;');
  });

  it('uses the dynamic section number for every numbered form section', () => {
    for (const key of ['basic', 'category', 'pricing', 'inventory', 'images', 'shipping', 'specifications', 'typeDetails', 'publish']) {
      expect(source).toContain(`sectionNumber('${key}')`);
    }

    expect(source).not.toMatch(/<Section title=["']\d+\./);
    expect(source).not.toContain("'9. Save Changes'");
    expect(source).not.toContain("'9. Publish Listing'");
  });
});
