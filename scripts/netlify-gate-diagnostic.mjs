import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  ['lint', ['run', 'lint'], 1],
  ['test', ['test'], 2],
  ['build', ['run', 'build'], 4],
];

const report = [];
const failures = [];
for (const [name, args, markerCount] of checks) {
  const result = spawnSync('npm', args, {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const exitCode = result.status ?? 1;
  report.push([
    `## ${name}`,
    `exit=${exitCode}`,
    '',
    'STDOUT:',
    result.stdout || '',
    '',
    'STDERR:',
    result.stderr || '',
  ].join('\n'));
  if (exitCode !== 0) failures.push({ name, markerCount });
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/validation-report.txt', report.join('\n\n---\n\n'));
for (const { name, markerCount } of failures) {
  for (let i = 1; i <= markerCount; i += 1) {
    writeFileSync(`dist/validation-${name}-failed-${i}.txt`, `${name} failed\n`);
  }
}
process.exit(0);
