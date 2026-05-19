"""
Fetch CNN Fear & Greed Index from CNN's internal data API.
Returns ~1 year of daily history (250 trading days).
Stores results in fng_history table.

Source: https://production.dataviz.cnn.io/index/fearandgreed/graphdata
Ratings: extreme_fear(0-25) | fear(26-44) | neutral(45-54) | greed(55-74) | extreme_greed(75-100)
"""
import logging
from datetime import datetime, timezone

import requests

from app.database import get_conn

logger = logging.getLogger(__name__)

CNN_API_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.cnn.com/markets/fear-and-greed",
}


def _normalize_rating(raw: str) -> str:
    """Normalize CNN rating strings to a consistent format."""
    return raw.lower().replace(" ", "_")


def fetch_raw() -> dict:
    resp = requests.get(CNN_API_URL, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    return resp.json()


def fetch_and_store() -> int:
    """Fetch and upsert F&G history. Returns rows processed."""
    data = fetch_raw()

    historical = data.get("fear_and_greed_historical", {}).get("data", [])
    if not historical:
        logger.warning("F&G historical data empty")
        return 0

    inserted = 0
    with get_conn() as conn:
        for point in historical:
            # CNN timestamps are in milliseconds
            ts_ms = point.get("x", 0)
            date_str = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
            score = float(point.get("y", 0))
            rating = _normalize_rating(point.get("rating", "neutral"))

            conn.execute(
                "INSERT OR REPLACE INTO fng_history (date, score, rating) VALUES (?, ?, ?)",
                (date_str, score, rating),
            )
            inserted += 1

        conn.commit()

    logger.info("F&G: upserted %d rows", inserted)
    return inserted


def get_current_snapshot() -> dict | None:
    """Return current F&G metadata (score, comparisons) from CNN API."""
    try:
        data = fetch_raw()
        fg = data.get("fear_and_greed", {})
        return {
            "score": round(float(fg.get("score", 0)), 1),
            "rating": _normalize_rating(fg.get("rating", "neutral")),
            "previous_close": round(float(fg.get("previous_close") or 0), 1),
            "previous_1_week": round(float(fg.get("previous_1_week") or 0), 1),
            "previous_1_month": round(float(fg.get("previous_1_month") or 0), 1),
            "previous_1_year": round(float(fg.get("previous_1_year") or 0), 1),
        }
    except Exception:
        logger.exception("Failed to get F&G current snapshot")
        return None
