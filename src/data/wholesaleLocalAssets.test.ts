import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST } from './wholesaleSubcategoryVisualManifest';
import { WHOLESALE_VISUAL_TAXONOMY } from './wholesaleVisualTaxonomy';

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

function inspectLocalPaths(paths: string[]) {
  const missing: string[] = [];
  const undersized: string[] = [];

  for (const assetPath of paths) {
    const relative = assetPath.replace(/^\//, '');
    const filePath = join(process.cwd(), 'public', relative);
    if (!existsSync(filePath)) {
      missing.push(assetPath);
      continue;
    }
    if (statSync(filePath).size < 20_000) {
      undersized.push(assetPath);
    }
  }

  return { missing, undersized };
}

describe('wholesale local visual assets release gate', () => {
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

  it('requires all 16 wholesale parent-category JPG files locally before release', () => {
    const paths = WHOLESALE_VISUAL_TAXONOMY.map((category) => category.imagePath);
    expect(new Set(paths).size).toBe(16);
    const { missing, undersized } = inspectLocalPaths(paths);
    expect(missing, `Missing local parent-category visuals:\n${missing.join('\n')}`).toEqual([]);
    expect(undersized, `Suspiciously small parent JPGs:\n${undersized.join('\n')}`).toEqual([]);
  });

  it('requires all 96 dedicated subcategory JPG files locally before release', () => {
    const paths = WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.map((entry) => entry.assetPath);
    const { missing, undersized } = inspectLocalPaths(paths);
    expect(missing, `Missing local subcategory visuals:\n${missing.join('\n')}`).toEqual([]);
    expect(undersized, `Suspiciously small local JPGs:\n${undersized.join('\n')}`).toEqual([]);
  });
});
