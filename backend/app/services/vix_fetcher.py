"""
Fetch CBOE Volatility Index (^VIX) daily OHLC data via yfinance.
Stores results in vix_history table.
"""
import logging
from datetime import date, timedelta

import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

VIX_TICKER = "^VIX"


def fetch_and_store(start: str | None = None) -> int:
    """
    Fetch VIX history from `start` date (default: last stored date or 5 years ago).
    Returns number of rows upserted.
    """
    with get_conn() as conn:
        row = conn.execute(
            "SELECT MAX(date) FROM vix_history"
        ).fetchone()
        last_date = row[0] if row and row[0] else None

    if start is None:
        if last_date:
            # Resume from next day after last stored
            start = (date.fromisoformat(last_date) + timedelta(days=1)).isoformat()
        else:
            start = (date.today() - timedelta(days=365 * 5)).isoformat()

    if start > date.today().isoformat():
        logger.info("VIX already up to date (last=%s)", last_date)
        return 0

    ticker = yf.Ticker(VIX_TICKER)
    df = ticker.history(start=start, auto_adjust=False)

    if df.empty:
        logger.warning("yfinance returned empty DataFrame for %s (start=%s)", VIX_TICKER, start)
        return 0

    inserted = 0
    with get_conn() as conn:
        for ts, row_data in df.iterrows():
            date_str = ts.strftime("%Y-%m-%d")
            conn.execute(
                """
                INSERT OR REPLACE INTO vix_history (date, open, high, low, close)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    date_str,
                    float(row_data["Open"]),
                    float(row_data["High"]),
                    float(row_data["Low"]),
                    float(row_data["Close"]),
                ),
            )
            inserted += 1
        conn.commit()

    logger.info("VIX: upserted %d rows (from %s)", inserted, start)
    return inserted
