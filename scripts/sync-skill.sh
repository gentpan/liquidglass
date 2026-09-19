#!/bin/sh
# Copy the library files into the skill so both always ship the same code.
set -eu
cd "$(dirname "$0")/.."
cp lib/liquid-glass.js lib/glass-webgl.js lib/components.js skill/liquid-glass-web/assets/
echo "skill assets synced from lib/"
