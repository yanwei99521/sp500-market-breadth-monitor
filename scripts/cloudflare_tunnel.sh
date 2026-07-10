#!/bin/zsh
set -euo pipefail

ENV_FILE="${STOCK_TUNNEL_ENV:-$HOME/.stock-tunnel.env}"
CLOUDFLARED="${CLOUDFLARED_BIN:-$HOME/.local/bin/cloudflared}"

if [[ ! -x "$CLOUDFLARED" ]]; then
  echo "cloudflared not found at $CLOUDFLARED" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Tunnel environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${TUNNEL_TOKEN:-}" ]]; then
  echo "TUNNEL_TOKEN is required in $ENV_FILE" >&2
  exit 1
fi

exec "$CLOUDFLARED" tunnel \
  --no-autoupdate \
  --metrics 127.0.0.1:20241 \
  run
