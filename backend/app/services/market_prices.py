"""Adjusted daily OHLC cache for dashboard ETF price charts."""
import logging
from datetime import date, timedelta

import pandas as pd
import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

ALLOWED_TICKERS = {"QQQ", "SPY", "SOXL", "TQQQ"}
SNAPSHOT_TICKERS = ("SOXL", "QQQ", "TQQQ")
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


def _float_or_none(value: object) -> float | None:
    if value is None or pd.isna(value):
        return None
    return float(value)


def _td_state(closes: pd.Series) -> tuple[str | None, int]:
    """Return the current simplified TD Sequential direction and count."""
    direction: str | None = None
    count = 0

    for index in range(4, len(closes)):
        current = float(closes.iloc[index])
        reference = float(closes.iloc[index - 4])
        next_direction = "buy" if current < reference else "sell" if current > reference else None

        if next_direction is None:
            direction = None
            count = 0
            continue
        if next_direction != direction:
            direction = next_direction
            count = 0
        count += 1
        if count == 9:
            direction = None
            count = 0

    return direction, count


def _build_snapshot(symbol: str, rows: list[dict]) -> dict | None:
    if len(rows) < 2:
        return None

    closes = pd.Series(
        [float(row["close"]) for row in rows],
        index=[row["date"] for row in rows],
        dtype="float64",
    )
    latest_close = float(closes.iloc[-1])
    previous_close = float(closes.iloc[-2])
    ma55 = closes.rolling(55).mean().iloc[-1]
    ma233 = closes.rolling(233).mean().iloc[-1]
    ema12 = closes.ewm(span=12, adjust=False).mean()
    ema26 = closes.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    macd_value = float(macd.iloc[-1])
    signal_value = float(signal.iloc[-1])
    previous_macd = float(macd.iloc[-2])
    previous_signal = float(signal.iloc[-2])
    macd_cross = (
        "bullish" if previous_macd <= previous_signal and macd_value > signal_value
        else "bearish" if previous_macd >= previous_signal and macd_value < signal_value
        else "none"
    )
    td_direction, td_count = _td_state(closes)

    ma55_value = _float_or_none(ma55)
    ma233_value = _float_or_none(ma233)
    if ma233_value is None:
        trend_state = "insufficient_data"
    elif latest_close <= ma233_value:
        trend_state = "defensive"
    elif ma55_value is not None and latest_close > ma55_value and macd_value > signal_value:
        trend_state = "strong"
    else:
        trend_state = "watch"

    return {
        "ticker": symbol,
        "date": str(rows[-1]["date"]),
        "close": round(latest_close, 4),
        "change_pct": round((latest_close / previous_close - 1) * 100, 3),
        "ma55": round(ma55_value, 4) if ma55_value is not None else None,
        "ma233": round(ma233_value, 4) if ma233_value is not None else None,
        "macd": round(macd_value, 4),
        "macd_signal": round(signal_value, 4),
        "macd_histogram": round(macd_value - signal_value, 4),
        "macd_cross": macd_cross,
        "macd_panic_buy": macd_cross == "bullish" and macd_value < -0.25 and signal_value < -0.25,
        "td_direction": td_direction,
        "td_count": td_count,
        "trend_state": trend_state,
    }


def snapshots() -> list[dict]:
    """Fetch and calculate the compact technical state used by the homepage."""
    result: list[dict] = []
    for symbol in SNAPSHOT_TICKERS:
        fetch_history(symbol)
        with get_conn() as conn:
            rows = conn.execute(
                """
                SELECT date, close
                FROM market_price_history
                WHERE ticker = ?
                ORDER BY date
                """,
                (symbol,),
            ).fetchall()
        snapshot = _build_snapshot(symbol, [dict(row) for row in rows])
        if snapshot is not None:
            result.append(snapshot)
    return result
