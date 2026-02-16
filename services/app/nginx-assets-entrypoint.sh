#!/bin/sh
set -eu

DISK_ASSETS_DIR="/var/www/assets-disk"
LIVE_ASSETS_PATH="/var/www/assets"
RAM_ASSETS_DIR="${ASSETS_RAM_DIR:-/dev/shm/codebattle-assets}"
USE_RAM_ASSETS="${ASSETS_IN_RAM:-true}"

# Preserve original baked assets once and use them as copy source.
if [ -d "$LIVE_ASSETS_PATH" ] && [ ! -d "$DISK_ASSETS_DIR" ]; then
  mv "$LIVE_ASSETS_PATH" "$DISK_ASSETS_DIR"
fi

if [ ! -d "$DISK_ASSETS_DIR" ]; then
  echo "Assets source directory not found: $DISK_ASSETS_DIR" >&2
  exit 1
fi

link_assets() {
  target_dir="$1"
  rm -rf "$LIVE_ASSETS_PATH"
  ln -s "$target_dir" "$LIVE_ASSETS_PATH"
}

if [ "$USE_RAM_ASSETS" = "true" ]; then
  mkdir -p "$RAM_ASSETS_DIR"
  rm -rf "$RAM_ASSETS_DIR"/*

  if cp -a "$DISK_ASSETS_DIR"/. "$RAM_ASSETS_DIR"/; then
    echo "Serving assets from RAM: $RAM_ASSETS_DIR"
    link_assets "$RAM_ASSETS_DIR"
  else
    echo "Failed to copy assets to RAM, using disk assets" >&2
    link_assets "$DISK_ASSETS_DIR"
  fi
else
  echo "Serving assets from disk: $DISK_ASSETS_DIR"
  link_assets "$DISK_ASSETS_DIR"
fi

exec nginx -g "daemon off;"
