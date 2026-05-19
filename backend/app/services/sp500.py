"""
Fetch S&P 500 constituent list from Wikipedia and persist to DB.
"""
import io
import logging
from datetime import date

import pandas as pd
import requests

from app.database import get_conn

logger = logging.getLogger(__name__)

WIKI_URL = (
    "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
)


def fetch_constituents() -> list[dict]:
    """Return list of {ticker, name, sector} from Wikipedia."""
    logger.info("Fetching S&P 500 constituents from Wikipedia…")
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; stock-breadth-bot/1.0; "
            "+https://github.com/user/stock-breadth)"
        )
    }
    resp = requests.get(WIKI_URL, headers=headers, timeout=30)
    resp.raise_for_status()
    tables = pd.read_html(io.StringIO(resp.text))
    df = tables[0]
    # Wikipedia columns: Symbol, Security, GICS Sector, …
    result = []
    for _, row in df.iterrows():
        ticker = str(row["Symbol"]).strip().replace(".", "-")
        result.append({
            "ticker": ticker,
            "name": str(row.get("Security", "")).strip(),
            "sector": str(row.get("GICS Sector", "")).strip(),
        })
    logger.info("Found %d constituents", len(result))
    return result


def save_constituents(constituents: list[dict]) -> None:
    today = date.today().isoformat()
    with get_conn() as conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO constituents (ticker, name, sector, updated_at)
            VALUES (:ticker, :name, :sector, :updated_at)
            """,
            [{**c, "updated_at": today} for c in constituents],
        )
    logger.info("Saved %d constituents to DB", len(constituents))


def get_tickers() -> list[str]:
    """Return all tickers from DB."""
    with get_conn() as conn:
        rows = conn.execute("SELECT ticker FROM constituents ORDER BY ticker").fetchall()
    return [r["ticker"] for r in rows]


def refresh() -> list[str]:
    """Fetch from Wikipedia, save, return ticker list."""
    constituents = fetch_constituents()
    save_constituents(constituents)
    return [c["ticker"] for c in constituents]


def diff_constituents(new_list: list[dict]) -> tuple[list[str], list[str]]:
    """
    Compare *new_list* against the tickers currently in DB.
    Returns (added_tickers, removed_tickers).
    """
    with get_conn() as conn:
        rows = conn.execute("SELECT ticker FROM constituents").fetchall()
    existing = {r["ticker"] for r in rows}
    incoming = {c["ticker"] for c in new_list}
    added = sorted(incoming - existing)
    removed = sorted(existing - incoming)
    return added, removed


def remove_constituents(tickers: list[str]) -> None:
    """Remove tickers from the constituents table (price history is kept)."""
    if not tickers:
        return
    with get_conn() as conn:
        conn.executemany(
            "DELETE FROM constituents WHERE ticker = ?",
            [(t,) for t in tickers],
        )
    logger.info("Removed %d constituents: %s", len(tickers), tickers)
