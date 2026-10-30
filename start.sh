#!/usr/bin/env bash
# Launch the presentation app. It listens on this machine only (localhost), so nobody else on the network can reach it
# or use your API keys. To test from another device, opt in:  LAN=1 ./start.sh   (or LAN=1 ./start.sh prod)
#   ./start.sh          dev server (hot reload, for iterating)  -> port 5173
#   ./start.sh prod     build, then serve the production build  -> port 4173 (use this on stage)
# Both also start the API backend (app/server) on localhost:8787, which the web server proxies /api to.
# Put OLLAMA_API_KEY in app/server/.env to use the real model; without it the backend uses an offline mock.
set -euo pipefail
cd "$(dirname "$0")/app"

mode="${1:-dev}"
[ -d node_modules ] || npm install

if [ "$mode" = "prod" ]; then port=4173; else port=5173; fi

# Localhost only unless LAN=1 is set.
host=127.0.0.1
[ "${LAN:-0}" = "1" ] && host=0.0.0.0

echo
echo "  Open on this machine:  http://localhost:$port"
if [ "$host" = "0.0.0.0" ]; then
  for ip in $(hostname -I 2>/dev/null); do
    case "$ip" in *:*) ;; *) echo "  Open on the LAN:       http://$ip:$port   (LAN=1: anyone on this network can open it)" ;; esac
  done
else
  echo "  (this machine only; use LAN=1 ./start.sh to open it to other devices)"
fi
echo

node --env-file-if-exists=server/.env server/src/main.ts &
api_pid=$!
trap 'kill "$api_pid" 2>/dev/null || true' EXIT INT TERM

case "$mode" in
  dev)  npx vite --host "$host" --port "$port" --strictPort ;;
  prod) npm run build && npx vite preview --host "$host" --port "$port" --strictPort ;;
  *)    echo "usage: $0 [dev|prod]" >&2; exit 1 ;;
esac
