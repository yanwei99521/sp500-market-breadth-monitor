export interface BreadthPoint {
  date: string;
  breadth_pct: number;
  is_signal: boolean;
}

export interface BreadthStatus {
  date: string;
  breadth_pct: number;
  is_signal: boolean;
  status: "extreme_oversold" | "oversold" | "normal" | "overbought";
  threshold: number;
  ma_period: number;
}

export interface CurrentBreadth {
  ma50: BreadthStatus;
  ma200: BreadthStatus;
}

export interface SignalPoint {
  date: string;
  breadth_pct: number;
  ma_period: number;
}

export type MaPeriod = 50 | 200;
export type TimeRange = "1m" | "3m" | "6m" | "1y" | "3y" | "all";

export interface CallSkewPoint {
  date: string;
  skew: number;
  is_signal: boolean;
}

export interface CallSkewCurrent {
  date: string;
  atm_iv: number;
  otm25d_iv: number;
  skew: number;
  is_signal: boolean;
}

export interface VixPoint {
  date: string;
  close: number;
  high: number;
  low: number;
}

export interface VixCurrent {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  zone: "sell" | "normal" | "buy" | "buy_strong";
}

export interface ThreeSignalItem {
  id: string;
  name: string;
  date: string | null;
  value: number | null;
  display_value: string;
  zone: string;
  status_label: string;
  is_active: boolean;
  description: string;
}

export interface ThreeSignalStatus {
  date: string | null;
  active_count: number;
  action_label: string;
  action_description: string;
  items: ThreeSignalItem[];
}

export interface CapePoint {
  date: string;
  cape: number;
  percentile: number;
}

export interface QqqDrawdownPoint {
  date: string;
  close: number;
  drawdown: number;
  return_25d: number | null;
}

export type MarketPriceTicker = "QQQ" | "SPY" | "SOXL";

export interface MarketPricePoint {
  ticker: MarketPriceTicker;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface GlobalMarketQuote {
  id: string;
  region: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  quote_date: string;
}

export interface GlobalMarketsResponse {
  updated_at: string;
  quotes: GlobalMarketQuote[];
}

export interface PanicAllocation {
  qqq: number;
  tqqq: number;
  cash: number;
}

export interface PanicStrategyCurrent {
  date: string;
  state: string;
  state_label: string;
  panic_level: number;
  vix: number | null;
  qqq_close: number;
  drawdown: number;
  target: PanicAllocation;
  actual: PanicAllocation;
  portfolio_value: number;
  portfolio_drawdown: number;
  action: string;
  reason: string;
}

export interface PanicMetric {
  id: string;
  name: string;
  terminal_value: number;
  cagr: number;
  max_drawdown: number;
  calmar: number | null;
  sharpe: number | null;
  annual_volatility: number;
  worst_year: number;
  transaction_cost: number;
  turnover: number;
  cash_occupancy: number;
}

export interface PanicBacktestResponse {
  start_date: string;
  end_date: string;
  initial_capital: number;
  metrics: PanicMetric[];
}

export interface FngPoint {
  date: string;
  score: number;
  rating: string;
}

export interface FngCurrent {
  date: string;
  score: number;
  rating: string;
  previous_close: number;
  previous_1_week: number;
  previous_1_month: number;
  previous_1_year: number;
}

export type DailyIndicatorStatus = "buy" | "sell" | "normal";

export interface DailyIndicatorCell {
  value: number | null;
  display_value: string;
  status: DailyIndicatorStatus;
  source_date: string | null;
  status_label?: string;
}

export interface DailyStatusRow {
  date: string;
  indicators: Record<string, DailyIndicatorCell>;
}

export interface DailyStatusResponse {
  range: TimeRange;
  rows: DailyStatusRow[];
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface DataSourceStatus {
  id: string;
  name: string;
  last_date: string | null;
  row_count: number;
}

export interface AdminStatus {
  sources: DataSourceStatus[];
}

export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  name: string;
  message: string;
}

export interface MarketRule {
  id: number;
  title: string;
  content: string;
  category: string;
  source: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketRuleCreate {
  title: string;
  content: string;
  category: string;
  source: string;
  tags: string[];
}

export interface MarketRuleUpdate {
  title?: string;
  content?: string;
  category?: string;
  source?: string;
  tags?: string[];
  is_active?: boolean;
}
