#!/bin/sh
# Install the liquid-glass-web skill.
#   curl -fsSL https://liquidglass.dev/install-skill.sh | sh
#   curl -fsSL https://liquidglass.dev/install-skill.sh | LG_REF=v1.0.1 sh     (pin a release tag)
# Copies skill/liquid-glass-web from the GitHub archive into the skills folder of each supported
# agent home found below. An existing copy is kept as liquid-glass-web.bak, so local edits survive.
set -eu
REF=${LG_REF:-main}
case "$REF" in
  main) ARCHIVE=https://github.com/gentpan/liquidglass/archive/refs/heads/main.tar.gz ;;
  *) ARCHIVE="https://github.com/gentpan/liquidglass/archive/refs/tags/$REF.tar.gz" ;;
esac
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "$ARCHIVE" | tar -xz -C "$tmp"
src=$(find "$tmp" -maxdepth 3 -type d -path '*/skill/liquid-glass-web' | head -n 1)
if [ -z "$src" ]; then
  echo "liquid-glass-web not found in the archive" >&2
  exit 1
fi

installed=0
for home in "$HOME/.claude" "$HOME/.codex"; do
  [ -d "$home" ] || continue
  mkdir -p "$home/skills"
  if [ -d "$home/skills/liquid-glass-web" ]; then
    rm -rf "$home/skills/liquid-glass-web.bak"
    mv "$home/skills/liquid-glass-web" "$home/skills/liquid-glass-web.bak"
  fi
  cp -R "$src" "$home/skills/liquid-glass-web"
  echo "installed: $home/skills/liquid-glass-web ($REF)"
  installed=1
done

if [ "$installed" -eq 0 ]; then
  mkdir -p "$HOME/.claude/skills"
  rm -rf "$HOME/.claude/skills/liquid-glass-web"
  cp -R "$src" "$HOME/.claude/skills/liquid-glass-web"
  echo "installed: $HOME/.claude/skills/liquid-glass-web"
  echo "(no agent home found; copy the folder wherever your agent loads skills from)"
fi
