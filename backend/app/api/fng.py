"""
/api/fng/* — CNN Fear & Greed Index endpoints.

Signal rules:
  score <= 25  → extreme_fear  (极度恐慌 → 强力买入)
  score <= 44  → fear          (恐慌 → 买入观察)
  score <= 54  → neutral
  score <= 74  → greed
  score >= 75  → extreme_greed (极度贪婪 → 卖出/减仓)
"""
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_conn
from app.models import FngCurrent, FngPoint
from app.services.fng_fetcher import get_current_snapshot

router = APIRouter(prefix="/api")

RANGE_DAYS: dict[str, int] = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "all": 365 * 5,
}


@router.get("/fng/current", response_model=FngCurrent | None)
def get_fng_current():
    with get_conn() as conn:
        row = conn.execute(
            "SELECT date, score, rating FROM fng_history ORDER BY date DESC LIMIT 1"
        ).fetchone()

    if not row:
        return None

    # Try to enrich with live comparisons from CNN API
    snapshot = get_current_snapshot()

    return FngCurrent(
        date=row["date"],
        score=round(row["score"], 1),
        rating=row["rating"],
        previous_close=snapshot["previous_close"] if snapshot else 0,
        previous_1_week=snapshot["previous_1_week"] if snapshot else 0,
        previous_1_month=snapshot["previous_1_month"] if snapshot else 0,
        previous_1_year=snapshot["previous_1_year"] if snapshot else 0,
    )


@router.get("/fng/history", response_model=list[FngPoint])
def get_fng_history(
    range: str = Query("1y", description="Time range: 1m 3m 6m 1y all"),
):
    days = RANGE_DAYS.get(range.lower(), 365)
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, score, rating FROM fng_history WHERE date >= ? ORDER BY date",
            (start,),
        ).fetchall()

    return [FngPoint(date=r["date"], score=round(r["score"], 1), rating=r["rating"]) for r in rows]
