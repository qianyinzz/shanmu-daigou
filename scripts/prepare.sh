#!/bin/bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile

echo "Running validation..."
pnpm validate

echo "Prepare completed!"
