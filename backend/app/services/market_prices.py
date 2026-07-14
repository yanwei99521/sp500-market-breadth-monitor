"""Adjusted daily OHLC cache for dashboard ETF price charts."""
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
    """Fetch adjusted daily OHLC prices and upsert into market_price_history."""
    symbol = normalize_ticker(ticker)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT MAX(date) FROM market_price_history WHERE ticker = ?",
            (symbol,),
        ).fetchone()
        last_date = row[0] if row and row[0] else None
        needs_ohlc_backfill = conn.execute(
            "SELECT 1 FROM market_price_history WHERE ticker = ? AND open IS NULL LIMIT 1",
            (symbol,),
        ).fetchone() is not None

    if start is None:
        start = DEFAULT_START if needs_ohlc_backfill else (
            (date.fromisoformat(last_date) + timedelta(days=1)).isoformat() if last_date else DEFAULT_START
        )

    if start >= date.today().isoformat():
        logger.info("%s already up to date (last=%s)", symbol, last_date)
        return 0

    df = yf.Ticker(symbol).history(start=start, auto_adjust=True)
    if df.empty:
        logger.warning("yfinance returned empty DataFrame for %s (start=%s)", symbol, start)
        return 0

    rows: list[tuple[str, str, float, float, float, float]] = []
    for ts, row_data in df.iterrows():
        close = row_data.get("Close")
        if pd.isna(close):
            continue
        open_price = row_data.get("Open")
        high = row_data.get("High")
        low = row_data.get("Low")
        close_value = float(close)
        rows.append((
            symbol,
            ts.strftime("%Y-%m-%d"),
            close_value if pd.isna(open_price) else float(open_price),
            close_value if pd.isna(high) else float(high),
            close_value if pd.isna(low) else float(low),
            close_value,
        ))

    with get_conn() as conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO market_price_history (ticker, date, open, high, low, close)
            VALUES (?, ?, ?, ?, ?, ?)
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
            SELECT date,
                   COALESCE(open, close) AS open,
                   COALESCE(high, close) AS high,
                   COALESCE(low, close) AS low,
                   close
            FROM market_price_history
            WHERE ticker = ? AND date >= ?
            ORDER BY date
            """,
            (symbol, start),
        ).fetchall()
    return [dict(row) for row in rows]
