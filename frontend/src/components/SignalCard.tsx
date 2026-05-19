import type { IndicatorConfig } from "../types/indicator";
import type { BreadthStatus } from "../types";
import StatusBadge from "./StatusBadge";

interface Props {
  data: BreadthStatus;
  config: IndicatorConfig;
}

export default function SignalCard({ data, config }: Props) {
  const zone = data.is_signal ? "active" : "normal";

  const borderColor =
    zone !== "active"
      ? "border-zinc-200"
      : config.type === "buy"
        ? "border-green-500"
        : "border-red-500";

  const bgColor =
    zone !== "active"
      ? "bg-white"
      : config.type === "buy"
        ? "bg-green-50"
        : "bg-red-50";

  const valueColor =
    zone !== "active"
      ? "text-zinc-800"
      : config.type === "buy"
        ? "text-green-700"
        : "text-red-700";

  const thresholdLabel =
    config.thresholdDirection === "below"
      ? `信号阈值 < ${(config.threshold * 100).toFixed(0)}%`
      : `信号阈值 > ${(config.threshold * 100).toFixed(0)}%`;


  return (
    <div
      className={`rounded-xl border-2 ${borderColor} ${bgColor} p-5 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          {config.shortName} 宽度
        </span>
        <span className="text-xs text-zinc-400">{data.date}</span>
      </div>

      <div className={`text-4xl font-bold tabular-nums ${valueColor}`}>
        {(data.breadth_pct * 100).toFixed(1)}%
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge type={config.type} zone={zone} />
      </div>

      <div className="text-xs text-zinc-400">
        {thresholdLabel}
      </div>
    </div>
  );
}
