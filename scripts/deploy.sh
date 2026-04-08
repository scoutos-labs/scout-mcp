#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${SCOUT_LIVE_API_KEY:-}" ]]; then
  echo "SCOUT_LIVE_API_KEY is required" >&2
  exit 1
fi

SUBDOMAIN="${1:-mcp-scout}"
ARCHIVE="$(mktemp -t scout-mcp.XXXXXX.tar.gz)"

cleanup() {
  rm -f "$ARCHIVE"
}

trap cleanup EXIT

tar -czf "$ARCHIVE" \
  Dockerfile \
  .dockerignore \
  README.md \
  package.json \
  bun.lock \
  tsconfig.json \
  tsconfig.build.json \
  src \
  scripts

curl -X POST "https://scoutos.live/api/build?subdomain=${SUBDOMAIN}" \
  -H "Authorization: Bearer ${SCOUT_LIVE_API_KEY}" \
  --data-binary @"$ARCHIVE"
