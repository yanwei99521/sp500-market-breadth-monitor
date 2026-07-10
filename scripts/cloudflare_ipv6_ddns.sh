#!/bin/zsh
set -euo pipefail

ENV_FILE="${STOCK_DDNS_ENV:-$HOME/.stock-ddns.env}"
if [[ -f "$ENV_FILE" ]]; then
  source "$ENV_FILE"
fi

cd "$(dirname "$0")/.."
exec /usr/bin/env python3 scripts/cloudflare_ipv6_ddns.py
