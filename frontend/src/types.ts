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

export interface CotPoint {
  date: string;
  net_long: number; // raw contracts (long - short)
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

export interface CotCurrent {
  date: string;
  long_contracts: number;
  short_contracts: number;
  net_long: number;
  open_interest: number;
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
