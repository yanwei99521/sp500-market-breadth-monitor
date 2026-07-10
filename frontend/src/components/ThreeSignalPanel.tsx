import { Link } from "react-router-dom";
import { useThreeSignalStatus } from "../hooks/useBreadth";
import type { ThreeSignalItem } from "../types";

const ZONE_STYLE: Record<string, string> = {
  cheap: "border-green-300 bg-green-50 text-green-700",
  deep_drawdown: "border-green-300 bg-green-50 text-green-700",
  panic: "border-green-300 bg-green-50 text-green-700",
  expensive: "border-amber-300 bg-amber-50 text-amber-700",
  bubble: "border-red-300 bg-red-50 text-red-700",
  crash_warning: "border-red-300 bg-red-50 text-red-700",
  too_calm: "border-red-300 bg-red-50 text-red-700",
  near_high: "border-zinc-200 bg-zinc-50 text-zinc-600",
  normal: "border-zinc-200 bg-white text-zinc-700",
  missing: "border-zinc-200 bg-zinc-50 text-zinc-400",
};

const ACTION_STYLE: Record<string, string> = {
  大底信号: "border-green-400 bg-green-50 text-green-800",
  小底信号: "border-emerald-300 bg-emerald-50 text-emerald-800",
  快崩预警: "border-red-300 bg-red-50 text-red-800",
  高估不追: "border-amber-300 bg-amber-50 text-amber-800",
  过热降杠杆: "border-red-300 bg-red-50 text-red-800",
  正常投入: "border-zinc-200 bg-white text-zinc-700",
};

function SignalMiniCard({ item }: { item: ThreeSignalItem }) {
  const style = ZONE_STYLE[item.zone] ?? ZONE_STYLE.normal;
  const detailPath = item.id === "cape"
    ? "/indicator/cape-percentile"
    : item.id === "dd"
      ? "/indicator/qqq-drawdown"
      : "/indicator/vix";

  return (
    <Link to={detailPath} className={`block rounded-lg border px-3 py-3 transition-opacity hover:opacity-90 ${style}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">{item.name}</span>
        <span className="text-[11px] text-zinc-400">{item.date ?? "--"}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-bold tabular-nums">{item.display_value}</div>
        <div className="text-xs font-semibold">{item.status_label}</div>
      </div>
      <div className="mt-2 text-[11px] leading-4 text-zinc-500">{item.description}</div>
    </Link>
  );
}

export default function ThreeSignalPanel() {
  const { data, loading, error } = useThreeSignalStatus();

  if (loading) {
    return (
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-zinc-400">三信号动态仓位</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="h-20 animate-pulse rounded bg-zinc-100" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wider text-zinc-400">三信号动态仓位</h2>
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          三信号数据暂不可用，请在管理后台更新 QQQ/CAPE 数据。
        </div>
      </section>
    );
  }

  const actionStyle = ACTION_STYLE[data.action_label] ?? ACTION_STYLE["正常投入"];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400">三信号动态仓位</h2>
        <span className="text-xs text-zinc-400">低位信号 {data.active_count}/3</span>
      </div>

      <div className={`mb-3 rounded-lg border px-4 py-3 ${actionStyle}`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold">{data.action_label}</div>
          <div className="text-xs text-zinc-500">{data.date ?? "--"}</div>
        </div>
        <div className="mt-1 text-sm leading-6">{data.action_description}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {data.items.map((item) => (
          <SignalMiniCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
