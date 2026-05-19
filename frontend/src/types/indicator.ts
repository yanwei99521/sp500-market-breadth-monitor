export type IndicatorType = "buy" | "sell";
export type IndicatorZone = string; // "active" | "normal" for regular; vix/fng zone strings for sentiment
export type ThresholdDirection = "below" | "above";

export interface IndicatorUsage {
  /** 一句话说明这个指标衡量什么 */
  what: string;
  /** 当信号触发时，市场处于什么状态 */
  signal: string;
  /** 具体操作建议（bullet points） */
  howToUse: string[];
  /** 注意事项（可选） */
  caution?: string;
}

export type IndicatorVariant = "breadth" | "call-skew" | "cot" | "vix" | "fng";
export type ValueFormat = "percent" | "decimal" | "thousands";

export interface IndicatorConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  type: IndicatorType;
  threshold: number;
  thresholdDirection: ThresholdDirection;
  thresholdColor: string;
  chartColor: string;
  /** Determines which chart/data path to use in DetailPage */
  variant: IndicatorVariant;
  /** How to format the value for display: "percent" multiplies by 100, "decimal" shows raw */
  valueFormat: ValueFormat;
  /** params forwarded to /api/breadth/history and /api/signals (breadth variant only) */
  apiParams?: { ma: number };
  unit: string;
  usage: IndicatorUsage;
  /** When true, shown as a sentiment/general-purpose card at the top of the dashboard */
  isSentiment?: boolean;
}

export interface IndicatorOverview {
  id: string;
  name: string;
  date: string;
  value: number;
  threshold: number;
  threshold_direction: ThresholdDirection;
  is_signal: boolean;
  zone: IndicatorZone;
  type: IndicatorType;
  zone_label?: string; // human-readable zone description (for sentiment indicators)
}
