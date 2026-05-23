#!/bin/bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."

echo "Running TypeScript check and lint..."
pnpm validate

echo "Validation passed!"
