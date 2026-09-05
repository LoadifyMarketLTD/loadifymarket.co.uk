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

set +e
npx vitest run \
  src/__tests__/desktop-product-tax-draft-fallback.test.ts \
  src/__tests__/light-compatibility-guard.test.ts \
  src/__tests__/mobile-sell-tax-draft-fallback.test.ts \
  src/__tests__/netlify-modern-wrapper-guard.test.ts
status=$?
set -e
if [ "$status" -ne 0 ]; then mark src-a-fail; fi

set +e
npx vitest run \
  src/__tests__/seller-direct-publish-ui-contract.test.ts \
  src/__tests__/seller-listing-layout-image-optimization.test.ts \
  src/__tests__/seller-profile-tax-resync.test.ts \
  src/__tests__/seller-tax-evidence-sync-and-pricing.test.ts
status=$?
set -e
if [ "$status" -ne 0 ]; then mark src-b-fail; fi

set +e
npx vitest run src/
status=$?
set -e
if [ "$status" -ne 0 ]; then mark src-other-fail; fi

mark src-all-pass
