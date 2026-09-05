#!/bin/sh
set -eu

npm run lint || exit 41
npm test || exit 42
npm run build || exit 43
