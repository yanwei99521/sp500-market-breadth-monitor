"""
Batch-fetch historical daily close prices from yfinance and store in DB.
"""
import logging
import random
import time
from datetime import date, timedelta

import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

BATCH_SIZE = 2           # tickers per batch (very conservative)
BATCH_DELAY = 10.0       # base delay between batches
BATCH_JITTER = 5.0       # random jitter added to delay
HISTORY_YEARS = 10       # years of history to backfill on first run
MAX_RETRIES = 3          # max retry attempts on rate limit
RETRY_BASE_DELAY = 90    # base delay in seconds for exponential backoff

# Proxy is now used (required for access in China)
# Set HTTP_PROXY/HTTPS_PROXY environment variables if needed


def _latest_date_in_db(ticker: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT MAX(date) AS d FROM daily_prices WHERE ticker = ?",
            (ticker,),
        ).fetchone()
    return row["d"] if row["d"] else None


def _save_prices(rows: list[dict]) -> int:
    if not rows:
        return 0
    with get_conn() as conn:
        conn.executemany(
            """
            INSERT OR IGNORE INTO daily_prices (ticker, date, close)
            VALUES (:ticker, :date, :close)
            """,
            rows,
        )
    return len(rows)


def fetch_batch(tickers: list[str], start: str, end: str) -> dict[str, list[dict]]:
    """Download close prices for a batch of tickers. Returns {ticker: [{date, close}]}."""
    joined = " ".join(tickers)
    df = None
    last_exc = None

    for attempt in range(MAX_RETRIES):
        try:
            df = yf.download(
                joined,
                start=start,
                end=end,
                auto_adjust=True,
                progress=False,
                threads=False,     # avoid concurrent requests to reduce rate limit risk
            )
            break  # success
        except Exception as exc:
            last_exc = exc
            exc_str = str(exc).lower()
            # Check for rate limit error
            if "rate" in exc_str or "too many" in exc_str or "429" in exc_str:
                wait_time = RETRY_BASE_DELAY * (2 ** attempt)  # exponential backoff: 60, 120, 240s
                logger.warning(
                    "Rate limited (attempt %d/%d), waiting %ds before retry: %s",
                    attempt + 1, MAX_RETRIES, wait_time, exc
                )
                time.sleep(wait_time)
            else:
                logger.error("yfinance batch download failed: %s", exc)
                break  # non-rate-limit error, don't retry

    if df is None or (hasattr(df, 'empty') and df.empty):
        if last_exc:
            logger.error("All retries exhausted for batch %s: %s", tickers[:3], last_exc)
        return {}

    # Multi-ticker download → MultiIndex columns (Close, ticker)
    # Single ticker → simple columns
    result: dict[str, list[dict]] = {}

    if len(tickers) == 1:
        ticker = tickers[0]
        close_col = "Close" if "Close" in df.columns else df.columns[0]
        series = df[close_col].dropna()
        result[ticker] = [
            {"ticker": ticker, "date": str(d.date()), "close": float(v)}
            for d, v in series.items()
        ]
    else:
        if "Close" not in df.columns.get_level_values(0):
            return {}
        close_df = df["Close"]
        for ticker in tickers:
            if ticker not in close_df.columns:
                continue
            series = close_df[ticker].dropna()
            result[ticker] = [
                {"ticker": ticker, "date": str(d.date()), "close": float(v)}
                for d, v in series.items()
            ]

    return result


def backfill_all(tickers: list[str]) -> None:
    """Download HISTORY_YEARS of history for all tickers (first-run)."""
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=HISTORY_YEARS * 365 + 10)).isoformat()

    total_saved = 0
    batches = [tickers[i:i + BATCH_SIZE] for i in range(0, len(tickers), BATCH_SIZE)]
    logger.info(
        "Backfilling %d tickers in %d batches (start=%s, end=%s)…",
        len(tickers), len(batches), start, end,
    )

    for idx, batch in enumerate(batches, 1):
        logger.info("Batch %d/%d: %s…", idx, len(batches), batch[:3])
        data = fetch_batch(batch, start, end)
        rows = [row for ticker_rows in data.values() for row in ticker_rows]
        saved = _save_prices(rows)
        total_saved += saved
        logger.info("  → saved %d price rows", saved)
        if idx < len(batches):
            time.sleep(BATCH_DELAY + random.uniform(0, BATCH_JITTER))

    logger.info("Backfill complete. Total rows saved: %d", total_saved)


def update_incremental(tickers: list[str]) -> None:
    """Fetch only missing data since last stored date for each ticker."""
    # Find the global minimum latest date to use as a safe start
    with get_conn() as conn:
        row = conn.execute(
            "SELECT MIN(d) as min_date FROM ("
            "  SELECT MAX(date) as d FROM daily_prices GROUP BY ticker"
            ")"
        ).fetchone()

    if not row or not row["min_date"]:
        # No data at all → run full backfill
        backfill_all(tickers)
        return

    start = row["min_date"]  # fetch from earliest "latest" date
    end = date.today().isoformat()

    if start >= end:
        logger.info("Prices already up to date (latest=%s)", start)
        return

    # Smart batch sizing: use larger batches for short date ranges (less data per ticker)
    days_to_fetch = (date.fromisoformat(end) - date.fromisoformat(start)).days
    if days_to_fetch <= 5:
        batch_size = 50   # aggressive for recent data
        batch_delay = 3.0
    elif days_to_fetch <= 30:
        batch_size = 20
        batch_delay = 5.0
    else:
        batch_size = BATCH_SIZE
        batch_delay = BATCH_DELAY

    logger.info("Incremental update: %s → %s (%d days, batch_size=%d)",
                start, end, days_to_fetch, batch_size)
    batches = [tickers[i:i + batch_size] for i in range(0, len(tickers), batch_size)]
    total_saved = 0

    for idx, batch in enumerate(batches, 1):
        data = fetch_batch(batch, start, end)
        rows = [row for ticker_rows in data.values() for row in ticker_rows]
        saved = _save_prices(rows)
        total_saved += saved
        if idx < len(batches):
            time.sleep(batch_delay + random.uniform(0, BATCH_JITTER))

    logger.info("Incremental update complete. Rows saved: %d", total_saved)
