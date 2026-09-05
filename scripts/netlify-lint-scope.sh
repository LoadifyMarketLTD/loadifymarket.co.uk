#!/bin/sh
set -eu

npx eslint \
  src/components/presentation/PresentationFooter.tsx \
  src/components/presentation/SectionNav.tsx
