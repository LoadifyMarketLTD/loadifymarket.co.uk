#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist

set +e
npx vitest run netlify/ --reporter=json --outputFile=/tmp/vitest-netlify.json
status=$?
set -e

if [ "$status" -eq 0 ]; then
  printf '<!doctype html><html><body>netlify-tests-pass</body></html>\n' > dist/index.html
  printf '<!doctype html><html><body>netlify-tests-pass</body></html>\n' > dist/stage-netlify-tests-pass.html
  exit 0
fi

node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
const report = JSON.parse(fs.readFileSync('/tmp/vitest-netlify.json', 'utf8'));
const clean = (value) => String(value ?? 'unknown')
  .replace(/[^A-Za-z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 110);
const writeMarker = (name) => {
  fs.writeFileSync(path.join(dist, `${name}.html`), `<!doctype html><html><body>${name}</body></html>\n`);
};

const failedSuites = (Array.isArray(report.testResults) ? report.testResults : [])
  .filter((suite) => suite?.status === 'failed');
let failedAssertions = 0;

for (const suite of failedSuites) {
  const file = clean(path.basename(String(suite.name ?? 'unknown-file')));
  const assertions = Array.isArray(suite.assertionResults) ? suite.assertionResults : [];
  const failed = assertions.filter((assertion) => assertion?.status === 'failed');
  if (failed.length === 0) {
    writeMarker(`failedcase-${file}--suite-level`);
    continue;
  }
  for (const assertion of failed) {
    failedAssertions += 1;
    const title = clean(assertion.fullName ?? assertion.title ?? 'unknown-assertion');
    writeMarker(`failedcase-${file}--${title}`);
  }
}

writeMarker(`stage-netlify-failed-assertions-${failedAssertions}`);
fs.writeFileSync(path.join(dist, 'index.html'), `<!doctype html><html><body>failed-assertions-${failedAssertions}</body></html>\n`);
NODE

exit 0
