import { Link } from "react-router-dom";
import {
  getZoneBg,
  getZoneColor,
  getZoneTextColor,
} from "../config/indicators";
import type { IndicatorConfig, IndicatorOverview } from "../types/indicator";
import StatusBadge from "./StatusBadge";

interface Props {
  config: IndicatorConfig;
  overview: IndicatorOverview;
}

export default function IndicatorCard({ config, overview }: Props) {
  const borderColor = getZoneColor(overview.type, overview.zone);
  const bgColor = getZoneBg(overview.type, overview.zone);
  const valueColor = getZoneTextColor(overview.type, overview.zone);

  const formatValue = (v: number) => {
    if (config.valueFormat === "percent") return `${(v * 100).toFixed(1)}%`;
    if (config.valueFormat === "thousands")
      return `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(0)}k`;
    return v.toFixed(3);
  };

  const formatThreshold = (t: number) => {
    if (config.valueFormat === "percent") return `${(t * 100).toFixed(0)}%`;
    if (config.valueFormat === "thousands")
      return `${t >= 0 ? "+" : ""}${(t / 1000).toFixed(0)}k`;
    return t.toFixed(2);
  };

  const thresholdLabel =
    config.thresholdDirection === "below"
      ? `信号阈值 < ${formatThreshold(config.threshold)}`
      : `信号阈值 > ${formatThreshold(config.threshold)}`;

  return (
    <Link
      to={`/indicator/${config.id}`}
      className={`block rounded-xl border-2 ${borderColor} ${bgColor} p-5 flex flex-col gap-3 hover:opacity-90 transition-opacity cursor-pointer`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          {config.shortName}
        </span>
        <span className="text-xs text-zinc-400">{overview.date}</span>
      </div>

      {/* Value */}
      <div className={`text-4xl font-bold tabular-nums ${valueColor}`}>
        {formatValue(overview.value)}
      </div>

      {/* Name + badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-500">{config.name}</span>
        <StatusBadge type={overview.type} zone={overview.zone} />
      </div>

      {/* Threshold */}
      <div className="text-xs text-zinc-400">
        {thresholdLabel}
        <span className="ml-2 text-zinc-400">· 点击查看详情 →</span>
      </div>
    </Link>
  );
}
