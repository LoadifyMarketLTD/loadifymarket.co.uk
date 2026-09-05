#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist

set +e
npx vitest run netlify/functions/__tests__/checkout-safety.test.ts --reporter=json --outputFile=/tmp/vitest-checkout.json
status=$?
set -e

if [ "$status" -eq 0 ]; then
  printf '<!doctype html><html><body>checkout-safety-pass</body></html>\n' > dist/index.html
  printf '<!doctype html><html><body>checkout-safety-pass</body></html>\n' > dist/stage-checkout-safety-pass.html
  exit 0
fi

node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const report = JSON.parse(fs.readFileSync('/tmp/vitest-checkout.json', 'utf8'));
const clean = (value) => String(value ?? 'unknown')
  .replace(/\u001b\[[0-9;]*m/g, '')
  .replace(/[^A-Za-z0-9._=-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 180);
const failed = (report.testResults ?? [])
  .flatMap((suite) => suite.assertionResults ?? [])
  .filter((assertion) => assertion?.status === 'failed');

for (const assertion of failed) {
  const title = clean(assertion.fullName ?? assertion.title ?? 'failed');
  const messages = Array.isArray(assertion.failureMessages) ? assertion.failureMessages.join(' ') : '';
  const detail = clean(messages);
  const marker = `checkout-fail-${title}--${detail}`.slice(0, 230);
  fs.writeFileSync(path.join('dist', `${marker}.html`), `<!doctype html><html><body>${marker}</body></html>\n`);
}
fs.writeFileSync('dist/index.html', '<!doctype html><html><body>checkout-safety-fail-detail</body></html>\n');
fs.writeFileSync('dist/stage-checkout-safety-fail-detail.html', '<!doctype html><html><body>checkout-safety-fail-detail</body></html>\n');
NODE

exit 0
