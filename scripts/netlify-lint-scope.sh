#!/bin/sh
set -eu
npx eslint \
  src/components/auth \
  src/components/catalog \
  src/components/marketplace \
  src/components/mobile \
  src/components/presentation \
  src/components/product
