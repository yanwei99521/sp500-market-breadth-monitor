import type { IndicatorType, ThresholdDirection } from "../types/indicator";
import type { SignalPoint } from "../types";

interface Props {
  signals: SignalPoint[];
  indicatorName: string;
  threshold: number;
  thresholdDirection: ThresholdDirection;
  type: IndicatorType;
}

export default function SignalHistory({
  signals,
  indicatorName,
  threshold,
  thresholdDirection,
  type,
}: Props) {
  if (signals.length === 0) {
    return (
      <div className="text-center text-zinc-400 py-8 text-sm">
        暂无历史信号记录
      </div>
    );
  }

  const thresholdLabel =
    thresholdDirection === "below"
      ? `低于 ${(threshold * 100).toFixed(0)}% 阈值`
      : `高于 ${(threshold * 100).toFixed(0)}% 阈值`;

  const signalLabel = type === "buy" ? "买入信号" : "卖出信号";
  const signalBadgeClass =
    type === "buy"
      ? "bg-green-50 text-green-700 border-green-300"
      : "bg-red-50 text-red-700 border-red-300";
  const valueClass = type === "buy" ? "text-green-700" : "text-red-700";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="pb-2 pr-6 text-zinc-500 font-medium">日期</th>
            <th className="pb-2 pr-6 text-zinc-500 font-medium">
              {indicatorName}
            </th>
            <th className="pb-2 text-zinc-500 font-medium">{thresholdLabel}</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr
              key={s.date}
              className="border-b border-zinc-100 hover:bg-zinc-50"
            >
              <td className="py-2 pr-6 text-zinc-700 font-mono">{s.date}</td>
              <td className={`py-2 pr-6 font-mono font-semibold ${valueClass}`}>
                {(s.breadth_pct * 100).toFixed(1)}%
              </td>
              <td className="py-2">
                <span
                  className={`text-xs border rounded px-2 py-0.5 ${signalBadgeClass}`}
                >
                  {signalLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
