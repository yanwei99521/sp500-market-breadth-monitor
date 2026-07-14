"""Public endpoints for the QQQ panic-buy backtest and daily target allocation."""
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.models import (
    PanicAllocation,
    PanicBacktestResponse,
    PanicHistoryPoint,
    PanicStrategyCurrent,
)
from app.services import panic_strategy

router = APIRouter(prefix="/api/panic-strategy")

RANGE_DAYS = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "3y": 365 * 3, "all": 365 * 40}


def _allocation(row, prefix: str) -> PanicAllocation:
    return PanicAllocation(
        qqq=round(float(row[f"{prefix}_qqq_weight"]), 4),
        tqqq=round(float(row[f"{prefix}_tqqq_weight"]), 4),
        cash=round(float(row[f"{prefix}_cash_weight"]), 4),
    )


@router.get("/current", response_model=PanicStrategyCurrent)
def get_current() -> PanicStrategyCurrent:
    row = panic_strategy.latest_current()
    if not row:
        raise HTTPException(status_code=503, detail="策略历史尚未计算，请在后台执行数据更新")
    return PanicStrategyCurrent(
        date=row["date"],
        state=row["state"],
        state_label=panic_strategy.STATE_LABELS.get(row["state"], row["state"]),
        panic_level=int(row["panic_level"]),
        vix=round(float(row["vix"]), 2) if row["vix"] is not None else None,
        qqq_close=round(float(row["qqq_close"]), 2),
        drawdown=round(float(row["drawdown"]), 4),
        target=_allocation(row, "target"),
        actual=_allocation(row, "actual"),
        portfolio_value=round(float(row["portfolio_value"]), 2),
        portfolio_drawdown=round(float(row["portfolio_drawdown"]), 4),
        action=row["action"],
        reason=row["reason"],
    )


@router.get("/backtest", response_model=PanicBacktestResponse)
def get_backtest() -> PanicBacktestResponse:
    payload = panic_strategy.summary()
    if not payload:
        raise HTTPException(status_code=503, detail="策略回测尚未计算，请在后台执行数据更新")
    return PanicBacktestResponse(**payload)


@router.get("/history", response_model=list[PanicHistoryPoint])
def get_history(range: str = Query("1y", description="Time range: 1m 3m 6m 1y 3y all")) -> list[PanicHistoryPoint]:
    days = RANGE_DAYS.get(range.lower(), RANGE_DAYS["1y"])
    start = (date.today() - timedelta(days=days)).isoformat()
    rows = panic_strategy.history(start)
    return [
        PanicHistoryPoint(
            date=row["date"],
            vix=round(float(row["vix"]), 2) if row["vix"] is not None else None,
            qqq_drawdown=round(float(row["drawdown"]), 4),
            portfolio_value=round(float(row["portfolio_value"]), 2),
            portfolio_drawdown=round(float(row["portfolio_drawdown"]), 4),
            qqq_benchmark_value=round(float(row["qqq_benchmark_value"]), 2),
            tqqq_benchmark_value=round(float(row["tqqq_benchmark_value"]), 2),
            balanced_benchmark_value=round(float(row["balanced_benchmark_value"]), 2),
            panic_level=int(row["panic_level"]),
            state=row["state"],
            qqq_weight=round(float(row["actual_qqq_weight"]), 4),
            tqqq_weight=round(float(row["actual_tqqq_weight"]), 4),
            cash_weight=round(float(row["actual_cash_weight"]), 4),
            transaction_cost=round(float(row["transaction_cost"]), 4),
            action=row["action"],
        )
        for row in rows
    ]
