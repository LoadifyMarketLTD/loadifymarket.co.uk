import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const supabaseDir = resolve(repoRoot, 'supabase');
const migrationsDir = resolve(supabaseDir, 'migrations');
const healthSql = resolve(supabaseDir, 'VERIFY_migration_health.sql');

const sql = await readFile(healthSql, 'utf8');
if (!sql.trim()) {
  throw new Error('supabase/VERIFY_migration_health.sql is empty');
}

function countPrefixes(names) {
  const counts = new Map();
  for (const name of names) {
    const match = /^(\d+)_/.exec(name);
    if (!match) throw new Error(`Invalid numbered migration filename: ${name}`);
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

// Legacy SQL files still live directly under supabase/. Keep validating this
// historical surface so the existing health gate does not silently regress.
const legacyEntries = await readdir(supabaseDir, { withFileTypes: true });
const legacyMigrations = legacyEntries
  .filter((entry) => entry.isFile() && /^\d+_.*\.sql$/i.test(entry.name))
  .map((entry) => entry.name);

if (legacyMigrations.length === 0) {
  throw new Error('No numbered legacy SQL files found in supabase/');
}

const legacyCounts = countPrefixes(legacyMigrations);
const excessiveLegacyDuplicates = [...legacyCounts.entries()]
  .filter(([, count]) => count > 2)
  .map(([prefix]) => prefix)
  .sort((a, b) => Number(a) - Number(b));

if (excessiveLegacyDuplicates.length > 0) {
  throw new Error(
    `Legacy migration prefix(es) appear more than twice: ${excessiveLegacyDuplicates.join(', ')}`,
  );
}

// Supabase CLI applies files from supabase/migrations. This is the canonical
// migration history and must be checked independently from the legacy root files.
const canonicalEntries = await readdir(migrationsDir, { withFileTypes: true });
const canonicalMigrations = canonicalEntries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
  .map((entry) => entry.name)
  .sort();

if (canonicalMigrations.length === 0) {
  throw new Error('No canonical migration files found in supabase/migrations/');
}

const invalidCanonicalNames = canonicalMigrations.filter(
  (name) => !/^\d{14}_.+\.sql$/i.test(name),
);
if (invalidCanonicalNames.length > 0) {
  throw new Error(
    `Invalid canonical migration filename(s): ${invalidCanonicalNames.join(', ')}`,
  );
}

const canonicalCounts = countPrefixes(canonicalMigrations);
const duplicateCanonicalVersions = [...canonicalCounts.entries()]
  .filter(([, count]) => count !== 1)
  .map(([prefix]) => prefix)
  .sort();

if (duplicateCanonicalVersions.length > 0) {
  throw new Error(
    `Canonical migration version(s) are duplicated: ${duplicateCanonicalVersions.join(', ')}`,
  );
}

const canonicalVersions = canonicalMigrations.map((name) => name.slice(0, 14));

console.log(
  `Legacy SQL files checked: ${legacyMigrations.length}; unique prefixes: ${legacyCounts.size}`,
);
console.log(
  `Canonical migrations checked: ${canonicalMigrations.length}; unique versions: ${canonicalCounts.size}; first=${canonicalVersions[0]} last=${canonicalVersions.at(-1)}`,
);
