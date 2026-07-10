"""
/api/indicators/overview — returns current status for all registered indicators.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_conn
from app.models import DailyIndicatorCell, DailyStatusResponse, DailyStatusRow, IndicatorOverviewItem

router = APIRouter(prefix="/api")

RANGE_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "all": 365 * 20,
}

# Must stay in sync with frontend src/config/indicators.ts
_BREADTH_DEFS = [
    {
        "id": "breadth-ma50",
        "name": "MA50 市场宽度",
        "ma_period": 50,
        "threshold": 0.07,
        "threshold_direction": "below",
        "type": "buy",
    },
    {
        "id": "breadth-ma200",
        "name": "MA200 市场宽度",
        "ma_period": 200,
        "threshold": 0.30,
        "threshold_direction": "below",
        "type": "buy",
    },
]

_CALL_SKEW_DEF = {
    "id": "call-skew-qqq",
    "name": "QQQ 看涨期权偏斜",
    "threshold": 0.90,
    "threshold_direction": "above",
    "type": "buy",
}

def _empty_cell() -> DailyIndicatorCell:
    return DailyIndicatorCell(
        value=None,
        display_value="--",
        status="normal",
        source_date=None,
        status_label="",
    )


def _percent_cell(
    value: float,
    is_buy: bool,
    source_date: str,
    status_label: str = "",
) -> DailyIndicatorCell:
    return DailyIndicatorCell(
        value=round(value, 4),
        display_value=f"{value * 100:.1f}%",
        status="buy" if is_buy else "normal",
        source_date=source_date,
        status_label=status_label,
    )


def _decimal_cell(
    value: float,
    status: str,
    source_date: str,
    digits: int = 2,
    status_label: str = "",
) -> DailyIndicatorCell:
    return DailyIndicatorCell(
        value=round(value, digits),
        display_value=f"{value:.{digits}f}",
        status=status,
        source_date=source_date,
        status_label=status_label,
    )


def _latest_by_date(rows: list[dict], row_date: str, start_idx: int) -> tuple[dict | None, int]:
    idx = start_idx
    latest = rows[idx - 1] if idx > 0 else None
    while idx < len(rows) and rows[idx]["date"] <= row_date:
        latest = rows[idx]
        idx += 1
    return latest, idx


def _fng_zone(score: float) -> tuple[str, str, str, bool, str, str]:
    if score <= 25.0:
        return "extreme_fear", "极度恐慌 — 重仓买入", "buy", True, "重仓买入", "buy"
    if score <= 44.0:
        return "fear", "恐慌 — 观察/轻仓", "buy", False, "观察/轻仓", "buy"
    if score <= 54.0:
        return "neutral", "中性 — 持仓观望", "normal", False, "持仓观望", "buy"
    if score <= 74.0:
        return "greed", "贪婪 — 谨慎/减少买入", "sell", False, "谨慎/减少买入", "sell"
    return "extreme_greed", "极度贪婪 — 减仓/止盈", "sell", True, "减仓/止盈", "sell"


def _vix_zone(close: float) -> tuple[str, str, str, bool, str, str]:
    if close >= 40.0:
        return "buy_strong", "极度恐慌 — 重仓买入", "buy", True, "重仓买入", "buy"
    if close >= 30.0:
        return "buy", "高度恐慌 — 分批买入", "buy", True, "分批买入", "buy"
    if close <= 14.0:
        return "sell", "极度平静 — 减仓/止盈", "sell", True, "减仓/止盈", "sell"
    return "normal", "正常观察", "normal", False, "正常观察", "buy"


def _cape_zone(percentile: float) -> tuple[str, str, bool]:
    if percentile < 20.0:
        return "active", "估值便宜", True
    if percentile >= 85.0:
        return "danger", "泡沫警戒", False
    if percentile >= 70.0:
        return "warning", "估值偏高", False
    return "normal", "估值中性", False


def _qqq_drawdown(rows: list[dict]) -> tuple[str, float, float | None, str, bool] | None:
    if not rows:
        return None
    close = float(rows[-1]["close"])
    peak = max(float(row["close"]) for row in rows)
    drawdown = close / peak - 1.0
    ret_25d = close / float(rows[-26]["close"]) - 1.0 if len(rows) > 25 else None
    if drawdown <= -0.20:
        return "active", drawdown, ret_25d, "深度超跌", True
    if ret_25d is not None and ret_25d <= -0.12:
        return "warning", drawdown, ret_25d, "快崩预警", False
    if drawdown >= -0.05:
        return "near_high", drawdown, ret_25d, "贴近高点", False
    return "normal", drawdown, ret_25d, "正常回撤", False


@router.get("/indicators/overview", response_model=list[IndicatorOverviewItem])
def get_indicators_overview() -> list[IndicatorOverviewItem]:
    """Return current value and zone status for every registered indicator."""
    result: list[IndicatorOverviewItem] = []

    with get_conn() as conn:
        # Breadth indicators
        for defn in _BREADTH_DEFS:
            row = conn.execute(
                """
                SELECT date, breadth_pct, is_signal
                FROM breadth_history
                WHERE ma_period = ?
                ORDER BY date DESC
                LIMIT 1
                """,
                (defn["ma_period"],),
            ).fetchone()

            if not row:
                continue

            value = round(row["breadth_pct"], 4)
            is_signal = bool(row["is_signal"])
            result.append(
                IndicatorOverviewItem(
                    id=defn["id"],
                    name=defn["name"],
                    date=row["date"],
                    value=value,
                    threshold=defn["threshold"],
                    threshold_direction=defn["threshold_direction"],
                    is_signal=is_signal,
                    zone="active" if is_signal else "normal",
                    type=defn["type"],
                )
            )

        # Call skew indicator
        skew_row = conn.execute(
            """
            SELECT date, skew, is_signal
            FROM call_skew_history
            ORDER BY date DESC
            LIMIT 1
            """
        ).fetchone()

        if skew_row:
            defn = _CALL_SKEW_DEF
            is_signal = bool(skew_row["is_signal"])
            result.append(
                IndicatorOverviewItem(
                    id=defn["id"],
                    name=defn["name"],
                    date=skew_row["date"],
                    value=round(skew_row["skew"], 4),
                    threshold=defn["threshold"],
                    threshold_direction=defn["threshold_direction"],
                    is_signal=is_signal,
                    zone="active" if is_signal else "normal",
                    type=defn["type"],
                )
            )

        # Fear & Greed — single unified indicator with zone-based state
        fng_row = conn.execute(
            "SELECT date, score FROM fng_history ORDER BY date DESC LIMIT 1"
        ).fetchone()

        if fng_row:
            fng_score = fng_row["score"]
            fng_date = fng_row["date"]
            fng_zone, fng_zone_label, _, fng_is_signal, _, fng_type = _fng_zone(fng_score)

            result.append(
                IndicatorOverviewItem(
                    id="fng",
                    name="Fear & Greed Index",
                    date=fng_date,
                    value=round(fng_score, 1),
                    threshold=25.0,
                    threshold_direction="below",
                    is_signal=fng_is_signal,
                    zone=fng_zone,
                    type=fng_type,
                    zone_label=fng_zone_label,
                )
            )

        # VIX — single unified indicator with zone-based state
        vix_row = conn.execute(
            "SELECT date, close FROM vix_history ORDER BY date DESC LIMIT 1"
        ).fetchone()

        if vix_row:
            vix_close = vix_row["close"]
            vix_date = vix_row["date"]
            vix_zone, vix_zone_label, _, vix_is_signal, _, vix_type = _vix_zone(vix_close)

            result.append(
                IndicatorOverviewItem(
                    id="vix",
                    name="VIX 恐慌指数",
                    date=vix_date,
                    value=round(vix_close, 2),
                    threshold=30.0,
                    threshold_direction="above",
                    is_signal=vix_is_signal,
                    zone=vix_zone,
                    type=vix_type,
                    zone_label=vix_zone_label,
                )
            )

        cape_row = conn.execute(
            "SELECT month, cape, percentile FROM cape_history ORDER BY month DESC LIMIT 1"
        ).fetchone()

        if cape_row:
            cape_zone, cape_label, cape_is_signal = _cape_zone(float(cape_row["percentile"]))
            result.append(
                IndicatorOverviewItem(
                    id="cape-percentile",
                    name="CAPE 分位",
                    date=cape_row["month"],
                    value=round(float(cape_row["percentile"]) / 100.0, 4),
                    threshold=0.20,
                    threshold_direction="below",
                    is_signal=cape_is_signal,
                    zone=cape_zone,
                    type="buy",
                    zone_label=cape_label,
                )
            )

        qqq_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT date, close FROM qqq_history ORDER BY date"
            ).fetchall()
        ]
        qqq_status = _qqq_drawdown(qqq_rows)
        if qqq_status:
            qqq_zone, drawdown, _, qqq_label, qqq_is_signal = qqq_status
            result.append(
                IndicatorOverviewItem(
                    id="qqq-drawdown",
                    name="QQQ 回撤",
                    date=qqq_rows[-1]["date"],
                    value=round(drawdown, 4),
                    threshold=-0.20,
                    threshold_direction="below",
                    is_signal=qqq_is_signal,
                    zone=qqq_zone,
                    type="buy",
                    zone_label=qqq_label,
                )
            )

    return result


@router.get("/indicators/daily-status", response_model=DailyStatusResponse)
def get_indicators_daily_status(
    range: str = Query("1y", description="Time range: 1m 3m 6m 1y 3y all"),
) -> DailyStatusResponse:
    """Return one row per trading day with all indicator states carried forward."""
    normalized_range = range.lower()
    if normalized_range not in RANGE_DAYS:
        normalized_range = "1y"
    days = RANGE_DAYS.get(normalized_range, RANGE_DAYS["1y"])
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        dates = [
            r["date"]
            for r in conn.execute(
                """
                SELECT date
                FROM breadth_history
                WHERE ma_period = 50 AND date >= ?
                ORDER BY date
                """,
                (start,),
            ).fetchall()
        ]

        ma50_rows = [
            dict(r)
            for r in conn.execute(
                """
                SELECT date, breadth_pct, is_signal
                FROM breadth_history
                WHERE ma_period = 50
                ORDER BY date
                """
            ).fetchall()
        ]
        ma200_rows = [
            dict(r)
            for r in conn.execute(
                """
                SELECT date, breadth_pct, is_signal
                FROM breadth_history
                WHERE ma_period = 200
                ORDER BY date
                """
            ).fetchall()
        ]
        vix_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT date, close FROM vix_history ORDER BY date"
            ).fetchall()
        ]
        fng_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT date, score FROM fng_history ORDER BY date"
            ).fetchall()
        ]
        skew_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT date, skew, is_signal FROM call_skew_history ORDER BY date"
            ).fetchall()
        ]

    indexes = {
        "breadth-ma50": 0,
        "breadth-ma200": 0,
        "vix": 0,
        "fng": 0,
        "call-skew-qqq": 0,
    }
    sources = {
        "breadth-ma50": ma50_rows,
        "breadth-ma200": ma200_rows,
        "vix": vix_rows,
        "fng": fng_rows,
        "call-skew-qqq": skew_rows,
    }

    rows: list[DailyStatusRow] = []
    for row_date in dates:
        cells: dict[str, DailyIndicatorCell] = {}

        latest, indexes["breadth-ma50"] = _latest_by_date(
            sources["breadth-ma50"], row_date, indexes["breadth-ma50"]
        )
        cells["breadth-ma50"] = (
            _percent_cell(latest["breadth_pct"], bool(latest["is_signal"]), latest["date"])
            if latest else _empty_cell()
        )

        latest, indexes["breadth-ma200"] = _latest_by_date(
            sources["breadth-ma200"], row_date, indexes["breadth-ma200"]
        )
        cells["breadth-ma200"] = (
            _percent_cell(latest["breadth_pct"], bool(latest["is_signal"]), latest["date"])
            if latest else _empty_cell()
        )

        latest, indexes["vix"] = _latest_by_date(
            sources["vix"], row_date, indexes["vix"]
        )
        if latest:
            vix_close = latest["close"]
            _, _, vix_status, _, vix_status_label, _ = _vix_zone(vix_close)
            cells["vix"] = _decimal_cell(
                vix_close,
                vix_status,
                latest["date"],
                digits=2,
                status_label=vix_status_label,
            )
        else:
            cells["vix"] = _empty_cell()

        latest, indexes["fng"] = _latest_by_date(
            sources["fng"], row_date, indexes["fng"]
        )
        if latest:
            fng_score = latest["score"]
            _, _, fng_status, _, fng_status_label, _ = _fng_zone(fng_score)
            cells["fng"] = _decimal_cell(
                fng_score,
                fng_status,
                latest["date"],
                digits=1,
                status_label=fng_status_label,
            )
        else:
            cells["fng"] = _empty_cell()

        latest, indexes["call-skew-qqq"] = _latest_by_date(
            sources["call-skew-qqq"], row_date, indexes["call-skew-qqq"]
        )
        cells["call-skew-qqq"] = (
            _decimal_cell(
                latest["skew"],
                "buy" if bool(latest["is_signal"]) else "normal",
                latest["date"],
                digits=3,
            )
            if latest else _empty_cell()
        )

        rows.append(DailyStatusRow(date=row_date, indicators=cells))

    rows.reverse()
    return DailyStatusResponse(range=normalized_range, rows=rows)
