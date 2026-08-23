import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST } from './wholesaleSubcategoryVisualManifest';

describe('wholesale local subcategory assets release gate', () => {
  it('requires all 96 dedicated JPG files to exist locally before release', () => {
    const missing: string[] = [];
    const undersized: string[] = [];

    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      const relative = entry.assetPath.replace(/^\//, '');
      const filePath = join(process.cwd(), 'public', relative);
      if (!existsSync(filePath)) {
        missing.push(entry.assetPath);
        continue;
      }
      if (statSync(filePath).size < 20_000) {
        undersized.push(entry.assetPath);
      }
    }

    expect(missing, `Missing local subcategory visuals:\n${missing.join('\n')}`).toEqual([]);
    expect(undersized, `Suspiciously small local JPGs:\n${undersized.join('\n')}`).toEqual([]);
  });
});
