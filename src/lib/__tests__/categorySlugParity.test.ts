/**
 * categorySlugParity.test.ts
 *
 * Regression guard: every slug defined in category-config.ts MUST be present
 * in the canonical DB seed (supabase/420_seed_wholesale_categories.sql).
 *
 * This prevents the following classes of environment drift:
 *  • A new static slug being added to the UI config without a matching DB row.
 *  • A DB slug being renamed without updating the UI config.
 *  • The consolidated schema being reset with the wrong seed data.
 *
 * The test reads the SQL seed file directly (filesystem, no DB connection
 * required) and compares against the TypeScript config export.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import CATEGORY_CONFIG from '../category-config';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract all slug values from the SQL seed file using a simple regex. */
function extractSqlSlugs(sql: string): Set<string> {
  const slugs = new Set<string>();
  // Matches single-quoted lowercase-kebab identifiers in VALUES tuples.
  // Covers single-word slugs (e.g. 'garden', 'diy') and hyphenated ones
  // (e.g. 'large-letter-items', 'wholesale-clothing').
  const re = /'([a-z][a-z0-9]*(?:-[a-z0-9]+)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    slugs.add(m[1]);
  }
  return slugs;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const seedPath = resolve(__dirname, '../../../supabase/420_seed_wholesale_categories.sql');
const seedSql = readFileSync(seedPath, 'utf-8');
const dbSlugs = extractSqlSlugs(seedSql);

/** All parent-level slugs defined in the UI config (excludes type-level slugs). */
const configSlugs: string[] = CATEGORY_CONFIG.map((c) => c.slug);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Category slug parity — UI config vs DB seed', () => {
  it('every config slug exists in the DB seed', () => {
    const missing = configSlugs.filter((slug) => !dbSlugs.has(slug));
    expect(
      missing,
      `Config slugs missing from DB seed: ${missing.join(', ')}\n` +
        `Add them to supabase/420_seed_wholesale_categories.sql`,
    ).toHaveLength(0);
  });

  it('config has at least one slug (sanity check)', () => {
    expect(configSlugs.length).toBeGreaterThan(0);
  });

  it('DB seed has at least one slug (sanity check)', () => {
    expect(dbSlugs.size).toBeGreaterThan(0);
  });
});
