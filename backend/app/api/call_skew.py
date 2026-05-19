"""
/api/call-skew/* — QQQ 3-month call skew endpoints.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_conn
from app.models import CallSkewCurrent, CallSkewPoint

router = APIRouter(prefix="/api")

RANGE_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "all": 365 * 10,
}


@router.get("/call-skew/current", response_model=CallSkewCurrent | None)
def get_call_skew_current():
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT date, atm_iv, otm25d_iv, skew, is_signal
            FROM call_skew_history
            ORDER BY date DESC
            LIMIT 1
            """
        ).fetchone()
    if not row:
        return None
    return CallSkewCurrent(
        date=row["date"],
        atm_iv=row["atm_iv"],
        otm25d_iv=row["otm25d_iv"],
        skew=row["skew"],
        is_signal=bool(row["is_signal"]),
    )


@router.get("/call-skew/history", response_model=list[CallSkewPoint])
def get_call_skew_history(
    range: str = Query("1y", description="Time range: 1m 3m 6m 1y 3y all"),
):
    days = RANGE_DAYS.get(range.lower(), 365)
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT date, skew, is_signal
            FROM call_skew_history
            WHERE date >= ?
            ORDER BY date
            """,
            (start,),
        ).fetchall()

    return [
        CallSkewPoint(
            date=r["date"],
            skew=r["skew"],
            is_signal=bool(r["is_signal"]),
        )
        for r in rows
    ]
