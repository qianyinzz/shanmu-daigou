#!/bin/bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-5000}"

echo "Starting Express production server on port ${PORT}..."
PORT="${PORT}" node dist-server/server.js
