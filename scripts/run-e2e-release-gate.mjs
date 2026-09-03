import { spawnSync } from 'node:child_process';
import process from 'node:process';

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) {
  throw new Error('npm_execpath is unavailable. Run this helper through `npm run e2e:release`.');
}

function runNode(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${process.execPath} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function runNpm(args, extraEnv = {}) {
  runNode([npmExecPath, ...args], extraEnv);
}

runNode(['scripts/verify-e2e-release-env.mjs']);
runNpm(['run', 'e2e:setup']);
runNpm(['run', 'e2e:typecheck']);
runNpm(
  [
    'exec',
    '--',
    'playwright',
    'test',
    'e2e/role-isolation.spec.ts',
    'e2e/critical-role-flows.spec.ts',
  ],
  { E2E_RELEASE_GATE: '1' },
);

console.log('Credentialed E2E release gate PASS');
