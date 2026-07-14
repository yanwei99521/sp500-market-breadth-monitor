"""QQQ panic-buy strategy data pipeline and no-lookahead backtest engine."""
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from io import StringIO
from math import sqrt

import pandas as pd
import requests
import yfinance as yf

from app.database import get_conn

logger = logging.getLogger(__name__)

START_DATE = "1999-03-10"
TQQQ_START_DATE = "2010-02-11"
INITIAL_CAPITAL = 100_000.0
QQQ_COST = 0.0005
TQQQ_COST = 0.0010
CASH_FEE = 0.0015
SYNTHETIC_TQQQ_FEE = 0.0095
FRED_DGS3MO_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO"

BASE_TARGET = (0.70, 0.00, 0.30)
PANIC_TARGETS = {
    1: (0.75, 0.05, 0.20),
    2: (0.70, 0.15, 0.15),
    3: (0.65, 0.25, 0.10),
    4: (0.55, 0.45, 0.00),
}

STATE_LABELS = {
    "normal": "正常配置",
    "panic_1": "一级恐慌",
    "panic_2": "二级恐慌",
    "panic_3": "三级恐慌",
    "panic_4": "极端恐慌",
    "recovery_1": "恢复期一",
    "recovery_2": "恢复期二",
}


@dataclass(frozen=True)
class StrategyConfig:
    drawdown_shift: float = 0.0
    vix_shift: float = 0.0
    tqqq_cap: float = 0.45


def fetch_tqqq_history(start: str | None = None) -> int:
    """Fetch real TQQQ adjusted closes from its inception onward."""
    with get_conn() as conn:
        row = conn.execute("SELECT MAX(date) FROM tqqq_history").fetchone()
    last_date = row[0] if row and row[0] else None
    start = start or ((date.fromisoformat(last_date) + timedelta(days=1)).isoformat() if last_date else TQQQ_START_DATE)
    if start >= date.today().isoformat():
        return 0

    df = yf.Ticker("TQQQ").history(start=start, auto_adjust=True)
    if df.empty:
        logger.warning("TQQQ history fetch returned no rows from %s", start)
        return 0

    rows = [
        (ts.strftime("%Y-%m-%d"), float(row["Close"]))
        for ts, row in df.iterrows()
        if not pd.isna(row.get("Close"))
    ]
    with get_conn() as conn:
        conn.executemany("INSERT OR REPLACE INTO tqqq_history (date, close) VALUES (?, ?)", rows)
        conn.commit()
    logger.info("TQQQ: upserted %d rows from %s", len(rows), start)
    return len(rows)


def fetch_risk_free_history(start: str | None = None) -> int:
    """Fetch 3-month Treasury yields from FRED without requiring an API key."""
    with get_conn() as conn:
        row = conn.execute("SELECT MAX(date) FROM risk_free_history").fetchone()
    last_date = row[0] if row and row[0] else None
    start = start or ((date.fromisoformat(last_date) + timedelta(days=1)).isoformat() if last_date else START_DATE)
    if start >= date.today().isoformat():
        return 0

    response = requests.get(FRED_DGS3MO_URL, params={"cosd": start}, timeout=30)
    response.raise_for_status()
    df = pd.read_csv(StringIO(response.text))
    date_column = "DATE" if "DATE" in df.columns else "observation_date"
    if date_column not in df.columns or "DGS3MO" not in df.columns:
        raise RuntimeError("FRED DGS3MO response did not contain expected columns")
    df["DGS3MO"] = pd.to_numeric(df["DGS3MO"], errors="coerce")
    rows = [
        (str(row[date_column]), float(row["DGS3MO"]))
        for _, row in df.dropna(subset=["DGS3MO"]).iterrows()
    ]
    with get_conn() as conn:
        conn.executemany("INSERT OR REPLACE INTO risk_free_history (date, yield_pct) VALUES (?, ?)", rows)
        conn.commit()
    logger.info("Risk-free rate: upserted %d rows from %s", len(rows), start)
    return len(rows)


