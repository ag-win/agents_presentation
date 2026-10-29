#!/usr/bin/env bash
# Launch the presentation app and make it reachable from other devices on the LAN.
#   ./start.sh          dev server (hot reload, for iterating)  -> port 5173
#   ./start.sh prod     build, then serve the production build  -> port 4173 (use this on stage)
# Both also start the API backend (app/server) on localhost:8787, which the web server proxies /api to.
# Put OLLAMA_API_KEY in app/server/.env to use the real model; without it the backend uses an offline mock.
set -euo pipefail
cd "$(dirname "$0")/app"

mode="${1:-dev}"
[ -d node_modules ] || npm install

if [ "$mode" = "prod" ]; then port=4173; else port=5173; fi

echo
echo "  Open on this machine:  http://localhost:$port"
for ip in $(hostname -I 2>/dev/null); do
  case "$ip" in *:*) ;; *) echo "  Open on the LAN:       http://$ip:$port" ;; esac
done
echo

node --env-file-if-exists=server/.env server/src/main.ts &
api_pid=$!
trap 'kill "$api_pid" 2>/dev/null || true' EXIT INT TERM

case "$mode" in
  dev)  npx vite --host 0.0.0.0 --port "$port" --strictPort ;;
  prod) npm run build && npx vite preview --host 0.0.0.0 --port "$port" --strictPort ;;
  *)    echo "usage: $0 [dev|prod]" >&2; exit 1 ;;
esac
