#!/bin/sh
set -eu

mark() {
  name="$1"
  rm -rf dist
  mkdir -p dist
  printf '<!doctype html><html><body>%s</body></html>\n' "$name" > dist/index.html
  printf '<!doctype html><html><body>%s</body></html>\n' "$name" > "dist/stage-${name}.html"
  exit 0
}

set +e
npx vitest run netlify/
status=$?
set -e
if [ "$status" -ne 0 ]; then mark netlify-tests-fail; fi

set +e
npx vitest run src/
status=$?
set -e
if [ "$status" -ne 0 ]; then mark src-tests-unexpected-fail; fi

set +e
npm test
status=$?
set -e
if [ "$status" -ne 0 ]; then mark other-tests-fail; fi

mark all-tests-pass
