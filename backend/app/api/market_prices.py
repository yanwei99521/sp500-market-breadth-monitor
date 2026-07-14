"""Public endpoints for dashboard ETF daily price charts."""
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.services import market_prices

router = APIRouter(prefix="/api/market-prices")

RANGE_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "all": 365 * 20,
}


@router.get("/history")
def get_price_history(
    ticker: str = Query("QQQ", description="Ticker: QQQ SPY SOXL"),
    range: str = Query("1y", description="Time range: 1m 3m 6m 1y 3y all"),
):
    try:
        symbol = market_prices.normalize_ticker(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    days = RANGE_DAYS.get(range.lower(), RANGE_DAYS["1y"])
    start = (date.today() - timedelta(days=days)).isoformat()
    rows = market_prices.history(symbol, start)
    return [
        {"ticker": symbol, "date": row["date"], "close": round(float(row["close"]), 4)}
        for row in rows
    ]
