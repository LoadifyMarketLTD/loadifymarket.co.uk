#!/bin/sh
set -eu

find \
  .github android artifacts docs playstore_screenshots public resources supabase \
  -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
  | xargs -0 -r npx eslint
