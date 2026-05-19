"""
/api/vix/* — CBOE Volatility Index (VIX) endpoints.

Signal rules:
  close >= 40  → buy_strong  (重仓买入)
  close >= 30  → buy         (买入)
  close <= 14  → sell        (卖出)
  otherwise    → normal
"""
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_conn
from app.models import VixCurrent, VixPoint

router = APIRouter(prefix="/api")

RANGE_DAYS: dict[str, int] = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "5y": 365 * 5,
    "all": 365 * 20,
}

VIX_BUY_STRONG = 40.0
VIX_BUY = 30.0
VIX_SELL = 14.0


def _zone(close: float) -> str:
    if close >= VIX_BUY_STRONG:
        return "buy_strong"
    if close >= VIX_BUY:
        return "buy"
    if close <= VIX_SELL:
        return "sell"
    return "normal"


@router.get("/vix/current", response_model=VixCurrent | None)
def get_vix_current():
    with get_conn() as conn:
        row = conn.execute(
            "SELECT date, open, high, low, close FROM vix_history ORDER BY date DESC LIMIT 1"
        ).fetchone()
    if not row:
        return None
    return VixCurrent(
        date=row["date"],
        open=row["open"],
        high=row["high"],
        low=row["low"],
        close=row["close"],
        zone=_zone(row["close"]),
    )


@router.get("/vix/history", response_model=list[VixPoint])
def get_vix_history(
    range: str = Query("3y", description="Time range: 1m 3m 6m 1y 3y 5y all"),
):
    days = RANGE_DAYS.get(range.lower(), 365 * 3)
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        rows = conn.execute(
            "SELECT date, close, high, low FROM vix_history WHERE date >= ? ORDER BY date",
            (start,),
        ).fetchall()

    return [VixPoint(date=r["date"], close=r["close"], high=r["high"], low=r["low"]) for r in rows]
