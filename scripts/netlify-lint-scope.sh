#!/bin/sh
set -eu

npx eslint src/components/auth || exit 11
npx eslint src/components/catalog || exit 12
npx eslint src/components/marketplace || exit 13
npx eslint src/components/mobile || exit 14
npx eslint src/components/presentation || exit 15
npx eslint src/components/product || exit 16
npx eslint src/components/*.ts src/components/*.tsx || exit 17
