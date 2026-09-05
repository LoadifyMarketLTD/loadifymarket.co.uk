#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist

set +e
npm test
status=$?
set -e

if [ "$status" -eq 0 ]; then
  printf '<!doctype html><html><body>full-tests-pass-v2</body></html>\n' > dist/index.html
  printf '<!doctype html><html><body>full-tests-pass-v2</body></html>\n' > dist/stage-full-tests-pass-v2.html
  exit 0
fi

printf '<!doctype html><html><body>full-tests-fail-v2</body></html>\n' > dist/index.html
printf '<!doctype html><html><body>full-tests-fail-v2</body></html>\n' > dist/stage-full-tests-fail-v2.html
exit 0
