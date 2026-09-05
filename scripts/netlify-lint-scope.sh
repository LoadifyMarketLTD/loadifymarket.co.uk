#!/bin/sh
set -eu

if [ -d .netlify ]; then
  find .netlify -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
    | xargs -0 -r npx eslint
fi
