#!/bin/bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-5000}"

kill_port_if_listening() {
  local pids
  pids=$(ss -H -lntp 2>/dev/null | awk -v port="${PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
  if [[ -z "${pids}" ]]; then
    echo "Port ${PORT} is free."
    return
  fi
  echo "Port ${PORT} in use by PIDs: ${pids} (SIGKILL)"
  echo "${pids}" | xargs -I {} kill -9 {}
  sleep 1
}

echo "Clearing port ${PORT} before start."
kill_port_if_listening

echo "Starting Express + Vite dev server on port ${PORT}..."
PORT="${PORT}" pnpm tsx watch server/server.ts
