from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.database import get_conn
from app.models import BreadthPoint, BreadthStatus, CurrentBreadth, SignalPoint

router = APIRouter(prefix="/api")

RANGE_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "all": 365 * 10,
}

THRESHOLDS = {50: 0.07, 200: 0.30}


def _status(breadth_pct: float, ma_period: int) -> str:
    t = THRESHOLDS[ma_period]
    if breadth_pct < t:
        return "extreme_oversold"
    if ma_period == 50:
        if breadth_pct < 0.20:
            return "oversold"
        if breadth_pct > 0.80:
            return "overbought"
        return "normal"
    else:  # MA200
        if breadth_pct < 0.45:
            return "oversold"
        if breadth_pct > 0.75:
            return "overbought"
        return "normal"


@router.get("/breadth/history", response_model=list[BreadthPoint])
def get_breadth_history(
    ma: int = Query(50, description="MA period: 50 or 200"),
    range: str = Query("1y", description="Time range: 1m 3m 6m 1y 3y all"),
):
    if ma not in (50, 200):
        raise HTTPException(400, "ma must be 50 or 200")
    days = RANGE_DAYS.get(range.lower(), 365)
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT date, breadth_pct, is_signal
            FROM breadth_history
            WHERE ma_period = ? AND date >= ?
            ORDER BY date
            """,
            (ma, start),
        ).fetchall()

    return [
        BreadthPoint(
            date=r["date"],
            breadth_pct=round(r["breadth_pct"], 4),
            is_signal=bool(r["is_signal"]),
        )
        for r in rows
    ]


@router.get("/breadth/current", response_model=CurrentBreadth)
def get_current_breadth():
    def _latest(ma_period: int) -> BreadthStatus:
        with get_conn() as conn:
            row = conn.execute(
                """
                SELECT date, breadth_pct, is_signal
                FROM breadth_history
                WHERE ma_period = ?
                ORDER BY date DESC
                LIMIT 1
                """,
                (ma_period,),
            ).fetchone()
        if not row:
            raise HTTPException(503, f"No breadth data for MA{ma_period} yet")
        pct = round(row["breadth_pct"], 4)
        return BreadthStatus(
            date=row["date"],
            breadth_pct=pct,
            is_signal=bool(row["is_signal"]),
            status=_status(pct, ma_period),
            threshold=THRESHOLDS[ma_period],
            ma_period=ma_period,
        )

    return CurrentBreadth(ma50=_latest(50), ma200=_latest(200))


@router.get("/signals", response_model=list[SignalPoint])
def get_signals(
    ma: int = Query(50, description="MA period: 50 or 200"),
):
    if ma not in (50, 200):
        raise HTTPException(400, "ma must be 50 or 200")

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT date, breadth_pct, ma_period
            FROM breadth_history
            WHERE ma_period = ? AND is_signal = 1
            ORDER BY date DESC
            """,
            (ma,),
        ).fetchall()

    return [
        SignalPoint(
            date=r["date"],
            breadth_pct=round(r["breadth_pct"], 4),
            ma_period=r["ma_period"],
        )
        for r in rows
    ]
