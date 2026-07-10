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
