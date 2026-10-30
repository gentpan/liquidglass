#!/bin/sh
# Sync the static site to the server and install the Caddy site config when it changed.
#   SERVER=user@host KEY=path/to/key scripts/deploy.sh
# Put SERVER and KEY in your shell profile or a git-ignored .deploy.env next to this repo's root.
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
[ -f .deploy.env ] && . ./.deploy.env
: "${SERVER:?set SERVER=user@host (env or .deploy.env)}"
: "${KEY:?set KEY=path/to/ssh-key (env or .deploy.env)}"
case "$KEY" in *[[:space:]]*) echo "KEY path must not contain spaces" >&2; exit 1 ;; esac
SSH="ssh -i $KEY -o IdentitiesOnly=yes"
DEST=/var/www/liquidglass.dev

$SSH "$SERVER" "mkdir -p $DEST"
rsync -rlptz --delete --no-owner --no-group -e "$SSH" \
  --include='/index.html' --include='/robots.txt' --include='/sitemap.xml' --include='/install-skill.sh' \
  --include='/docs/***' --include='/lib/***' --include='/assets/***' --include='/images/***' \
  --exclude='*' \
  ./ "$SERVER:$DEST/"

# Install the Caddy site only when it differs; an invalid config is rolled back, never reloaded.
if ! $SSH "$SERVER" "cmp -s - /etc/caddy/sites/liquidglass.dev.caddy" < deploy/liquidglass.dev.caddy; then
  $SSH "$SERVER" "cat > /tmp/liquidglass.dev.caddy" < deploy/liquidglass.dev.caddy
  $SSH "$SERVER" 'set -e
    f=/etc/caddy/sites/liquidglass.dev.caddy
    if [ -f "$f" ]; then cp "$f" "$f.bak"; fi
    cp /tmp/liquidglass.dev.caddy "$f"
    if caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
      systemctl reload caddy
      rm -f "$f.bak"
      echo "caddy reloaded"
    else
      if [ -f "$f.bak" ]; then mv "$f.bak" "$f"; else rm -f "$f"; fi
      echo "caddy config invalid; previous config kept" >&2
      exit 1
    fi'
fi
echo "deployed: https://liquidglass.dev"
