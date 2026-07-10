#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="/Users/yanwei/个人/stock"
ENV_FILE="${STOCK_DASHBOARD_ENV:-$HOME/.stock-dashboard.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "ADMIN_TOKEN is required in $ENV_FILE" >&2
  exit 1
fi

cd "$PROJECT_ROOT/backend"
export HOST="127.0.0.1"
export PORT="8000"
export RELOAD="0"

exec "$HOME/.local/bin/uv" run python run.py
