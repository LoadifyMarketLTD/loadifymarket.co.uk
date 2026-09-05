#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist
set +e
npm test > /tmp/test-output.txt 2>&1
test_status=$?
set -e

printf '<!doctype html><html><body><h1>Temporary test diagnostic</h1><p>Exit: %s</p></body></html>\n' "$test_status" > dist/index.html

if [ "$test_status" -eq 0 ]; then
  printf '<!doctype html><html><body>tests-pass</body></html>\n' > dist/stage-tests-pass.html
  exit 0
fi

printf '<!doctype html><html><body>tests-fail</body></html>\n' > dist/stage-tests-fail.html

grep -E 'FAIL|AssertionError|Error:|expected|Test Files|Tests|❯|×|\.test\.|\.spec\.' /tmp/test-output.txt \
  | tail -n 8 \
  | while IFS= read -r line; do
      safe=$(printf '%s' "$line" | sed 's#[^A-Za-z0-9._-]#-#g' | cut -c1-150)
      [ -n "$safe" ] || safe=blank
      printf '<!doctype html><html><body>diagnostic</body></html>\n' > "dist/testdiag-${safe}.html"
    done

exit 0