def ensure_strategy_sources() -> dict[str, int]:
    """Ensure all history required for the 1999 strategy is present and current."""
    from app.services import three_signals, vix_fetcher

    result = {"qqq": 0, "vix": 0, "tqqq": 0, "risk_free": 0}
    result["qqq"] = three_signals.fetch_qqq_history()
    with get_conn() as conn:
        vix_first = conn.execute("SELECT MIN(date) FROM vix_history").fetchone()[0]
    if not vix_first or vix_first > START_DATE:
        result["vix"] = vix_fetcher.fetch_and_store(start=START_DATE)
    else:
        result["vix"] = vix_fetcher.fetch_and_store()
    result["tqqq"] = fetch_tqqq_history()
    result["risk_free"] = fetch_risk_free_history()
    return result


def _market_data() -> pd.DataFrame:
    with get_conn() as conn:
        qqq = pd.read_sql_query("SELECT date, close FROM qqq_history WHERE date >= ? ORDER BY date", conn, params=(START_DATE,))
        vix = pd.read_sql_query("SELECT date, close FROM vix_history ORDER BY date", conn)
        tqqq = pd.read_sql_query("SELECT date, close FROM tqqq_history ORDER BY date", conn)
        rates = pd.read_sql_query("SELECT date, yield_pct FROM risk_free_history ORDER BY date", conn)
    if qqq.empty or vix.empty or rates.empty:
        raise RuntimeError("Panic strategy requires QQQ, VIX, and short-term Treasury histories")

    for frame in (qqq, vix, tqqq, rates):
        frame["date"] = pd.to_datetime(frame["date"])
    data = qqq.rename(columns={"close": "qqq_close"}).sort_values("date")
    data = pd.merge_asof(data, vix.rename(columns={"close": "vix"}).sort_values("date"), on="date", direction="backward")
    data = pd.merge_asof(data, rates.sort_values("date"), on="date", direction="backward")
    data = data.merge(tqqq.rename(columns={"close": "tqqq_close"}), on="date", how="left")
    data["yield_pct"] = data["yield_pct"].ffill().fillna(0.0)
    data["qqq_return"] = data["qqq_close"].pct_change().fillna(0.0)
    data["tqqq_actual_return"] = data["tqqq_close"].pct_change(fill_method=None)
    financing = (2.0 * data["yield_pct"] / 100.0 + SYNTHETIC_TQQQ_FEE) / 252.0
    data["tqqq_synthetic_return"] = (3.0 * data["qqq_return"] - financing).clip(lower=-1.0)
    data["tqqq_return"] = data["tqqq_actual_return"].where(data["tqqq_actual_return"].notna(), data["tqqq_synthetic_return"])
    data["cash_return"] = (data["yield_pct"] / 100.0 - CASH_FEE) / 252.0
    data["peak"] = data["qqq_close"].cummax()
    data["drawdown"] = data["qqq_close"] / data["peak"] - 1.0
    data["ma50"] = data["qqq_close"].rolling(50).mean()
    data["ma200"] = data["qqq_close"].rolling(200).mean()
    return data.dropna(subset=["vix"]).reset_index(drop=True)


def _target(level: int, config: StrategyConfig) -> tuple[float, float, float]:
    if level == 0:
        return BASE_TARGET
    qqq, tqqq, cash = PANIC_TARGETS[level]
    scaled_tqqq = min(config.tqqq_cap, tqqq * config.tqqq_cap / 0.45)
    return 1.0 - cash - scaled_tqqq, scaled_tqqq, cash


def _panic_level(drawdown: float, vix: float, config: StrategyConfig) -> int:
    dd = config.drawdown_shift
    vs = config.vix_shift
    if drawdown <= -0.40 + dd or (drawdown <= -0.30 + dd and vix >= 50.0 + vs):
        return 4
    if drawdown <= -0.30 + dd and vix >= 40.0 + vs:
        return 3
    if drawdown <= -0.20 + dd and vix >= 30.0 + vs:
        return 2
    if drawdown <= -0.10 + dd and vix >= 25.0 + vs:
        return 1
    return 0


def _rebalance(holdings: list[float], target: tuple[float, float, float]) -> tuple[list[float], float, float]:
    """Trade at portfolio weights and return new holdings, costs and turnover."""
    total = sum(holdings)
    after_cost = total
    for _ in range(4):
        desired = [after_cost * weight for weight in target]
        cost = abs(desired[0] - holdings[0]) * QQQ_COST + abs(desired[1] - holdings[1]) * TQQQ_COST
        after_cost = total - cost
    desired = [after_cost * weight for weight in target]
    turnover = (abs(desired[0] - holdings[0]) + abs(desired[1] - holdings[1])) / total if total else 0.0
    return desired, total - after_cost, turnover


