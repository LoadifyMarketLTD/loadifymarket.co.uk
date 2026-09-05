#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist
set +e
npm run lint > /tmp/lint-output.txt 2>&1
lint_status=$?
set -e

printf '<!doctype html><html><body><h1>Temporary ESLint diagnostic</h1><p>Exit: %s</p></body></html>\n' "$lint_status" > dist/index.html

awk 'NF && $0 !~ /^>/ {print}' /tmp/lint-output.txt | head -n 5 | while IFS= read -r line; do
  safe=$(printf '%s' "$line" | sed 's#[^A-Za-z0-9._-]#-#g' | cut -c1-120)
  [ -n "$safe" ] || safe=blank
  printf '<!doctype html><html><body>diagnostic</body></html>\n' > "dist/diag-${safe}.html"
done

exit 0
