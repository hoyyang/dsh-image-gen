#!/bin/bash
# Build: tsc compiles src -> lib (host), tsdown bundles src/client -> client/client.js.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -x node_modules/.bin/tsc ]; then
  echo "build: node_modules/.bin/tsc missing — run pnpm install first" >&2
  exit 1
fi

echo "=== Compiling host (src -> lib) ==="
node_modules/.bin/tsc -p tsconfig.json
echo "=== Bundling client (src/client -> client) ==="
node_modules/.bin/tsdown
node scripts/wrap-client-banner.mjs
echo "=== Build complete ==="