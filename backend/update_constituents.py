"""Manually synchronize the current S&P 500 constituent list.

Usage:
    cd backend && uv run python update_constituents.py
"""
import logging

from app.database import init_db
from app.services.constituents import sync_current_constituents

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> None:
    init_db()
    sync_current_constituents()


if __name__ == "__main__":
    main()
