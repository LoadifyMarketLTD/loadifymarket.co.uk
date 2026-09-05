#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist

set +e
npm test
status=$?
set -e

if [ "$status" -eq 0 ]; then
  printf '<!doctype html><html><body>tests-pass</body></html>\n' > dist/index.html
  printf '<!doctype html><html><body>tests-pass</body></html>\n' > dist/stage-tests-pass.html
  exit 0
fi

printf '<!doctype html><html><body>tests-fail</body></html>\n' > dist/index.html
printf '<!doctype html><html><body>tests-fail</body></html>\n' > dist/stage-tests-fail.html
exit 0