def _weights(holdings: list[float]) -> tuple[float, float, float]:
    total = sum(holdings)
    return tuple(value / total for value in holdings) if total else (0.0, 0.0, 0.0)


def simulate(data: pd.DataFrame, config: StrategyConfig = StrategyConfig()) -> tuple[pd.DataFrame, dict]:
    """Run the strategy with T signal / T+1 execution and no future information."""
    if data.empty:
        raise ValueError("No market data available for panic strategy")

    holdings, initial_cost, initial_turnover = _rebalance([0.0, 0.0, INITIAL_CAPITAL], BASE_TARGET)
    qqq_benchmark, qqq_cost, _ = _rebalance([0.0, 0.0, INITIAL_CAPITAL], (1.0, 0.0, 0.0))
    tqqq_benchmark, tqqq_cost, _ = _rebalance([0.0, 0.0, INITIAL_CAPITAL], (0.0, 1.0, 0.0))
    balanced_benchmark, balanced_cost, balanced_turnover = _rebalance([0.0, 0.0, INITIAL_CAPITAL], BASE_TARGET)
    pending: tuple[tuple[float, float, float], str, str] | None = None
    target = BASE_TARGET
    state = "normal"
    episode_level = 0
    above50 = 0
    above200 = 0
    peak_value = sum(holdings)
    rows: list[dict] = []
    total_cost = initial_cost
    total_turnover = initial_turnover

    for index, point in data.iterrows():
        if index:
            holdings[0] *= 1.0 + point["qqq_return"]
            holdings[1] *= 1.0 + point["tqqq_return"]
            holdings[2] *= 1.0 + point["cash_return"]
            qqq_benchmark[0] *= 1.0 + point["qqq_return"]
            tqqq_benchmark[1] *= 1.0 + point["tqqq_return"]
            balanced_benchmark[0] *= 1.0 + point["qqq_return"]
            balanced_benchmark[2] *= 1.0 + point["cash_return"]

        transaction_cost = 0.0
        turnover = 0.0
        if pending:
            target, _, _ = pending
            holdings, transaction_cost, turnover = _rebalance(holdings, target)
            total_cost += transaction_cost
            total_turnover += turnover
            pending = None

        if index and point["date"].year != data.iloc[index - 1]["date"].year:
            balanced_benchmark, cost, rebalance_turnover = _rebalance(balanced_benchmark, BASE_TARGET)
            balanced_cost += cost
            balanced_turnover += rebalance_turnover

        above50 = above50 + 1 if pd.notna(point["ma50"]) and point["qqq_close"] > point["ma50"] else 0
        above200 = above200 + 1 if pd.notna(point["ma200"]) and point["qqq_close"] > point["ma200"] else 0
        market_level = _panic_level(float(point["drawdown"]), float(point["vix"]), config)
        action = "持有当前配置"
        reason = "未出现新的恐慌升级或恢复条件"
        next_target: tuple[float, float, float] | None = None

        if market_level > episode_level:
            episode_level = market_level
            state = f"panic_{market_level}"
            next_target = _target(market_level, config)
            action = "恐慌升级，下一交易日调仓"
            reason = f"QQQ 回撤 {point['drawdown'] * 100:.1f}%，VIX {point['vix']:.1f}，触发{STATE_LABELS[state]}"
        elif episode_level:
            if point["drawdown"] > -0.05 and point["vix"] < 20.0:
                episode_level = 0
                state = "normal"
                next_target = BASE_TARGET
                action = "恢复常规配置，下一交易日调仓"
                reason = "QQQ 距历史高点不足 5% 且 VIX 低于 20"
            elif above200 >= 5 and point["vix"] < 25.0 and state != "recovery_2":
                state = "recovery_2"
                next_target = (0.75, 0.05, 0.20)
                action = "恢复期二，下一交易日降杠杆"
                reason = "QQQ 连续 5 日站上 MA200 且 VIX 低于 25"
            elif above50 >= 5 and point["vix"] < 30.0 and state not in {"recovery_1", "recovery_2"}:
                state = "recovery_1"
                actual = _weights(holdings)
                next_target = (actual[0] + actual[1] / 2.0, actual[1] / 2.0, actual[2])
                action = "恢复期一，下一交易日减半 TQQQ"
                reason = "QQQ 连续 5 日站上 MA50 且 VIX 低于 30"

        if next_target and any(abs(left - right) > 1e-9 for left, right in zip(next_target, target)):
            target = next_target
            pending = (target, action, reason)

        value = sum(holdings)
        peak_value = max(peak_value, value)
        actual = _weights(holdings)
        rows.append({
            "date": point["date"].strftime("%Y-%m-%d"),
            "qqq_close": float(point["qqq_close"]),
            "vix": float(point["vix"]),
            "drawdown": float(point["drawdown"]),
            "state": state,
            "panic_level": episode_level,
            "target_qqq_weight": target[0], "target_tqqq_weight": target[1], "target_cash_weight": target[2],
            "actual_qqq_weight": actual[0], "actual_tqqq_weight": actual[1], "actual_cash_weight": actual[2],
            "portfolio_value": value,
            "portfolio_drawdown": value / peak_value - 1.0,
            "transaction_cost": transaction_cost,
            "turnover": turnover,
            "qqq_benchmark_value": sum(qqq_benchmark),
            "tqqq_benchmark_value": sum(tqqq_benchmark),
            "balanced_benchmark_value": sum(balanced_benchmark),
            "action": action,
            "reason": reason,
        })

    frame = pd.DataFrame(rows)
    accounting = {
        "strategy_cost": total_cost,
        "strategy_turnover": total_turnover,
        "qqq_cost": qqq_cost,
        "tqqq_cost": tqqq_cost,
        "balanced_cost": balanced_cost,
        "balanced_turnover": balanced_turnover,
    }
    return frame, accounting


