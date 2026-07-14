from datetime import datetime

from pydantic import BaseModel


class BreadthPoint(BaseModel):
    date: str
    breadth_pct: float
    is_signal: bool


class BreadthStatus(BaseModel):
    date: str
    breadth_pct: float
    is_signal: bool
    status: str          # "extreme_oversold" | "oversold" | "normal" | "overbought"
    threshold: float
    ma_period: int


class CurrentBreadth(BaseModel):
    ma50: BreadthStatus
    ma200: BreadthStatus


class SignalPoint(BaseModel):
    date: str
    breadth_pct: float
    ma_period: int


class IndicatorOverviewItem(BaseModel):
    id: str
    name: str
    date: str
    value: float
    threshold: float
    threshold_direction: str  # "below" | "above"
    is_signal: bool
    zone: str                 # "active" | "normal" | vix/fng zone strings
    type: str                 # "buy" | "sell"
    zone_label: str = ""     # human-readable zone label (used by sentiment indicators)


class DailyIndicatorCell(BaseModel):
    value: float | None
    display_value: str
    status: str              # "buy" | "sell" | "normal"
    source_date: str | None
    status_label: str = ""   # optional display label for zone-based indicators


class DailyStatusRow(BaseModel):
    date: str
    indicators: dict[str, DailyIndicatorCell]


class DailyStatusResponse(BaseModel):
    range: str
    rows: list[DailyStatusRow]


class CallSkewPoint(BaseModel):
    date: str
    skew: float
    is_signal: bool


class CallSkewCurrent(BaseModel):
    date: str
    atm_iv: float
    otm25d_iv: float
    skew: float
    is_signal: bool


class FngPoint(BaseModel):
    date: str
    score: float
    rating: str


class FngCurrent(BaseModel):
    date: str
    score: float
    rating: str
    previous_close: float
    previous_1_week: float
    previous_1_month: float
    previous_1_year: float


class VixPoint(BaseModel):
    date: str
    close: float
    high: float
    low: float


class VixCurrent(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    zone: str   # "sell" | "normal" | "buy" | "buy_strong"


class ThreeSignalItem(BaseModel):
    id: str
    name: str
    date: str | None
    value: float | None
    display_value: str
    zone: str
    status_label: str
    is_active: bool
    description: str


class ThreeSignalStatus(BaseModel):
    date: str | None
    active_count: int
    action_label: str
    action_description: str
    items: list[ThreeSignalItem]


class CapePoint(BaseModel):
    date: str
    cape: float
    percentile: float


class QqqDrawdownPoint(BaseModel):
    date: str
    close: float
    drawdown: float
    return_25d: float | None


class PanicAllocation(BaseModel):
    qqq: float
    tqqq: float
    cash: float


class PanicStrategyCurrent(BaseModel):
    date: str
    state: str
    state_label: str
    panic_level: int
    vix: float | None
    qqq_close: float
    drawdown: float
    target: PanicAllocation
    actual: PanicAllocation
    portfolio_value: float
    portfolio_drawdown: float
    action: str
    reason: str


class PanicMetric(BaseModel):
    id: str
    name: str
    terminal_value: float
    cagr: float
    max_drawdown: float
    calmar: float | None
    sharpe: float | None
    annual_volatility: float
    worst_year: float
    transaction_cost: float
    turnover: float
    cash_occupancy: float


class PanicCrisisReview(BaseModel):
    id: str
    name: str
    start: str
    end: str
    strategy_return: float
    qqq_return: float
    strategy_max_drawdown: float


class PanicSensitivityResult(BaseModel):
    drawdown_shift: float
    vix_shift: float
    tqqq_cap: float
    terminal_value: float
    max_drawdown: float
    cagr: float


class PanicBacktestResponse(BaseModel):
    start_date: str
    end_date: str
    initial_capital: float
    metrics: list[PanicMetric]
    crises: list[PanicCrisisReview]
    sensitivity: list[PanicSensitivityResult]
    assumptions: list[str]


class PanicHistoryPoint(BaseModel):
    date: str
    vix: float | None
    qqq_drawdown: float
    portfolio_value: float
    portfolio_drawdown: float
    qqq_benchmark_value: float
    tqqq_benchmark_value: float
    balanced_benchmark_value: float
    panic_level: int
    state: str
    qqq_weight: float
    tqqq_weight: float
    cash_weight: float
    transaction_cost: float
    action: str


# ── Admin ────────────────────────────────────────────────────────────────────

class MarketRule(BaseModel):
    id: int
    title: str
    content: str
    category: str
    source: str | None
    tags: list[str]
    is_active: bool
    created_at: str
    updated_at: str


class MarketRuleCreate(BaseModel):
    title: str
    content: str
    category: str = "general"
    source: str | None = None
    tags: list[str] = []


class MarketRuleUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    source: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None


class DataSourceStatus(BaseModel):
    id: str
    name: str
    last_date: str | None
    row_count: int


class AdminStatus(BaseModel):
    sources: list[DataSourceStatus]


class LogEntry(BaseModel):
    timestamp: str
    level: str  # INFO, WARNING, ERROR, etc.
    name: str
    message: str
