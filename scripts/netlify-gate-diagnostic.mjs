import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['test'], {
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 20 * 1024 * 1024,
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
const failed = (result.status ?? 1) !== 0;

const candidates = new Set();
for (const line of output.split(/\r?\n/)) {
  if (!/(FAIL|failed)/i.test(line)) continue;
  const match = line.match(/((?:[\w@.-]+\/)*[\w@.-]+\.(?:test|spec)\.[cm]?[jt]sx?)/i);
  if (match?.[1]) candidates.add(match[1]);
}

const slug = (value) => value
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(-140) || 'unknown';

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', '<!doctype html><title>test diagnostic</title>');
writeFileSync('dist/validation-report.txt', `exit=${result.status ?? 1}\n${output}`);

if (failed && candidates.size === 0) {
  writeFileSync('dist/diag-test-failed-no-file-detected.html', '<!doctype html><title>test failure</title>');
}
for (const file of candidates) {
  writeFileSync(`dist/diag-${slug(file)}.html`, `<!doctype html><title>${file}</title>`);
}

process.exit(0);
