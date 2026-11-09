#!/usr/bin/env bash
# Sobe a API + a interface do Nosso Site localmente.
set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-3000}"
API_PORT="${API_PORT:-9000}"

# dependências
if [ ! -d node_modules ]; then
  echo "→ instalando dependências (pnpm install)..."
  pnpm install --frozen-lockfile
fi

# .env da API
if [ ! -f api/.env ]; then
  printf 'API_URL=http://localhost:%s/\nAPI_PORT=%s\nYOUTUBE_ALLOW_BETTER_AUDIO=1\n' \
    "$API_PORT" "$API_PORT" > api/.env
  echo "→ criado api/.env"
fi

# API
if ! curl -sf "http://localhost:$API_PORT/" >/dev/null 2>&1; then
  echo "→ subindo API na porta $API_PORT..."
  ( cd api && node src/cobalt ) &
  API_PID=$!
  trap 'kill "$API_PID" 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do
    curl -sf "http://localhost:$API_PORT/" >/dev/null 2>&1 && break
    sleep 0.5
  done
else
  echo "→ API já está rodando na porta $API_PORT"
fi

# interface
echo "→ abrindo Nosso Site em http://localhost:$PORT"
PORT="$PORT" node site/serve.mjs