def _metrics(frame: pd.DataFrame, value_column: str, cost: float = 0.0, turnover: float = 0.0, cash_occupancy: float = 0.0) -> dict:
    values = frame[value_column].astype(float)
    returns = values.pct_change().dropna()
    years = max((pd.Timestamp(frame["date"].iloc[-1]) - pd.Timestamp(frame["date"].iloc[0])).days / 365.25, 1 / 365.25)
    terminal = float(values.iloc[-1])
    cagr = (terminal / INITIAL_CAPITAL) ** (1.0 / years) - 1.0
    drawdown = values / values.cummax() - 1.0
    max_drawdown = float(drawdown.min())
    annual_volatility = float(returns.std(ddof=0) * sqrt(252)) if len(returns) else 0.0
    excess = returns - (frame["cash_weight_for_sharpe"].iloc[1:].values if "cash_weight_for_sharpe" in frame else 0.0)
    sharpe = float(excess.mean() / excess.std(ddof=0) * sqrt(252)) if len(excess) > 1 and excess.std(ddof=0) else None
    year_values = pd.DataFrame({"date": pd.to_datetime(frame["date"]), "value": values})
    grouped = year_values.groupby(year_values["date"].dt.year)["value"].agg(["first", "last"])
    worst_year = float((grouped["last"] / grouped["first"] - 1.0).min()) if not grouped.empty else 0.0
    return {
        "terminal_value": terminal, "cagr": cagr, "max_drawdown": max_drawdown,
        "calmar": cagr / abs(max_drawdown) if max_drawdown else None,
        "sharpe": sharpe, "annual_volatility": annual_volatility, "worst_year": worst_year,
        "transaction_cost": cost, "turnover": turnover, "cash_occupancy": cash_occupancy,
    }


