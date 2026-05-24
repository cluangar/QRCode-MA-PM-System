#!/bin/sh
# Run from the project root:  sh docker/pack.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

echo "Building React frontend ..."
npm run build

echo "Installing production dependencies into staging area ..."
STAGE=$(mktemp -d)
cp package.json package-lock.json "$STAGE/"
cd "$STAGE" && npm ci --omit=dev
cd "$ROOT"

echo "Packing to docker/app.tar.gz ..."
cp -r dist server.js config.js "$STAGE/"
tar -czf "$SCRIPT_DIR/app.tar.gz" -C "$STAGE" .
rm -rf "$STAGE"

echo ""
echo "Done. Copy the docker/ folder to the target machine, then run:"
echo "  docker compose up --build -d"
