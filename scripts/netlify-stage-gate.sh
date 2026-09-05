#!/bin/sh
set -eu

mark() {
  name="$1"
  rm -rf dist
  mkdir -p dist
  printf '<!doctype html><html><body><h1>Temporary Vitest isolation: %s</h1></body></html>\n' "$name" > dist/index.html
  printf '<!doctype html><html><body>%s</body></html>\n' "$name" > "dist/test-group-${name}.html"
  exit 0
}

run_test() {
  label="$1"
  file="$2"
  set +e
  npx vitest run "$file"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then mark "$label"; fi
}

run_test seller-direct-publish-ui-contract-fail src/__tests__/seller-direct-publish-ui-contract.test.ts
run_test seller-listing-layout-image-optimization-fail src/__tests__/seller-listing-layout-image-optimization.test.ts
run_test seller-profile-tax-resync-fail src/__tests__/seller-profile-tax-resync.test.ts
run_test seller-tax-evidence-sync-and-pricing-fail src/__tests__/seller-tax-evidence-sync-and-pricing.test.ts

set +e
npx vitest run src/
status=$?
set -e
if [ "$status" -ne 0 ]; then mark src-other-fail; fi

mark src-all-pass
