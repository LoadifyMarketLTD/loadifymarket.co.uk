import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST } from './wholesaleSubcategoryVisualManifest';

type StagingEntry = {
  title: string;
  sourceId: string;
  sourcePage: string;
  targetPath: string;
};

type StagingManifest = {
  categories: Array<{ category: string; categorySlug: string; subcategories: StagingEntry[] }>;
};

const stagingManifestPath = join(process.cwd(), 'scripts', 'wholesale-subcategory-assets.json');
const stagingManifest = JSON.parse(readFileSync(stagingManifestPath, 'utf8')) as StagingManifest;
const stagingEntries = stagingManifest.categories.flatMap((category) =>
  category.subcategories.map((subcategory) => ({ ...subcategory, category: category.category })),
);

describe('wholesale local subcategory assets release gate', () => {
  it('keeps the local staging manifest aligned 96/96 with the TypeScript visual contract', () => {
    expect(stagingManifest.categories).toHaveLength(16);
    expect(stagingEntries).toHaveLength(96);
    expect(new Set(stagingEntries.map((entry) => entry.sourceId)).size).toBe(96);
    expect(new Set(stagingEntries.map((entry) => entry.targetPath)).size).toBe(96);

    for (const entry of WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST) {
      const staged = stagingEntries.find(
        (candidate) => candidate.category === entry.categoryLabel && candidate.title === entry.subcategoryLabel,
      );
      expect(staged, `Missing staging entry for ${entry.categoryLabel} -> ${entry.subcategoryLabel}`).toBeDefined();
      expect(staged?.targetPath.replace(/^public/, '')).toBe(entry.assetPath);
      expect(entry.sourcePage).toContain(staged?.sourceId);
      expect(entry.sourceImage).toContain(staged?.sourceId);
    }
  });

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
