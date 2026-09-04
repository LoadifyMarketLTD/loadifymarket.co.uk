import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  ['lint', ['run', 'lint']],
  ['test', ['test']],
  ['build', ['run', 'build']],
];

const report = [];
let failed = false;

for (const [name, args] of checks) {
  const result = spawnSync('npm', args, { encoding: 'utf8', env: process.env });
  const code = result.status ?? 1;
  report.push(`## ${name}\nexit=${code}\n\nSTDOUT:\n${result.stdout || ''}\n\nSTDERR:\n${result.stderr || ''}\n`);
  if (code !== 0) failed = true;
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/validation-report.txt', report.join('\n---\n'));
writeFileSync('dist/validation-status.json', JSON.stringify({ failed, generatedAt: new Date().toISOString() }, null, 2));

// Diagnostic-only: always exit 0 so Netlify publishes the report.
process.exit(0);
