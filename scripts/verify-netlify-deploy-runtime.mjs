import { lstatSync, realpathSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = process.cwd();
const nodeModules = resolve(root, 'node_modules');
const required = [
  '@supabase/supabase-js/package.json',
  '@netlify/functions/package.json',
];

const failures = [];

if (!existsSync(nodeModules)) {
  failures.push('node_modules is missing');
} else {
  const stat = lstatSync(nodeModules);
  const real = realpathSync(nodeModules);
  if (stat.isSymbolicLink() || resolve(real) !== resolve(nodeModules)) {
    failures.push(`node_modules must be physically installed in this worktree; resolved to ${real}`);
  }
}

for (const dependency of required) {
  const file = resolve(nodeModules, dependency);
  if (!existsSync(file)) failures.push(`required function runtime dependency missing: ${dependency}`);
}

if (failures.length) {
  console.error('NETLIFY_DEPLOY_RUNTIME=FAIL');
  for (const failure of failures) console.error('- ' + failure);
  console.error('Run npm ci in the deployment worktree before a production deploy and use --skip-functions-cache.');
  process.exit(1);
}

console.log('NETLIFY_DEPLOY_RUNTIME=PASS');
console.log('Deployment worktree has physical runtime dependencies. Use Netlify deploy with --skip-functions-cache.');
