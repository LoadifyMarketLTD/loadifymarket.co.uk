#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist
set +e
npm run lint > dist/lint-stdout.txt 2> dist/lint-stderr.txt
lint_status=$?
set -e
printf '%s\n' "$lint_status" > dist/lint-exit.txt
printf '<!doctype html><html><body><h1>Temporary ESLint diagnostic</h1><p>Exit: %s</p><p><a href="/lint-stderr.txt">stderr</a></p><p><a href="/lint-stdout.txt">stdout</a></p></body></html>\n' "$lint_status" > dist/index.html
exit 0
