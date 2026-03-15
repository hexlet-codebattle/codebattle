#!/bin/sh
set -eu

ASSETS_DIR="/var/www/assets"

if [ ! -d "$ASSETS_DIR" ]; then
  echo "Assets directory not found: $ASSETS_DIR" >&2
  exit 1
fi

echo "Serving assets from disk: $ASSETS_DIR"

exec nginx -g "daemon off;"
