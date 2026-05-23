#!/bin/bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile

echo "Building frontend with Vite..."
pnpm vite build

echo "Bundling server with tsup..."
pnpm tsup server/server.ts --format cjs --platform node --target node20 --outDir dist-server --no-splitting --no-minify --external vite --external @tailwindcss/oxide --external @tailwindcss/vite --external @vitejs/plugin-react

echo "Build completed successfully!"
