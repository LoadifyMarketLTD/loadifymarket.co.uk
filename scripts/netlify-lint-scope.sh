#!/bin/sh
set -eu

npx eslint \
  src/components/presentation \
  src/components/product
