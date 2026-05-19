"""
/api/indicators/overview — returns current status for all registered indicators.
"""
from fastapi import APIRouter

from app.database import get_conn
from app.models import IndicatorOverviewItem

router = APIRouter(prefix="/api")

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

# CFTC Leveraged Funds net long threshold in raw contracts.
# Historical range: -558k to +21k. -200k ≈ extreme short territory.
_COT_DEF = {
    "id": "cot-sp500",
    "name": "CTA 净持仓",
    "threshold": -200000,
    "threshold_direction": "below",
    "type": "buy",
}


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

        # COT indicator
        cot_row = conn.execute(
            """
            SELECT date, net_long
            FROM cot_history
            ORDER BY date DESC
            LIMIT 1
            """
        ).fetchone()

        if cot_row:
            defn = _COT_DEF
            net_long = cot_row["net_long"]
            is_signal = net_long < defn["threshold"]
            result.append(
                IndicatorOverviewItem(
                    id=defn["id"],
                    name=defn["name"],
                    date=cot_row["date"],
                    value=float(net_long),
                    threshold=float(defn["threshold"]),
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

            if fng_score <= 25:
                fng_zone = "extreme_fear"
                fng_zone_label = "极度恐慌 — 重仓买入"
                fng_type = "buy"
                fng_is_signal = True
            elif fng_score <= 44:
                fng_zone = "fear"
                fng_zone_label = "恐慌 — 观察"
                fng_type = "buy"
                fng_is_signal = False
            elif fng_score <= 54:
                fng_zone = "neutral"
                fng_zone_label = "中性"
                fng_type = "buy"
                fng_is_signal = False
            elif fng_score <= 74:
                fng_zone = "greed"
                fng_zone_label = "贪婪 — 谨慎"
                fng_type = "sell"
                fng_is_signal = False
            else:
                fng_zone = "extreme_greed"
                fng_zone_label = "极度贪婪 — 减仓/卖出"
                fng_type = "sell"
                fng_is_signal = True

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

            if vix_close >= 40.0:
                vix_zone = "buy_strong"
                vix_zone_label = "极度恐慌 — 重仓买入"
                vix_type = "buy"
                vix_is_signal = True
            elif vix_close >= 30.0:
                vix_zone = "buy"
                vix_zone_label = "高度恐慌 — 买入"
                vix_type = "buy"
                vix_is_signal = True
            elif vix_close <= 14.0:
                vix_zone = "sell"
                vix_zone_label = "极度平静 — 减仓/卖出"
                vix_type = "sell"
                vix_is_signal = True
            else:
                vix_zone = "normal"
                vix_zone_label = "正常区间"
                vix_type = "buy"
                vix_is_signal = False

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

    return result
