#!/bin/sh
# Builds dist/screenshots-with-marks-<version>.zip, ready for the Chrome Web Store
# (manifest.json at the zip root, docs excluded).
set -e
cd "$(dirname "$0")/../extension"
version=$(node -p "require('./manifest.json').version")
out="../dist/screenshots-with-marks-$version.zip"
mkdir -p ../dist
rm -f "$out"
zip -r -X "$out" . -x "README.md" -x "STORE.md" -x "*.DS_Store"
echo "Created dist/screenshots-with-marks-$version.zip"
