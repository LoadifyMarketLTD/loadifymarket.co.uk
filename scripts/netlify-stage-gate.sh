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
const reportPath = '/tmp/vitest-netlify.json';
const writeMarker = (name, body = name) => {
  fs.writeFileSync(path.join(dist, `${name}.html`), `<!doctype html><html><body>${body}</body></html>\n`);
};

if (!fs.existsSync(reportPath)) {
  writeMarker('stage-netlify-reporter-json-missing');
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><body>reporter-json-missing</body></html>\n');
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch {
  writeMarker('stage-netlify-reporter-json-invalid');
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><body>reporter-json-invalid</body></html>\n');
  process.exit(0);
}

const results = Array.isArray(report.testResults) ? report.testResults : [];
const failed = results.filter((result) => result?.status === 'failed');

if (failed.length === 0) {
  writeMarker('stage-netlify-fail-without-failed-file');
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><body>netlify-fail-without-failed-file</body></html>\n');
  process.exit(0);
}

for (const result of failed) {
  const raw = String(result.name ?? 'unknown-test-file');
  const base = path.basename(raw).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 140);
  writeMarker(`failed-${base}`);
}

writeMarker(`stage-netlify-failed-files-${failed.length}`);
fs.writeFileSync(path.join(dist, 'index.html'), `<!doctype html><html><body>netlify-failed-files-${failed.length}</body></html>\n`);
NODE

exit 0
