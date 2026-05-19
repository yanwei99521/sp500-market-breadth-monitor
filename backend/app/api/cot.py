"""
/api/cot/* — CFTC COT Leveraged Funds (CTA) positioning in E-mini S&P 500 futures.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_conn
from app.models import CotCurrent, CotPoint

router = APIRouter(prefix="/api")

RANGE_DAYS: dict[str, int] = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "5y": 365 * 5,
    "all": 365 * 15,
}


@router.get("/cot/current", response_model=CotCurrent | None)
def get_cot_current():
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT date, long_contracts, short_contracts, net_long, open_interest
            FROM cot_history
            ORDER BY date DESC
            LIMIT 1
            """
        ).fetchone()
    if not row:
        return None
    return CotCurrent(
        date=row["date"],
        long_contracts=row["long_contracts"],
        short_contracts=row["short_contracts"],
        net_long=row["net_long"],
        open_interest=row["open_interest"],
    )


@router.get("/cot/history", response_model=list[CotPoint])
def get_cot_history(
    range: str = Query("3y", description="Time range: 1m 3m 6m 1y 3y 5y all"),
):
    days = RANGE_DAYS.get(range.lower(), 365 * 3)
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT date, net_long
            FROM cot_history
            WHERE date >= ?
            ORDER BY date
            """,
            (start,),
        ).fetchall()

    return [CotPoint(date=r["date"], net_long=r["net_long"]) for r in rows]
