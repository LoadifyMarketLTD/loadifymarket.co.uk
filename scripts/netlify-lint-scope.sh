#!/bin/sh
set -eu

npx eslint \
  e2e \
  capacitor.config.ts \
  playwright.config.ts \
  tailwind.config.ts \
  vite.config.ts
