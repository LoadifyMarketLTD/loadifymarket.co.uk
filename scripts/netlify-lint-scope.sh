#!/bin/sh
set -eu

npx eslint \
  src/components/mobile \
  src/components/presentation \
  src/components/product
