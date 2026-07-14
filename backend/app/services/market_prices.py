"""Daily adjusted close cache for dashboard ETF price charts."""
import logging
from datetime import date, timedelta

import pandas as pd
import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

ALLOWED_TICKERS = {"QQQ", "SPY", "SOXL"}
DEFAULT_START = "2019-01-01"


def normalize_ticker(ticker: str) -> str:
    symbol = ticker.upper().strip()
    if symbol not in ALLOWED_TICKERS:
        raise ValueError(f"Unsupported ticker: {ticker}")
    return symbol


def fetch_history(ticker: str, start: str | None = None) -> int:
    """Fetch adjusted daily closes and upsert into market_price_history."""
    symbol = normalize_ticker(ticker)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT MAX(date) FROM market_price_history WHERE ticker = ?",
            (symbol,),
        ).fetchone()
        last_date = row[0] if row and row[0] else None

    if start is None:
        start = (date.fromisoformat(last_date) + timedelta(days=1)).isoformat() if last_date else DEFAULT_START

    if start >= date.today().isoformat():
        logger.info("%s already up to date (last=%s)", symbol, last_date)
        return 0

    df = yf.Ticker(symbol).history(start=start, auto_adjust=True)
    if df.empty:
        logger.warning("yfinance returned empty DataFrame for %s (start=%s)", symbol, start)
        return 0

    rows: list[tuple[str, str, float]] = []
    for ts, row_data in df.iterrows():
        close = row_data.get("Close")
        if pd.isna(close):
            continue
        rows.append((symbol, ts.strftime("%Y-%m-%d"), float(close)))

    with get_conn() as conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_price_history (ticker, date, close)
            VALUES (?, ?, ?)
            """,
            rows,
        )
        conn.commit()

    logger.info("%s: upserted %d daily price rows (from %s)", symbol, len(rows), start)
    return len(rows)


def fetch_all() -> dict[str, int]:
    return {ticker: fetch_history(ticker) for ticker in sorted(ALLOWED_TICKERS)}


def history(ticker: str, start: str) -> list[dict]:
    symbol = normalize_ticker(ticker)
    fetch_history(symbol)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT date, close
            FROM market_price_history
            WHERE ticker = ? AND date >= ?
            ORDER BY date
            """,
            (symbol, start),
        ).fetchall()
    return [dict(row) for row in rows]
