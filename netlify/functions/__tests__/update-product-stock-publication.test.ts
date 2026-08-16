import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../update-product.ts'), 'utf8');

describe('update-product publication stock guard', () => {
  it('requires stock only for an explicit physical publication attempt', () => {
    expect(source).toContain("const explicitlyPublishing = updateData.isActive === true;");
    expect(source).toContain("if (explicitlyPublishing && nextContext === 'product' && normalizedStockQuantity <= 0)");
    expect(source).toContain('Add at least 1 unit of stock before publishing this product.');
  });

  it('does not replace the existing seller eligibility contract', () => {
    expect(source).toContain('if (wantsPublished && !sellerCanPublish)');
    expect(source).not.toContain('if (explicitlyPublishing && !sellerCanPublish)');
  });
});
