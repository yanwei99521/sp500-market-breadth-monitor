"""
Three-signal Nasdaq framework data.

Signals:
- CAPE percentile: cheap < 20%, expensive > 70%, bubble > 85%
- QQQ drawdown: deep oversold when off high by more than 20%; crash warning when
  25-trading-day return is <= -12%
- VIX: panic when above 40, calm/risk-control when below 12
"""
import logging
from io import StringIO
from datetime import date, timedelta

import pandas as pd
import requests
import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

QQQ_TICKER = "QQQ"
MULTPL_CAPE_TABLE_URL = "https://www.multpl.com/shiller-pe/table/by-month"


def fetch_qqq_history(start: str | None = None) -> int:
    """Fetch QQQ daily closes and upsert into qqq_history."""
    with get_conn() as conn:
        row = conn.execute("SELECT MAX(date) FROM qqq_history").fetchone()
        last_date = row[0] if row and row[0] else None

    if start is None:
        if last_date:
            start = (date.fromisoformat(last_date) + timedelta(days=1)).isoformat()
        else:
            start = "1999-03-10"

    if start >= date.today().isoformat():
        logger.info("QQQ already up to date (last=%s)", last_date)
        return 0

    df = yf.Ticker(QQQ_TICKER).history(start=start, auto_adjust=True)
    if df.empty:
        logger.warning("yfinance returned empty DataFrame for %s (start=%s)", QQQ_TICKER, start)
        return 0

    inserted = 0
    with get_conn() as conn:
        for ts, row_data in df.iterrows():
            close = row_data.get("Close")
            if pd.isna(close):
                continue
            conn.execute(
                """
                INSERT OR REPLACE INTO qqq_history (date, close)
                VALUES (?, ?)
                """,
                (ts.strftime("%Y-%m-%d"), float(close)),
            )
            inserted += 1
        conn.commit()

    logger.info("QQQ: upserted %d rows (from %s)", inserted, start)
    return inserted


def fetch_cape_history() -> int:
    """Fetch monthly Shiller CAPE data and upsert CAPE percentiles."""
    resp = requests.get(
        MULTPL_CAPE_TABLE_URL,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=30,
    )
    resp.raise_for_status()
    tables = pd.read_html(StringIO(resp.text))
    if not tables:
        raise RuntimeError("Could not locate CAPE table")

    df = tables[0].copy()
    if "Date" not in df.columns or "Value" not in df.columns:
        raise RuntimeError("CAPE table missing Date or Value columns")

    data = df[["Date", "Value"]].rename(columns={"Value": "CAPE"}).dropna().copy()
    data["date"] = pd.to_datetime(data["Date"], errors="coerce")
    data["CAPE"] = pd.to_numeric(data["CAPE"], errors="coerce")
    data = data.dropna()
    data = data[data["CAPE"] > 0].sort_values("date")
    data["month"] = data["date"].dt.strftime("%Y-%m")
    data["percentile"] = data["CAPE"].rank(pct=True) * 100.0

    rows = [
        {
            "month": row["month"],
            "cape": float(row["CAPE"]),
            "percentile": float(row["percentile"]),
        }
        for _, row in data.iterrows()
    ]

    with get_conn() as conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO cape_history (month, cape, percentile)
            VALUES (:month, :cape, :percentile)
            """,
            rows,
        )
        conn.commit()

    logger.info("CAPE: upserted %d monthly rows", len(rows))
    return len(rows)


def fetch_and_store() -> dict[str, int]:
    """Update all three-signal source tables."""
    result = {"qqq": 0, "cape": 0}
    try:
        result["qqq"] = fetch_qqq_history()
    except Exception:
        logger.exception("Failed to update QQQ history")

    try:
        result["cape"] = fetch_cape_history()
    except Exception:
        logger.exception("Failed to update CAPE history")

    return result
