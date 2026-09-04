import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  ['lint', ['run', 'lint']],
  ['test', ['test']],
  ['build', ['run', 'build']],
];

const report = [];
for (const [name, args] of checks) {
  const result = spawnSync('npm', args, {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  report.push([
    `## ${name}`,
    `exit=${result.status ?? 1}`,
    '',
    'STDOUT:',
    result.stdout || '',
    '',
    'STDERR:',
    result.stderr || '',
  ].join('\n'));
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/validation-report.txt', report.join('\n\n---\n\n'));
process.exit(0);