def _crisis_reviews(frame: pd.DataFrame) -> list[dict]:
    periods = [
        ("dotcom", "互联网泡沫", "2000-03-24", "2002-10-09"),
        ("gfc", "金融危机", "2007-10-09", "2009-03-09"),
        ("covid", "疫情冲击", "2020-02-19", "2020-03-23"),
        ("rates", "加息熊市", "2021-11-19", "2022-12-28"),
    ]
    result = []
    for crisis_id, name, start, end in periods:
        segment = frame[(frame["date"] >= start) & (frame["date"] <= end)]
        if segment.empty:
            continue
        strategy_values = segment["portfolio_value"]
        result.append({
            "id": crisis_id, "name": name, "start": start, "end": end,
            "strategy_return": float(strategy_values.iloc[-1] / strategy_values.iloc[0] - 1.0),
            "qqq_return": float(segment["qqq_benchmark_value"].iloc[-1] / segment["qqq_benchmark_value"].iloc[0] - 1.0),
            "strategy_max_drawdown": float((strategy_values / strategy_values.cummax() - 1.0).min()),
        })
    return result


def _sensitivity(data: pd.DataFrame) -> list[dict]:
    rows = []
    for drawdown_shift in (-0.02, 0.0, 0.02):
        for vix_shift in (-3.0, 0.0, 3.0):
            for tqqq_cap in (0.35, 0.45, 0.55):
                frame, _ = simulate(data, StrategyConfig(drawdown_shift, vix_shift, tqqq_cap))
                metrics = _metrics(frame, "portfolio_value")
                rows.append({"drawdown_shift": drawdown_shift, "vix_shift": vix_shift, "tqqq_cap": tqqq_cap, **{key: metrics[key] for key in ("terminal_value", "max_drawdown", "cagr")}})
    return rows


def calculate_and_store() -> dict:
    """Recalculate all strategy state and summaries from the complete daily history."""
    data = _market_data()
    frame, accounting = simulate(data)
    frame["cash_weight_for_sharpe"] = data["cash_return"].values
    metrics = [
        {"id": "strategy", "name": "QQQ 恐慌策略", **_metrics(frame, "portfolio_value", accounting["strategy_cost"], accounting["strategy_turnover"], float(frame["actual_cash_weight"].mean()))},
        {"id": "qqq", "name": "QQQ 全仓持有", **_metrics(frame, "qqq_benchmark_value", accounting["qqq_cost"], 1.0, 0.0)},
        {"id": "tqqq", "name": "TQQQ 全仓持有", **_metrics(frame, "tqqq_benchmark_value", accounting["tqqq_cost"], 1.0, 0.0)},
        {"id": "balanced", "name": "70/30 QQQ/现金", **_metrics(frame, "balanced_benchmark_value", accounting["balanced_cost"], accounting["balanced_turnover"], 0.30)},
    ]
    payload = {
        "start_date": frame["date"].iloc[0], "end_date": frame["date"].iloc[-1], "initial_capital": INITIAL_CAPITAL,
        "metrics": metrics, "crises": _crisis_reviews(frame), "sensitivity": _sensitivity(data),
        "assumptions": [
            "使用当日收盘数据生成信号，并在下一交易日收盘调仓。",
            "QQQ 单边交易成本 5bp，TQQQ 单边交易成本 10bp；不计税。",
            "2010-02-11 前的 TQQQ 以 3 倍 QQQ 日收益、2 倍短期利率融资成本和 0.95% 年费合成。",
            "现金按 3 个月国债收益率扣除 0.15% 年管理成本计息。",
        ],
    }
    records = frame.drop(columns=["cash_weight_for_sharpe"], errors="ignore").to_dict("records")
    columns = list(records[0])
    placeholders = ", ".join(f":{column}" for column in columns)
    with get_conn() as conn:
        conn.execute("DELETE FROM panic_strategy_history")
        conn.executemany(
            f"INSERT INTO panic_strategy_history ({', '.join(columns)}) VALUES ({placeholders})",
            records,
        )
        conn.execute(
            "INSERT OR REPLACE INTO panic_strategy_summary (id, calculated_at, payload) VALUES (1, ?, ?)",
            (datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"), json.dumps(payload, ensure_ascii=False)),
        )
        conn.commit()
    logger.info("Panic strategy recalculated: %d daily rows", len(frame))
    return payload


def latest_current() -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM panic_strategy_history ORDER BY date DESC LIMIT 1").fetchone()
    return dict(row) if row else None


def summary() -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT payload FROM panic_strategy_summary WHERE id = 1").fetchone()
    return json.loads(row["payload"]) if row else None


def history(start: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM panic_strategy_history WHERE date >= ? ORDER BY date", (start,)).fetchall()
    return [dict(row) for row in rows]
