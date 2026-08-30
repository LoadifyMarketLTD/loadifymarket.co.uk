import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const supabaseDir = resolve(repoRoot, 'supabase');
const healthSql = resolve(supabaseDir, 'VERIFY_migration_health.sql');

const sql = await readFile(healthSql, 'utf8');
if (!sql.trim()) {
  throw new Error('supabase/VERIFY_migration_health.sql is empty');
}

const entries = await readdir(supabaseDir, { withFileTypes: true });
const migrations = entries
  .filter((entry) => entry.isFile() && /^\d+_.*\.sql$/i.test(entry.name))
  .map((entry) => entry.name);

if (migrations.length === 0) {
  throw new Error('No numbered migration files found in supabase/');
}

const prefixes = migrations.map((name) => {
  const match = /^(\d+)_/.exec(name);
  if (!match) throw new Error(`Invalid numbered migration filename: ${name}`);
  return Number.parseInt(match[1], 10);
});

const counts = new Map();
for (const prefix of prefixes) {
  counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
}

const excessiveDuplicates = [...counts.entries()]
  .filter(([, count]) => count > 2)
  .map(([prefix]) => prefix)
  .sort((a, b) => a - b);

if (excessiveDuplicates.length > 0) {
  throw new Error(
    `Migration prefix(es) appear more than twice: ${excessiveDuplicates.join(', ')}`,
  );
}

const sorted = [...prefixes].sort((a, b) => a - b);
console.log(
  `Migration files checked: ${migrations.length}; unique prefixes: ${counts.size}; first=${sorted[0]} last=${sorted.at(-1)}`,
);
