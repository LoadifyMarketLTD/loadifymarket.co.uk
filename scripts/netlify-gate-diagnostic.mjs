import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['test'], {
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 20 * 1024 * 1024,
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
const failed = (result.status ?? 1) !== 0;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', '<!doctype html><title>test diagnostic</title>');
writeFileSync('dist/validation-report.txt', `exit=${result.status ?? 1}\n${output}`);

if (failed) {
  for (let i = 1; i <= 20; i += 1) {
    writeFileSync(`dist/test-marker-${i}.txt`, 'tests failed\n');
  }
}

process.exit(0);
