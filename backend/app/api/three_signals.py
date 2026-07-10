"""
/api/three-signals/* — CAPE + DD + VIX Nasdaq dynamic allocation signals.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.database import get_conn
from app.models import CapePoint, QqqDrawdownPoint, ThreeSignalItem, ThreeSignalStatus

router = APIRouter(prefix="/api")

RANGE_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "3y": 365 * 3,
    "all": 365 * 200,
}


def _empty_item(id: str, name: str, description: str) -> ThreeSignalItem:
    return ThreeSignalItem(
        id=id,
        name=name,
        date=None,
        value=None,
        display_value="--",
        zone="missing",
        status_label="暂无数据",
        is_active=False,
        description=description,
    )


def _cape_item(row) -> ThreeSignalItem:
    if not row:
        return _empty_item("cape", "CAPE 分位", "低于 20% 为估值便宜；70% 以上高估；85% 以上泡沫警戒。")

    percentile = float(row["percentile"])
    if percentile < 20.0:
        zone = "cheap"
        label = "估值便宜"
        active = True
    elif percentile >= 85.0:
        zone = "bubble"
        label = "泡沫警戒"
        active = False
    elif percentile >= 70.0:
        zone = "expensive"
        label = "估值偏高"
        active = False
    else:
        zone = "normal"
        label = "估值中性"
        active = False

    return ThreeSignalItem(
        id="cape",
        name="CAPE 分位",
        date=row["month"],
        value=round(percentile, 1),
        display_value=f"{percentile:.1f}%",
        zone=zone,
        status_label=label,
        is_active=active,
        description=f"Shiller CAPE {float(row['cape']):.1f}；低于 20% 计入低位信号。",
    )


def _dd_item(rows: list[dict]) -> tuple[ThreeSignalItem, float | None, float | None]:
    if not rows:
        return _empty_item("dd", "QQQ 回撤", "距高点回撤超过 20% 为深度超跌；25 日急跌超过 12% 为快崩预警。"), None, None

    latest = rows[-1]
    close = float(latest["close"])
    peak = max(float(row["close"]) for row in rows)
    drawdown = close / peak - 1.0
    ret_25d = None
    if len(rows) > 25:
        ret_25d = close / float(rows[-26]["close"]) - 1.0

    if drawdown <= -0.20:
        zone = "deep_drawdown"
        label = "深度超跌"
        active = True
    elif ret_25d is not None and ret_25d <= -0.12:
        zone = "crash_warning"
        label = "快崩预警"
        active = False
    elif drawdown >= -0.05:
        zone = "near_high"
        label = "贴近高点"
        active = False
    else:
        zone = "normal"
        label = "正常回撤"
        active = False

    ret_text = "--" if ret_25d is None else f"{ret_25d * 100:.1f}%"
    return ThreeSignalItem(
        id="dd",
        name="QQQ 回撤",
        date=latest["date"],
        value=round(drawdown * 100, 1),
        display_value=f"{drawdown * 100:.1f}%",
        zone=zone,
        status_label=label,
        is_active=active,
        description=f"25 日涨跌幅 {ret_text}；距历史高点回撤超过 20% 计入低位信号。",
    ), drawdown, ret_25d


def _qqq_drawdown_points(rows: list[dict]) -> list[QqqDrawdownPoint]:
    result: list[QqqDrawdownPoint] = []
    peak: float | None = None
    closes: list[float] = []
    for row in rows:
        close = float(row["close"])
        closes.append(close)
        peak = close if peak is None else max(peak, close)
        ret_25d = close / closes[-26] - 1.0 if len(closes) > 25 else None
        result.append(
            QqqDrawdownPoint(
                date=row["date"],
                close=round(close, 4),
                drawdown=round(close / peak - 1.0, 4),
                return_25d=round(ret_25d, 4) if ret_25d is not None else None,
            )
        )
    return result


def _vix_item(row) -> ThreeSignalItem:
    if not row:
        return _empty_item("vix", "VIX 恐慌", "高于 40 为极度恐慌；低于 12 为过度平静。")

    close = float(row["close"])
    if close >= 40.0:
        zone = "panic"
        label = "极度恐慌"
        active = True
    elif close < 12.0:
        zone = "too_calm"
        label = "过度平静"
        active = False
    else:
        zone = "normal"
        label = "正常观察"
        active = False

    return ThreeSignalItem(
        id="vix",
        name="VIX 恐慌",
        date=row["date"],
        value=round(close, 2),
        display_value=f"{close:.2f}",
        zone=zone,
        status_label=label,
        is_active=active,
        description="高于 40 计入低位信号；低于 12 视为过度平静。",
    )


@router.get("/three-signals/current", response_model=ThreeSignalStatus)
def get_three_signals_current() -> ThreeSignalStatus:
    with get_conn() as conn:
        cape_row = conn.execute(
            "SELECT month, cape, percentile FROM cape_history ORDER BY month DESC LIMIT 1"
        ).fetchone()
        qqq_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT date, close FROM qqq_history ORDER BY date"
            ).fetchall()
        ]
        vix_row = conn.execute(
            "SELECT date, close FROM vix_history ORDER BY date DESC LIMIT 1"
        ).fetchone()

    cape = _cape_item(cape_row)
    dd, drawdown, ret_25d = _dd_item(qqq_rows)
    vix = _vix_item(vix_row)

    low_signal_count = sum(1 for item in [cape, dd, vix] if item.is_active)
    is_expensive = cape.zone in {"expensive", "bubble"}
    is_bubble = cape.zone == "bubble"
    is_near_high = drawdown is not None and drawdown >= -0.05
    is_crash_warning = ret_25d is not None and ret_25d <= -0.12
    is_too_calm = vix.zone == "too_calm"

    if low_signal_count >= 2:
        action_label = "大底信号"
        action_description = "低位信号同时亮 2-3 个：当月投入三倍，弹药仓集中买入 TQQQ，并分 6 个月逐步加满。"
    elif low_signal_count == 1:
        action_label = "小底信号"
        action_description = "低位信号亮 1 个：当月投入两倍，优先买入 QQQ。"
    elif is_crash_warning:
        action_label = "快崩预警"
        action_description = "25 日内急跌超过 12%：紧急降低 TQQQ 暴露，资金转入弹药仓。"
    elif is_expensive and is_near_high:
        action_label = "高估不追"
        action_description = "CAPE 偏高且指数贴近高点：本日不追高，新增资金留在场外。"
    elif is_bubble or is_too_calm:
        action_label = "过热降杠杆"
        action_description = "CAPE 泡沫区或 VIX 过度平静：逐步减 TQQQ，收益转入弹药仓。"
    else:
        action_label = "正常投入"
        action_description = "没有极端低位或高位风险信号：按一倍节奏买入 QQQ。"

    dates = [item.date for item in [dd, vix, cape] if item.date]
    return ThreeSignalStatus(
        date=max(dates) if dates else None,
        active_count=low_signal_count,
        action_label=action_label,
        action_description=action_description,
        items=[cape, dd, vix],
    )


@router.get("/three-signals/cape/history", response_model=list[CapePoint])
def get_cape_history(
    range: str = Query("all", description="Time range: 1m 3m 6m 1y 3y all"),
) -> list[CapePoint]:
    days = RANGE_DAYS.get(range.lower(), RANGE_DAYS["all"])
    start = (date.today() - timedelta(days=days)).strftime("%Y-%m")

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT month, cape, percentile
            FROM cape_history
            WHERE month >= ?
            ORDER BY month
            """,
            (start,),
        ).fetchall()

    return [
        CapePoint(date=f"{row['month']}-01", cape=round(row["cape"], 2), percentile=round(row["percentile"], 2))
        for row in rows
    ]


@router.get("/three-signals/qqq-drawdown/history", response_model=list[QqqDrawdownPoint])
def get_qqq_drawdown_history(
    range: str = Query("all", description="Time range: 1m 3m 6m 1y 3y all"),
) -> list[QqqDrawdownPoint]:
    normalized_range = range.lower()
    days = RANGE_DAYS.get(normalized_range, RANGE_DAYS["all"])
    start = (date.today() - timedelta(days=days)).isoformat()

    with get_conn() as conn:
        rows = [
            dict(row)
            for row in conn.execute(
                "SELECT date, close FROM qqq_history ORDER BY date"
            ).fetchall()
        ]

    points = _qqq_drawdown_points(rows)
    return [point for point in points if point.date >= start]
