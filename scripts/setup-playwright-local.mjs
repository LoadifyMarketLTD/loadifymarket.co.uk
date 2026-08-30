import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const PLAYWRIGHT_VERSION = '1.62.1';
const packageLockUrl = new URL('../package-lock.json', import.meta.url);
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  throw new Error('npm_execpath is unavailable. Run this helper through `npm run e2e:setup`.');
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${process.execPath} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function runNpm(args) {
  runNode([npmExecPath, ...args]);
}

const originalPackageLock = await readFile(packageLockUrl, 'utf8');

try {
  // Keep the application's committed lockfile authoritative while adding the
  // pinned local-only E2E tool. npm_execpath lets us invoke npm through the
  // current Node runtime without platform-specific .cmd shims or a shell.
  runNpm(['install', '--no-save', `@playwright/test@${PLAYWRIGHT_VERSION}`]);
} finally {
  // npm may update package-lock.json even with --no-save. Restore the exact
  // committed bytes so local E2E bootstrap cannot create repository drift.
  await writeFile(packageLockUrl, originalPackageLock, 'utf8');
}

runNpm(['exec', '--', 'playwright', 'install', 'chromium']);
