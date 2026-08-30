import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'supabase', 'migration-governance-baseline.json');
const tombstonePath = path.join(root, 'supabase', '00_consolidated_schema.sql');
const verificationPath = path.join(root, 'supabase', 'VERIFY_migration_health.sql');

function fail(message) {
  console.error(`migration-governance: FAIL: ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (!fs.existsSync(baselinePath)) {
  throw new Error('Missing supabase/migration-governance-baseline.json');
}

const baseline = readJson(baselinePath);
const canonicalDir = path.join(root, baseline.repositoryCanonical.directory);
if (!fs.existsSync(canonicalDir)) {
  throw new Error(`Missing canonical migration directory: ${baseline.repositoryCanonical.directory}`);
}

const migrationFiles = fs.readdirSync(canonicalDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const manifestEntries = [...baseline.canonicalEntries].sort((a, b) => a.file.localeCompare(b.file));
const manifestFiles = manifestEntries.map((entry) => entry.file);

if (migrationFiles.length !== baseline.repositoryCanonical.fileCount) {
  fail(
    `canonical file count changed from audited baseline ${baseline.repositoryCanonical.fileCount} to ${migrationFiles.length}; ` +
    'classify the change in a successor migration-governance baseline before merge',
  );
}

const allFiles = new Set([...migrationFiles, ...manifestFiles]);
for (const file of allFiles) {
  const onDisk = migrationFiles.includes(file);
  const classified = manifestFiles.includes(file);
  if (onDisk && !classified) fail(`unclassified canonical migration: ${file}`);
  if (!onDisk && classified) fail(`baseline references missing canonical migration: ${file}`);
}

const timestampPattern = /^(\d{14})_(.+)\.sql$/;
const versions = new Map();
const names = new Map();
const hostedHead = BigInt(baseline.hostedLedger.latestVersion);
let hostedExact = 0;

for (const entry of manifestEntries) {
  const match = entry.file.match(timestampPattern);
  if (!match) {
    fail(`invalid timestamped migration filename: ${entry.file}`);
    continue;
  }

  const [, fileVersion, fileName] = match;
  if (fileVersion !== entry.version || fileName !== entry.name) {
    fail(`baseline identity does not match filename: ${entry.file}`);
  }

  if (versions.has(entry.version)) {
    fail(`duplicate migration version ${entry.version}: ${versions.get(entry.version)} and ${entry.file}`);
  }
  versions.set(entry.version, entry.file);

  if (names.has(entry.name)) {
    fail(`duplicate migration name ${entry.name}: ${names.get(entry.name)} and ${entry.file}`);
  }
  names.set(entry.name, entry.file);

  if (entry.status === 'hosted_exact') {
    hostedExact += 1;
    continue;
  }

  if (entry.status === 'new_after_hosted_head') {
    if (BigInt(entry.version) <= hostedHead) {
      fail(
        `${entry.file} is classified as new_after_hosted_head but its version is not newer than ` +
        `${baseline.hostedLedger.latestVersion}; historical insertions require hosted-ledger reconciliation`,
      );
    }
    continue;
  }

  fail(`unsupported migration status '${entry.status}' for ${entry.file}`);
}

if (hostedExact !== baseline.repositoryCanonical.exactHostedVersionNameMatches) {
  fail(
    `hosted_exact count ${hostedExact} does not match audited baseline ` +
    baseline.repositoryCanonical.exactHostedVersionNameMatches,
  );
}

const represented = baseline.repositoryCanonical.exactHostedVersionNameMatches;
const unrepresented = baseline.repositoryCanonical.hostedEntriesWithoutExactRepositoryFile;
if (represented + unrepresented !== baseline.hostedLedger.totalMigrations) {
  fail(
    `hosted ledger arithmetic is inconsistent: ${represented} represented + ${unrepresented} unrepresented ` +
    `!= ${baseline.hostedLedger.totalMigrations} hosted`,
  );
}

if (!fs.existsSync(tombstonePath)) {
  fail('missing supabase/00_consolidated_schema.sql tombstone');
} else {
  const tombstone = fs.readFileSync(tombstonePath, 'utf8');
  if (!/DO NOT execute this file/i.test(tombstone) || !/supabase\/migrations\//i.test(tombstone)) {
    fail('00_consolidated_schema.sql no longer clearly preserves its non-executable tombstone contract');
  }
}

if (!fs.existsSync(verificationPath) || fs.statSync(verificationPath).size === 0) {
  fail('missing or empty supabase/VERIFY_migration_health.sql');
}

const legacyFiles = fs.readdirSync(path.join(root, 'supabase'))
  .filter((name) => /^\d+_.*\.sql$/.test(name))
  .sort();

console.log(`migration-governance: canonical files classified: ${migrationFiles.length}`);
console.log(`migration-governance: exact hosted version/name matches at audit baseline: ${hostedExact}`);
console.log(`migration-governance: hosted ledger entries not yet represented exactly in repo: ${unrepresented}`);
console.log(`migration-governance: legacy root SQL files observed: ${legacyFiles.length}`);
console.log(`migration-governance: bootstrap replay status: ${baseline.bootstrapReplay.status}`);
console.log('migration-governance: VERIFY_migration_health.sql presence checked only; this is NOT proof it ran against a database.');

if (baseline.bootstrapReplay.status !== 'READY') {
  console.warn(
    'migration-governance: KNOWN DEBT: empty-database replay is not yet proven. ' +
    'This guard prevents unclassified drift; it does not convert the current migration set into a clean bootstrap.',
  );
}

if (!process.exitCode) {
  console.log('migration-governance: PASS — audited drift baseline has not worsened.');
}
