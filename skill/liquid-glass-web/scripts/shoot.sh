#!/bin/zsh
# Screenshot one URL in Chromium, WebKit and Gecko (macOS), so glass can be compared per engine.
#
#   shoot.sh <url> <out-dir> [width=1100] [height=2300]
#
# Writes <out-dir>/chrome.png (2x), webkit.png (2x), firefox.png (1x). Chrome waits via
# --virtual-time-budget, WebKit via a timed snapshot. Firefox shoots on the load event: serve the
# page with serve.py and add ?hold=2500 (or &hold=2500) to the URL, or it captures the page before
# the glass has rendered. Firefox headless screenshots also leave WebGL canvases blank — check
# WebGL there by reading pixels back instead. Chrome here uses --virtual-time-budget, which can
# freeze springs mid-animation; check hover/press/open states with chrome-shot.mjs (real time).
set -u
URL=$1; OUT=$2; W=${3:-1100}; H=${4:-2300}
HERE=${0:A:h}
mkdir -p "$OUT"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FIREFOX="/Applications/Firefox.app/Contents/MacOS/firefox"
CACHE="${TMPDIR:-/tmp}/liquid-glass-shoot"
mkdir -p "$CACHE"

if [[ -x "$CHROME" ]]; then
  "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=$W,$H \
    --virtual-time-budget=3000 --user-data-dir="$CACHE/chrome" --screenshot="$OUT/chrome.png" "$URL" >/dev/null 2>&1 \
    && echo "chrome  -> $OUT/chrome.png"
else
  echo "chrome  skipped (not installed)"
fi

if [[ ! -x "$CACHE/snap-webkit" || "$HERE/snap-webkit.swift" -nt "$CACHE/snap-webkit" ]]; then
  xcrun swiftc -O "$HERE/snap-webkit.swift" -o "$CACHE/snap-webkit" 2>/dev/null || echo "webkit  could not compile snap-webkit.swift"
fi
[[ -x "$CACHE/snap-webkit" ]] && "$CACHE/snap-webkit" "$URL" "$OUT/webkit.png" $W $H 3 >/dev/null 2>&1 && echo "webkit  -> $OUT/webkit.png"

if [[ -x "$FIREFOX" ]]; then
  mkdir -p "$CACHE/firefox"
  print 'user_pref("browser.shell.checkDefaultBrowser", false);' > "$CACHE/firefox/user.js"
  timeout 60 "$FIREFOX" --headless --no-remote --profile "$CACHE/firefox" --window-size=$W,$H \
    --screenshot "$OUT/firefox.png" "$URL" >/dev/null 2>&1 && echo "firefox -> $OUT/firefox.png"
else
  echo "firefox skipped (not installed)"
fi
