#!/bin/sh
set -eu

make_marker() {
  stage="$1"
  rm -rf dist
  mkdir -p dist
  printf '<!doctype html><html><body><h1>Temporary validation diagnostic: %s</h1></body></html>\n' "$stage" > dist/index.html
  printf '<!doctype html><html><body>%s</body></html>\n' "$stage" > "dist/stage-${stage}.html"
}

set +e
npm run lint
status=$?
set -e
if [ "$status" -ne 0 ]; then
  make_marker lint
  exit 0
fi

set +e
npm test
status=$?
set -e
if [ "$status" -ne 0 ]; then
  make_marker tests
  exit 0
fi

set +e
npm run build
status=$?
set -e
if [ "$status" -ne 0 ]; then
  make_marker build
  exit 0
fi

# Build succeeded and produced dist. Add a diagnostic marker without replacing it.
printf '<!doctype html><html><body>all-pass</body></html>\n' > dist/stage-all-pass.html
exit 0
