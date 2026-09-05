#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist
set +e
npx eslint . -f json > dist/lint-report.json
lint_status=$?
set -e
printf '{"lintExit":%s}\n' "$lint_status" > dist/lint-status.json
printf '<!doctype html><html><body><p>Temporary ESLint diagnostic artifact.</p></body></html>\n' > dist/index.html
exit 0
