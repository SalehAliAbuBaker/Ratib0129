#!/usr/bin/env bash
set -euo pipefail
mkdir -p vendor
# Pin the exact PDFMake browser bundle. Do not rely on a live CDN at runtime.
npm install --no-save --ignore-scripts --no-audit --no-fund pdfmake@0.2.23
cp node_modules/pdfmake/build/pdfmake.min.js vendor/ratib-pdfmake-0.2.23.min.js
curl --fail --location --retry 3 --silent --show-error \
  https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf \
  --output vendor/ratib-tajawal-regular.ttf
curl --fail --location --retry 3 --silent --show-error \
  https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf \
  --output vendor/ratib-tajawal-bold.ttf
file vendor/ratib-tajawal-*.ttf
test "$(stat -c%s vendor/ratib-pdfmake-0.2.23.min.js)" -gt 400000
test "$(stat -c%s vendor/ratib-tajawal-regular.ttf)" -gt 40000
test "$(stat -c%s vendor/ratib-tajawal-bold.ttf)" -gt 40000
sha256sum vendor/ratib-pdfmake-0.2.23.min.js vendor/ratib-tajawal-*.ttf
