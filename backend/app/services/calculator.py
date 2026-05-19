"""
Calculate market breadth: percentage of S&P 500 stocks above MA50 / MA200.
"""
import logging
from datetime import date

import pandas as pd

from app.database import get_conn

logger = logging.getLogger(__name__)

# Signal thresholds
THRESHOLDS = {50: 0.07, 200: 0.30}


def _load_prices() -> pd.DataFrame:
    """Load daily_prices for current constituents into a wide DataFrame (date × ticker)."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT dp.date, dp.ticker, dp.close
            FROM daily_prices dp
            JOIN constituents c ON dp.ticker = c.ticker
            ORDER BY dp.date
            """
        ).fetchall()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=["date", "ticker", "close"])
    df["date"] = pd.to_datetime(df["date"])
    # Pivot to wide format: index=date, columns=ticker, values=close
    wide = df.pivot(index="date", columns="ticker", values="close")
    return wide


def compute_breadth(ma_period: int, wide: pd.DataFrame) -> pd.DataFrame:
    """
    Given wide price DataFrame, compute daily breadth for given MA period.
    Returns DataFrame with columns: [date, ma_period, total_stocks, above_ma,
                                      breadth_pct, is_signal]
    """
    threshold = THRESHOLDS.get(ma_period, 0.0)
    ma = wide.rolling(window=ma_period, min_periods=ma_period).mean()
    # Boolean mask: close > MA
    above = (wide > ma)

    # Only count tickers that have a valid MA value (not NaN)
    valid_count = ma.notna().sum(axis=1)
    above_count = above.sum(axis=1)

    result = pd.DataFrame({
        "date": wide.index,
        "ma_period": ma_period,
        "total_stocks": valid_count.values,
        "above_ma": above_count.values,
    })
    result["breadth_pct"] = result["above_ma"] / result["total_stocks"]
    result["is_signal"] = (result["breadth_pct"] < threshold).astype(int)
    result = result[result["total_stocks"] > 0].copy()
    result["date"] = result["date"].dt.date.astype(str)
    return result


def save_breadth(df: pd.DataFrame) -> None:
    rows = df.to_dict("records")
    with get_conn() as conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO breadth_history
                (date, ma_period, total_stocks, above_ma, breadth_pct, is_signal)
            VALUES
                (:date, :ma_period, :total_stocks, :above_ma, :breadth_pct, :is_signal)
            """,
            rows,
        )
    logger.info(
        "Saved %d breadth rows for MA%d", len(rows), df["ma_period"].iloc[0]
    )


def run_full_calculation() -> None:
    """Recalculate breadth for both MA50 and MA200 from scratch."""
    logger.info("Loading price data…")
    wide = _load_prices()
    if wide.empty:
        logger.warning("No price data found — run backfill first")
        return

    logger.info(
        "Loaded %d dates × %d tickers", wide.shape[0], wide.shape[1]
    )

    for ma_period in [50, 200]:
        logger.info("Computing MA%d breadth…", ma_period)
        df = compute_breadth(ma_period, wide)
        save_breadth(df)

    logger.info("Breadth calculation complete")


def run_incremental_calculation() -> None:
    """Recalculate the last 5 trading days of breadth (preserves all older history)."""
    logger.info("Loading price data for incremental update…")
    wide = _load_prices()
    if wide.empty:
        return

    for ma_period in [50, 200]:
        df = compute_breadth(ma_period, wide)
        recent = df.tail(5)
        save_breadth(recent)

    logger.info("Incremental breadth update complete")
