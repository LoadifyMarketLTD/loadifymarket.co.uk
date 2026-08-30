import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const PLAYWRIGHT_VERSION = '1.62.1';
const packageLockUrl = new URL('../package-lock.json', import.meta.url);
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    // Windows resolves npm/npx through .cmd shims. Node 24 can reject direct
    // spawnSync of those shims with EINVAL unless they are invoked via a shell.
    // Keep POSIX execution shell-free.
    shell: isWindows,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

const originalPackageLock = await readFile(packageLockUrl, 'utf8');

try {
  // Keep the application's committed lockfile authoritative while adding the
  // pinned local-only E2E tool. Unlike --package-lock=false, this lets npm use
  // the existing lock graph instead of re-resolving unrelated dependencies.
  run(npmCommand, ['install', '--no-save', `@playwright/test@${PLAYWRIGHT_VERSION}`]);
} finally {
  // npm may update package-lock.json even with --no-save. Restore the exact
  // committed bytes so local E2E bootstrap cannot create repository drift.
  await writeFile(packageLockUrl, originalPackageLock, 'utf8');
}

run(npxCommand, ['playwright', 'install', 'chromium']);
